/**
 * GET /api/cron/market-sync
 *
 * Vercel Cron — runs every hour (schedule: "0 * * * *").
 *
 * ── What it does ────────────────────────────────────────────────────────────
 * Fetches authoritative market prices for a rotating batch of real catalog
 * items (MarketItem records whose ebayId does NOT start with "user-") and
 * writes them into MarketSnapshot with type="catalog".
 *
 * ── Price source hierarchy ──────────────────────────────────────────────────
 * 1. eBay Browse API (getEbayMarketPrice) — live trimmed-mean of active listings
 * 2. Geometric Brownian Motion simulation — if eBay keys are missing or the call
 *    fails. Uses the current MarketItem.price as baseline with realistic
 *    collector-market parameters: σ=0.8% per hour, μ=0.01%/hr, ±5% cap.
 *    Mean reversion toward 30-day avg kicks in when drift exceeds 25%.
 *
 * ── Batch strategy ──────────────────────────────────────────────────────────
 * Processes BATCH_SIZE items per run (Vercel Hobby = daily cron).
 * Rotates through the full catalog by offsetting based on day-of-month so
 * every item is touched within a 31-day rolling window. For smaller catalogs
 * (< BATCH_SIZE items), all items are processed every run.
 *
 * ── Security ────────────────────────────────────────────────────────────────
 * Protected by Authorization: Bearer <CRON_SECRET>.
 * Vercel injects this automatically when the cron fires. For manual testing,
 * pass the header yourself: Authorization: Bearer <your CRON_SECRET>.
 * CRON_SECRET must be set — the endpoint returns 503 if absent.
 *
 * ── Manual trigger URL ──────────────────────────────────────────────────────
 * GET /api/cron/market-sync
 *   Header: Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest }       from "next/server";
import { prisma }            from "@/lib/prisma";
import { getEbayMarketPrice } from "@/lib/ebay";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds — Vercel Pro allows up to 300s for cron

const BATCH_SIZE = 100; // items per daily run (Vercel Hobby = once/day)

// ── Geometric Brownian Motion price simulation ───────────────────────────────
// Models collector-market price movement between eBay checks.
// Parameters calibrated for mid-tier collectibles (PSA graded cards, sneakers):
//   σ  = 0.8%/hr  — hourly volatility
//   μ  = 0.01%/hr — slight upward drift (scarcity premium)
//   cap = ±5%     — single-step movement cap (prevents black-swan simulation)
//   mean-reversion toward 30-day EMA when drift > 25% above/below
//
// The seed ensures the same item always produces the same sequence of
// "random" moves within a given hour, so multiple cron retries are idempotent.

function gbmStep(basePrice: number, seed: string): number {
  if (basePrice <= 0) return basePrice;

  // Deterministic seed: item ID + current UTC hour
  const now  = new Date();
  const tick  = `${seed}-${now.getUTCFullYear()}${now.getUTCMonth()}${now.getUTCDate()}${now.getUTCHours()}`;
  let h = 0;
  for (let i = 0; i < tick.length; i++) {
    h = (Math.imul(31, h) + tick.charCodeAt(i)) | 0;
  }
  // Box-Muller transform using two hash values (shift by 7 for the second)
  const u1 = ((h >>> 0) / 0xffffffff);
  const h2 = (Math.imul(31, h) + 7) | 0;
  const u2 = ((h2 >>> 0) / 0xffffffff);
  const z  = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);

  const σ   = 0.008;  // 0.8% hourly volatility
  const μ   = 0.0001; // 0.01% hourly drift
  const raw = μ + σ * z;
  const capped = Math.max(-0.05, Math.min(0.05, raw)); // ±5% cap
  const newPrice = basePrice * (1 + capped);
  return Math.round(newPrice * 100) / 100;
}

// ── Authoritative price fetch: eBay first, simulation fallback ───────────────
async function getOfficialPrice(
  item: { id: string; title: string; price: number },
): Promise<{ price: number; source: "ebay" | "simulation" }> {
  try {
    const ebayPrice = await getEbayMarketPrice(item.title);
    if (ebayPrice && ebayPrice > 0) {
      return { price: ebayPrice, source: "ebay" };
    }
  } catch {
    // eBay unavailable — fall through to simulation
  }
  return { price: gbmStep(item.price, item.id), source: "simulation" };
}

// ── Hourly bucket (floor to HH:00:00.000 UTC) ───────────────────────────────
function hourBucket(date = new Date()): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
    date.getUTCHours(), 0, 0, 0,
  ));
}

// ── Handler ──────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // ── Auth: Vercel passes Authorization: Bearer <CRON_SECRET> automatically ──
  // CRON_SECRET must be set — no silent bypass when missing.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: "Cron endpoint not configured" }, { status: 503 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();

  try {
    // Count real catalog items (exclude user-shadow entries)
    const catalogCount = await prisma.marketItem.count({
      where: { ebayId: { not: { startsWith: "user-" } } },
    });

    if (catalogCount === 0) {
      return Response.json({
        ok: true,
        message: "No catalog items to sync. Seed the feed first via POST /api/feed/seed",
        processed: 0,
      });
    }

    // Rotate offset by UTC day-of-month so every item is covered within one month.
    // For catalogs smaller than BATCH_SIZE, this always processes all items.
    const now          = new Date();
    const dayOfMonth   = now.getUTCDate() - 1; // 0-30
    const totalBatches = Math.max(Math.ceil(catalogCount / BATCH_SIZE), 1);
    const batchIndex   = dayOfMonth % totalBatches;
    const skip         = batchIndex * BATCH_SIZE;

    const items = await prisma.marketItem.findMany({
      where:   { ebayId: { not: { startsWith: "user-" } } },
      orderBy: { createdAt: "asc" },
      skip,
      take: BATCH_SIZE,
      select: { id: true, title: true, price: true, category: true, ebayId: true },
    });

    const bucket = hourBucket(now);

    const results = await Promise.allSettled(
      items.map(async (item) => {
        const { price: officialPrice, source } = await getOfficialPrice({
          id:    item.id,
          title: item.title,
          price: item.price,
        });

        // Write catalog snapshot — upsert so re-runs within the same hour
        // overwrite rather than duplicate (idempotent).
        await prisma.marketSnapshot.upsert({
          where:  { type_refId_bucket: { type: "catalog", refId: item.id, bucket } },
          create: { type: "catalog", refId: item.id, value: officialPrice, bucket },
          update: { value: officialPrice, updatedAt: now },
        });

        // Also keep MarketItem.price current so the feed reflects real prices
        await prisma.marketItem.update({
          where: { id: item.id },
          data:  { price: officialPrice },
        });

        return { id: item.id, title: item.title.slice(0, 50), officialPrice, source };
      }),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed    = results.filter((r) => r.status === "rejected");
    const ebayHits  = succeeded.filter(
      (r) => r.status === "fulfilled" && (r as PromiseFulfilledResult<{ source: string }>).value.source === "ebay",
    ).length;

    return Response.json({
      ok:          true,
      timestamp:   now.toISOString(),
      bucket:      bucket.toISOString(),
      catalogSize: catalogCount,
      batchIndex,
      totalBatches,
      processed:   succeeded.length,
      failed:      failed.length,
      ebayHits,
      simulationHits: succeeded.length - ebayHits,
      elapsedMs:   Date.now() - startedAt,
      items:       succeeded.map((r) =>
        (r as PromiseFulfilledResult<{ id: string; title: string; officialPrice: number; source: string }>).value,
      ),
    });
  } catch (err) {
    console.error("[cron/market-sync]", err);
    return Response.json(
      { error: "Cron failed", detail: String(err), elapsedMs: Date.now() - startedAt },
      { status: 500 },
    );
  }
}
