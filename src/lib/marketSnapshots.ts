/**
 * marketSnapshots.ts — Phase 6.1 "Authoritative Market Engine"
 *
 * ARCHITECTURE NOTE (Phase 6.1 pivot):
 * ─────────────────────────────────────────────────────────────────────────────
 * We distinguish three snapshot types:
 *
 *   type = "catalog"  refId = MarketItem.id
 *     Written ONLY by the hourly cron (/api/cron/market-sync).
 *     Reflects real eBay market prices (or GBM simulation when keys are absent).
 *     This is the single source of truth for "what is X worth in the market".
 *
 *   type = "user"     refId = userId
 *     Written when a user's portfolio changes (item add, price edit, trade).
 *     Value = sum of OFFICIAL catalog prices for each vault item, NOT asking prices.
 *     Computed via computeOfficialPortfolioValue() from officialPortfolioValue.ts.
 *
 * We intentionally DO NOT snapshot user asking prices as market data.
 * snapshotItemValue() is removed — it was conflating user input with market fact.
 *
 * Bucket strategy: floor(now) to HH:00:00.000 UTC.
 * Upsert deduplication: edits within the same hour overwrite, never spam.
 */

import { prisma }                        from "@/lib/prisma";
import { computeOfficialPortfolioValue } from "@/lib/officialPortfolioValue";

/** Return the current hour as a UTC DateTime bucket (floor to HH:00:00.000). */
export function hourBucket(date = new Date()): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      0, 0, 0,
    ),
  );
}

/**
 * Compute the user's OFFICIAL portfolio value (via catalog market prices,
 * not asking prices) and write/overwrite a "user" snapshot for this hour.
 *
 * Safe to call fire-and-forget — never throws to the caller.
 */
export async function snapshotUserPortfolio(userId: string): Promise<void> {
  try {
    if (!userId) return;

    // Resolve official portfolio value using catalog snapshots
    const { total } = await computeOfficialPortfolioValue(userId);

    const bucket = hourBucket();

    await prisma.marketSnapshot.upsert({
      where:  { type_refId_bucket: { type: "user", refId: userId, bucket } },
      create: { type: "user", refId: userId, value: total, bucket },
      update: { value: total, updatedAt: new Date() },
    });
  } catch (err) {
    console.error("[snapshotUserPortfolio] non-fatal:", err);
  }
}
