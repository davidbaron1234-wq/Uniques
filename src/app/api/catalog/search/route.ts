import { NextRequest, NextResponse } from "next/server";
import { searchCatalog, getCatalogStats } from "@/lib/catalog/catalogService";
import { searchEbayItems, getSmartCategory } from "@/lib/ebay";
import { CatalogCategory } from "@/lib/catalog/types";

// ── Default eBay browse queries per category ───────────────────────────────
// Used when a user selects a category pill without typing a query.
// The query should surface popular, recognisable items for that category.

const CATEGORY_BROWSE_QUERIES: Partial<Record<string, string>> = {
  "Pokémon TCG":  "pokemon card holo rare",
  "Sports Cards": "sports card rookie psa",
  "Other TCG":    "magic the gathering card foil",
  "Funko Pop":    "funko pop vinyl figure",
  "Lego":         "lego set sealed new",
  "Sneakers":     "nike air jordan sneakers",
  "Video Games":  "video game sealed new",
  "Comics":       "marvel dc comic book",
  "Watches":      "automatic watch new",
  "Coins":        "silver coin american eagle",
  "Trading Cards":"trading card graded psa",
  "Other":        "rare collectible",
};

// ── GET /api/catalog/search ────────────────────────────────────────────────
//
// Strategy:
//   • Empty query, no category  → local catalog (fast browse-all)
//   • Empty query + category    → eBay with default browse query for that
//                                  category (enables category pill browsing)
//   • Specific query            → eBay live first, local fallback on 0 results
//
// The eBay epid/itemId becomes MasterItem.id → stored as CollectibleItem.masterId
// enabling pure Tier-1 ID matching with no string comparison needed.
//
// Query params:
//   q         – search query
//   category  – optional category filter
//   page      – 1-based (default 1)
//   pageSize  – items per page (default 20, max 100)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const q           = searchParams.get("q") || "";
  const catParam    = searchParams.get("category") || "";
  const rawPage     = parseInt(searchParams.get("page")     || "1",  10);
  const rawPageSize = parseInt(searchParams.get("pageSize") || "20", 10);
  const page        = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
  const pageSize    = Math.min(100, Math.max(1, isNaN(rawPageSize) ? 20 : rawPageSize));
  const category    = catParam as CatalogCategory | undefined;
  const categoryIds = searchParams.get("categoryIds") || undefined;
  const rawMinPrice = parseFloat(searchParams.get("minPrice") || "");
  const rawMaxPrice = parseFloat(searchParams.get("maxPrice") || "");
  const minPrice    = isNaN(rawMinPrice) ? undefined : rawMinPrice;
  const maxPrice    = isNaN(rawMaxPrice) ? undefined : rawMaxPrice;

  // ── Category-only browse (no text query) ────────────────────────────────
  if ((!q || q.length < 2) && catParam) {
    const browseQuery = CATEGORY_BROWSE_QUERIES[catParam];
    if (browseQuery) {
      try {
        const ebayResult = await searchEbayItems(browseQuery, {
          limit: pageSize,
          offset: (page - 1) * pageSize,
          categoryIds,
          minPrice,
          maxPrice,
        });
        if (ebayResult.items.length > 0) return NextResponse.json(ebayResult);
      } catch (err) {
        console.error("[catalog/search] Category browse eBay failed:", err);
      }
    }
    // Category with no eBay results: try local catalog filter
    const result = searchCatalog("", { category: category || undefined, page, pageSize });
    return NextResponse.json(result);
  }

  // ── Empty query, no category: local browse-all ───────────────────────────
  if (!q || q.length < 2) {
    const result = searchCatalog(q, { page, pageSize });
    return NextResponse.json(result);
  }

  // ── Specific text search: eBay first, local fallback ─────────────────────
  try {
    const ebayResult = await searchEbayItems(q, {
      limit:  pageSize,
      offset: (page - 1) * pageSize,
      categoryIds,
      minPrice,
      maxPrice,
    });
    if (ebayResult.items.length > 0) return NextResponse.json(ebayResult);
  } catch (err) {
    console.error("[catalog/search] eBay failed, falling back to local:", err);
  }

  // Semantic queries (rolex, coin, pokemon …) must never fall back to local
  // mock data — returning Pokémon cards for a "coin" search is worse than an
  // empty grid. Return empty JSON so the UI shows a clean "no results" state.
  if (getSmartCategory(q)) {
    return NextResponse.json({ items: [], total: 0, page, pageSize, totalPages: 0, query: q });
  }

  const result = searchCatalog(q, { category: category || undefined, page, pageSize });
  return NextResponse.json(result);
}

// ── HEAD /api/catalog/search ───────────────────────────────────────────────

export async function HEAD() {
  const stats = getCatalogStats();
  return NextResponse.json(stats);
}
