import Fuse from "fuse.js";
import { MasterItem, CatalogCategory, CatalogSearchResult } from "./types";
import { pokemonSeedData } from "./pokemonSeed";
import { sneakerSeedData } from "./sneakerSeed";
import { coinSeedData } from "./coinSeed";

// ── Master Catalog ─────────────────────────────────────────────────────────
// Aggregates all seed data (and later, fetched API data) into a single
// searchable catalog. Fuse.js handles fuzzy matching so typos still work.

let _catalog: MasterItem[] | null = null;
let _fuse: Fuse<MasterItem> | null = null;
let _index: Map<string, MasterItem> | null = null;

function getCatalog(): MasterItem[] {
  if (!_catalog) {
    _catalog = [...pokemonSeedData, ...sneakerSeedData, ...coinSeedData];
  }
  return _catalog;
}

function getFuse(): Fuse<MasterItem> {
  if (!_fuse) {
    _fuse = new Fuse(getCatalog(), {
      keys: [
        { name: "name", weight: 0.6 },
        { name: "set", weight: 0.2 },
        { name: "subCategory", weight: 0.1 },
        { name: "rarity", weight: 0.1 },
      ],
      threshold: 0.35,
      includeScore: true,
      minMatchCharLength: 2,
    });
  }
  return _fuse;
}

function getIndex(): Map<string, MasterItem> {
  if (!_index) {
    _index = new Map();
    for (const item of getCatalog()) {
      _index.set(item.id, item);
    }
  }
  return _index;
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Fuzzy search the catalog. Returns paginated results. */
export function searchCatalog(
  query: string,
  options: {
    category?: CatalogCategory;
    page?: number;
    pageSize?: number;
  } = {}
): CatalogSearchResult {
  const { category, page = 1, pageSize = 20 } = options;

  let results: MasterItem[];

  if (!query || query.length < 2) {
    // No query: return all items (optionally filtered by category)
    results = getCatalog();
  } else {
    results = getFuse()
      .search(query)
      .map((r) => r.item);
  }

  // Filter by category if specified
  if (category) {
    results = results.filter((item) => item.category === category);
  }

  const total = results.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const items = results.slice(start, start + pageSize);

  return { items, total, page, pageSize, totalPages, query };
}

/** Look up a single MasterItem by ID. O(1) via index. */
export function getMasterItem(id: string): MasterItem | undefined {
  return getIndex().get(id);
}

/** Get catalog statistics. */
export function getCatalogStats(): {
  total: number;
  byCategory: Record<string, number>;
} {
  const catalog = getCatalog();
  const byCategory: Record<string, number> = {};
  for (const item of catalog) {
    byCategory[item.category] = (byCategory[item.category] || 0) + 1;
  }
  return { total: catalog.length, byCategory };
}
