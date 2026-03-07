import { LucideIcon } from "lucide-react";

// ── Master Catalog Type System (Global) ────────────────────────────────────
// Includes all 11 app categories so eBay items can be classified precisely.
// "Trading Cards" is kept for backwards compatibility with seed data.
export type CatalogCategory =
  | "Pokémon TCG"
  | "Sports Cards"
  | "Other TCG"
  | "Funko Pop"
  | "Lego"
  | "Sneakers"
  | "Video Games"
  | "Comics"
  | "Watches"
  | "Coins"
  | "Trading Cards"
  | "Other";

export interface MasterItem {
  id: string;
  name: string;
  category: CatalogCategory;
  subCategory: string;
  set?: string;
  series?: string;
  rarity?: string;
  imageSmall: string;
  imageLarge: string;
  marketPrice: number;
  lastUpdated?: string;
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

// ═════════════════════════════════════════════════════════════════════════
// ██  APP & INVENTORY TYPES (UPDATED)  ████████████████████████████████████
// ═════════════════════════════════════════════════════════════════════════

export type Category = 
  | "Pokémon TCG"
  | "Sports Cards"
  | "Other TCG"
  | "Funko Pop"
  | "Lego"
  | "Sneakers"
  | "Video Games"
  | "Comics"
  | "Watches"
  | "Coins"
  | "Other";

export type ItemCondition = 
  | "Mint" | "Near Mint" | "Lightly Played" | "Played" | "Damaged"
  | "Mint Box" | "Damaged Box" | "Out of Box"
  | "Sealed" | "Complete" | "Incomplete"
  | "Deadstock" | "VNDS" | "Used" | "Beaters"
  | "New" | "Like New" | "Good" | "Fair" | "Poor"
  | "Raw" | "Uncirculated" | "Proof" | "Bullion"
  | string; 

export type ItemStatus = "Showcase" | "For Trade" | "For Sale" | string;

export interface CollectibleItem {
  id: string;
  masterId?: string;
  name: string;
  category: Category;
  imageUrl: string;
  customImage?: string;
  estimatedValue?: number;
  condition?: ItemCondition;
  status?: ItemStatus;
  upForTrade: boolean;
  notes?: string;
  
  // 🔥 השדות החדשים - חובה שיהיו כאן כדי שהאדום יעלם!
  graded?: boolean;
  grader?: string;
  gradeNum?: string;
  year?: string;
  pieces?: string;
}

export interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
  active?: boolean;
}