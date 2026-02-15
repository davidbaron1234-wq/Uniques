// ── Master Catalog Type System ─────────────────────────────────────────────
// Every collectible in the platform is backed by a MasterItem from the global catalog.
// User inventory items link to this via `masterId`.

export type CatalogCategory = "Pokémon TCG" | "Trading Cards" | "Sneakers" | "Coins";

export interface MasterItem {
  id: string;                // Namespaced: "ptcg-base1-4", "snkr-aj1-chicago", "coin-1909svdb"
  name: string;              // "Charizard", "Air Jordan 1 Chicago"
  category: CatalogCategory;
  subCategory: string;       // "Pokémon TCG", "Nike", "US Coins"
  set?: string;              // "Base Set", "Air Jordan 1", "Lincoln Cents"
  series?: string;           // "Base", "Retro High OG", "Wheat Penny"
  rarity?: string;           // "Rare Holo", "Limited", "Key Date"
  imageSmall: string;        // Thumbnail URL
  imageLarge: string;        // High-res URL
  marketPrice: number;       // Current market value in USD
  lastUpdated?: string;      // ISO date of last price update
}

export interface CatalogSearchResult {
  items: MasterItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
}

// ── Pokémon TCG API Response Types ─────────────────────────────────────────

export interface PokemonTCGCard {
  id: string;
  name: string;
  supertype: string;
  subtypes?: string[];
  hp?: string;
  types?: string[];
  set: {
    id: string;
    name: string;
    series: string;
    releaseDate?: string;
  };
  number: string;
  rarity?: string;
  images: {
    small: string;
    large: string;
  };
  tcgplayer?: {
    url: string;
    updatedAt: string;
    prices?: Record<string, { low?: number; mid?: number; high?: number; market?: number }>;
  };
  cardmarket?: {
    prices?: {
      averageSellPrice?: number;
      trendPrice?: number;
    };
  };
}

export interface PokemonTCGResponse {
  data: PokemonTCGCard[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}
