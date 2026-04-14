/**
 * GET /api/admin/health
 *
 * Runs four async subsystem checks and returns a structured JSON report.
 * Protected by Authorization: Bearer <ADMIN_SECRET>.
 *
 * ── Checks ────────────────────────────────────────────────────────────────────
 *  db                 — round-trip latency via SELECT 1
 *  cron               — most recent catalog MarketSnapshot bucket age (≤ 25 h = ok)
 *  ebay               — live OAuth + search probe; asserts price returned
 *  portfolioIntegrity — no user with vault items should have a $0 portfolio snapshot
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *  curl -s -H "Authorization: Bearer <ADMIN_SECRET>" \
 *       https://your-domain.vercel.app/api/admin/health | jq
 *
 * ── Security ──────────────────────────────────────────────────────────────────
 * ADMIN_SECRET must be set in Vercel environment variables.
 * The endpoint returns 503 if the env var is absent — no default fallback.
 */

import { NextRequest } from "next/server";
import { prisma }      from "@/lib/prisma";
import { getEbayMarketPrice } from "@/lib/ebay";

export const dynamic    = "force-dynamic";
export const maxDuration = 30;

const ADMIN_SECRET    = process.env.ADMIN_SECRET;
const CRON_THRESHOLD_HOURS = 25;
const EBAY_TEST_QUERY      = "Charizard Base Set Holo";
const PORTFOLIO_SAMPLE_CAP = 50; // max users to check for integrity

// ── DB check ─────────────────────────────────────────────────────────────────

async function checkDb(): Promise<{
  ok: boolean;
  latencyMs: number;
  error?: string;
}> {
  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - t0 };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t0, error: String(e) };
  }
}

// ── Cron check ───────────────────────────────────────────────────────────────

async function checkCron(): Promise<{
  ok: boolean;
  lastRun: string | null;
  hoursAgo: number | null;
  catalogSnapshotCount: number;
  message?: string;
}> {
  try {
    const catalogSnapshotCount = await prisma.marketSnapshot.count({ where: { type: "catalog" } });

    if (catalogSnapshotCount === 0) {
      return {
        ok:                   false,
        lastRun:              null,
        hoursAgo:             null,
        catalogSnapshotCount: 0,
        message:              "No catalog snapshots found. Seed the feed (POST /api/feed/seed) then trigger GET /api/cron/market-sync.",
      };
    }

    const latest = await prisma.marketSnapshot.findFirst({
      where:   { type: "catalog" },
      orderBy: { bucket: "desc" },
      select:  { bucket: true },
    });

    if (!latest) {
      return { ok: false, lastRun: null, hoursAgo: null, catalogSnapshotCount };
    }

    const hoursAgo = (Date.now() - latest.bucket.getTime()) / (1000 * 60 * 60);
    return {
      ok:                   hoursAgo <= CRON_THRESHOLD_HOURS,
      lastRun:              latest.bucket.toISOString(),
      hoursAgo:             parseFloat(hoursAgo.toFixed(1)),
      catalogSnapshotCount,
    };
  } catch (e) {
    return { ok: false, lastRun: null, hoursAgo: null, catalogSnapshotCount: 0, message: String(e) };
  }
}

// ── eBay check ───────────────────────────────────────────────────────────────

async function checkEbay(): Promise<{
  ok: boolean;
  latencyMs: number;
  price: number | null;
  testItem: string;
  error?: string;
}> {
  const t0 = Date.now();
  try {
    const price = await getEbayMarketPrice(EBAY_TEST_QUERY);
    return {
      ok:       price !== null && price > 0,
      latencyMs: Date.now() - t0,
      price,
      testItem:  EBAY_TEST_QUERY,
    };
  } catch (e) {
    return {
      ok:        false,
      latencyMs: Date.now() - t0,
      price:     null,
      testItem:  EBAY_TEST_QUERY,
      error:     String(e),
    };
  }
}

// ── Portfolio integrity check ─────────────────────────────────────────────────

async function checkPortfolioIntegrity(): Promise<{
  ok: boolean;
  checked: number;
  zeroed: number;
  message?: string;
}> {
  try {
    // Grab the latest "user" snapshot per userId (pull ordered desc, dedup in JS)
    const snaps = await prisma.marketSnapshot.findMany({
      where:   { type: "user" },
      orderBy: { bucket: "desc" },
      select:  { refId: true, value: true },
      take:    200,
    });

    if (snaps.length === 0) {
      return {
        ok:      true,
        checked: 0,
        zeroed:  0,
        message: "No user portfolio snapshots found yet — portfolio engine hasn't run.",
      };
    }

    // Latest value per userId
    const latestByUser = new Map<string, number>();
    for (const s of snaps) {
      if (!latestByUser.has(s.refId)) latestByUser.set(s.refId, s.value);
    }

    const sample = Array.from(latestByUser.keys()).slice(0, PORTFOLIO_SAMPLE_CAP);

    // Count active items for each sampled user in parallel
    const itemCounts = await Promise.all(
      sample.map((uid) =>
        prisma.item.count({ where: { userId: uid, status: { not: "TRADED" } } }),
      ),
    );

    let zeroed = 0;
    for (let i = 0; i < sample.length; i++) {
      const value = latestByUser.get(sample[i])!;
      const count = itemCounts[i];
      if (count > 0 && value === 0) zeroed++;
    }

    return { ok: zeroed === 0, checked: sample.length, zeroed };
  } catch (e) {
    return { ok: false, checked: 0, zeroed: 0, message: String(e) };
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Auth — ADMIN_SECRET must be set in env vars; no fallback default allowed
  if (!ADMIN_SECRET) {
    return Response.json({ error: "Admin endpoint not configured" }, { status: 503 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();

  // Run all four checks concurrently
  const [db, cron, ebay, portfolioIntegrity] = await Promise.all([
    checkDb(),
    checkCron(),
    checkEbay(),
    checkPortfolioIntegrity(),
  ]);

  const allOk   = db.ok && cron.ok && ebay.ok && portfolioIntegrity.ok;
  const overall = allOk ? "healthy" : "degraded";

  return Response.json(
    {
      overall,
      timestamp:  new Date().toISOString(),
      elapsedMs:  Date.now() - startedAt,
      db,
      cron,
      ebay,
      portfolioIntegrity,
    },
    { status: allOk ? 200 : 207 },
  );
}
