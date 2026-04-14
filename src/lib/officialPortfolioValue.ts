/**
 * officialPortfolioValue.ts — Phase 6.1 authoritative portfolio calculation
 *
 * A user's portfolio value must reflect OFFICIAL market prices, not their
 * manually entered asking prices. This module resolves each vault item to
 * the best available official price using the following lookup chain:
 *
 *   1. Find the MarketItem in the catalog that best matches this vault item
 *      (same category + highest normalized-title overlap with real eBay items).
 *   2. Get the latest type="catalog" MarketSnapshot for that MarketItem.
 *   3. If no catalog match exists, use the item's own estimatedValue as the
 *      fallback (so the portfolio is never zero).
 *
 * Matching strategy:
 *   - Exact ebayId match first (vault items added via catalog search have a
 *     shadow MarketItem with ebayId="user-{item.id}", but we link the OTHER
 *     direction: find real MarketItems whose title's first 3 significant words
 *     appear in the vault item's title, within the same category).
 *   - Scored by word-overlap count, top score wins.
 *   - Minimum score threshold = 1 matching word (avoids false cross-category matches).
 */

import { prisma } from "@/lib/prisma";

// ── Text normalization ────────────────────────────────────────────────────────
// Strip noise words, punctuation, common grading terms. Keep meaningful nouns.
const NOISE = /\b(the|a|an|of|in|for|to|with|and|or|is|are|was|were|new|used|mint|nm|ex|vg|psa|bgs|cgc|sgc|grade|graded|sealed|raw|lot|bundle|single|card|pack|holo|rare|common|foil|english|japanese|first|1st|edition|unlimited|full|art|rainbow|secret|special|alternate|promo|collection|complete|set|authentic|genuine|official|original)\b/gi;

function normalizeWords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(NOISE, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function titleOverlapScore(vaultTitle: string, catalogTitle: string): number {
  const vaultWords   = new Set(normalizeWords(vaultTitle));
  const catalogWords = normalizeWords(catalogTitle);
  let score = 0;
  for (const w of catalogWords) {
    if (vaultWords.has(w)) score++;
  }
  return score;
}

// ── Per-item official price lookup ───────────────────────────────────────────
type VaultItem = {
  id:             string;
  title:          string;
  category:       string;
  estimatedValue: number | null;
};

type OfficialItemValue = {
  itemId:        string;
  title:         string;
  officialPrice: number;
  source:        "catalog_snapshot" | "market_item_price" | "estimated_value";
  matchedCatalogId?: string;
};

/**
 * Resolve the official price for a single vault item.
 * Takes pre-loaded catalog index maps so callers can batch-resolve many items
 * without repeated DB round-trips.
 */
function resolveItemPrice(
  item:        VaultItem,
  // All real catalog MarketItems keyed by id, pre-filtered to this call's category
  catalogByCategory: Map<string, Array<{ id: string; title: string; price: number }>>,
  // Latest catalog snapshot value keyed by MarketItem.id
  latestSnapshotMap: Map<string, number>,
): OfficialItemValue {
  const candidates = catalogByCategory.get(item.category) ?? [];

  let bestScore  = 0;
  let bestCatId: string | null = null;

  for (const cat of candidates) {
    const score = titleOverlapScore(item.title, cat.title);
    if (score > bestScore) {
      bestScore  = score;
      bestCatId  = cat.id;
    }
  }

  // Require at least 1 matching word to count as a real match
  if (bestScore >= 1 && bestCatId) {
    const snapPrice = latestSnapshotMap.get(bestCatId);
    if (snapPrice != null && snapPrice > 0) {
      return { itemId: item.id, title: item.title, officialPrice: snapPrice,   source: "catalog_snapshot",   matchedCatalogId: bestCatId };
    }
    // Snapshot not yet written — use the MarketItem.price directly
    const catItem  = candidates.find((c) => c.id === bestCatId)!;
    if (catItem.price > 0) {
      return { itemId: item.id, title: item.title, officialPrice: catItem.price, source: "market_item_price",  matchedCatalogId: bestCatId };
    }
  }

  // No catalog match — fall back to user's asking price (better than $0)
  return {
    itemId:        item.id,
    title:         item.title,
    officialPrice: item.estimatedValue ?? 0,
    source:        "estimated_value",
  };
}

// ── Public: compute official portfolio for a user ────────────────────────────
export async function computeOfficialPortfolioValue(userId: string): Promise<{
  total:      number;
  itemCount:  number;
  breakdown:  OfficialItemValue[];
}> {
  if (!userId) return { total: 0, itemCount: 0, breakdown: [] };

  // 1. Fetch user's active vault items
  const vaultItems = await prisma.item.findMany({
    where:   { userId, status: { not: "TRADED" } },
    select:  { id: true, title: true, category: true, estimatedValue: true },
  });

  if (vaultItems.length === 0) return { total: 0, itemCount: 0, breakdown: [] };

  // 2. Fetch all real catalog MarketItems (exclude user-shadow entries)
  //    Group by category for fast lookup
  const catalogItems = await prisma.marketItem.findMany({
    where:   { ebayId: { not: { startsWith: "user-" } } },
    select:  { id: true, title: true, category: true, price: true },
  });

  const catalogByCategory = new Map<string, Array<{ id: string; title: string; price: number }>>();
  for (const ci of catalogItems) {
    const list = catalogByCategory.get(ci.category) ?? [];
    list.push({ id: ci.id, title: ci.title, price: ci.price });
    catalogByCategory.set(ci.category, list);
  }

  // 3. Fetch the latest catalog snapshot for every catalog item in one query.
  //    We use a raw aggregation: for each refId, get the MAX bucket's value.
  //    Prisma doesn't support DISTINCT ON natively, so we pull all catalog
  //    snapshots ordered by bucket desc and take the first per refId in JS.
  //    For large catalogs this is fine; refine with raw SQL later if needed.
  const allCatalogIds = catalogItems.map((c) => c.id);
  const recentSnapshots = allCatalogIds.length > 0
    ? await prisma.marketSnapshot.findMany({
        where:   { type: "catalog", refId: { in: allCatalogIds } },
        orderBy: { bucket: "desc" },
        select:  { refId: true, value: true, bucket: true },
      })
    : [];

  // Deduplicate: keep latest per refId
  const latestSnapshotMap = new Map<string, number>();
  for (const snap of recentSnapshots) {
    if (!latestSnapshotMap.has(snap.refId)) {
      latestSnapshotMap.set(snap.refId, snap.value);
    }
  }

  // 4. Resolve official price for each vault item
  const breakdown = vaultItems.map((item) =>
    resolveItemPrice(item, catalogByCategory, latestSnapshotMap),
  );

  const total = breakdown.reduce((s, b) => s + b.officialPrice, 0);

  return { total, itemCount: vaultItems.length, breakdown };
}
