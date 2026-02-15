import { NextRequest, NextResponse } from "next/server";
import { searchCatalog, getCatalogStats } from "@/lib/catalog/catalogService";
import { CatalogCategory } from "@/lib/catalog/types";

// ── GET /api/catalog/search ────────────────────────────────────────────────
// Server-side search endpoint. The frontend never loads 16K+ items; it queries
// this route as the user types (debounced).
//
// Query params:
//   q         - search query (min 2 chars for fuzzy, empty = browse all)
//   category  - "Pokémon TCG" | "Trading Cards" | "Sneakers" | "Coins"
//   page      - page number (default 1)
//   pageSize  - items per page (default 20, max 100)

const VALID_CATEGORIES: CatalogCategory[] = ["Pokémon TCG", "Trading Cards", "Sneakers", "Coins"];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get("q") || "";
  const categoryParam = searchParams.get("category");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));

  const category =
    categoryParam && VALID_CATEGORIES.includes(categoryParam as CatalogCategory)
      ? (categoryParam as CatalogCategory)
      : undefined;

  const result = searchCatalog(q, { category, page, pageSize });

  return NextResponse.json(result);
}

// ── GET /api/catalog/search?stats=true ─────────────────────────────────────
// Special mode: returns catalog statistics instead of search results.

export async function HEAD() {
  const stats = getCatalogStats();
  return NextResponse.json(stats);
}
