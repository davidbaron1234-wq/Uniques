import { LucideIcon } from "lucide-react";

// ── Master Catalog Type System ─────────────────────────────────────────────
export type CatalogCategory = "Pokémon TCG" | "Trading Cards" | "Sneakers" | "Coins";

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

// ── Pokémon TCG API Types ──────────────────────────────────────────────────
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
// ██  APP TYPES (Full Collection)  ████████████████████████████████████████
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

// 🔥 הפריט המלא (עם כל השדות החדשים)
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
  isLocked?: boolean;             // true while item is tied to a pending/accepted trade
  lockedType?: "sent" | "accepted"; // "sent" = offer sent, "accepted" = deal accepted, awaiting fulfillment
  lockedNote?: string;            // human-readable context shown in "In Trade" view
  pendingDeal?: PendingDeal;      // populated only when lockedType === "accepted"
  notes?: string;
  
  // שדות מתקדמים (אופציונליים)
  graded?: boolean;
  grader?: string;
  gradeNum?: string;
  year?: string;
  pieces?: string;
}

// 🔥 החלק שהיה חסר וגרם לאדום ב-data.ts!
export interface User {
  id: string;
  name: string;
  handle?: string;
  avatar: string;
  coverImage?: string;
  bio?: string;
  location?: string;
  trustScore: number;
  totalTrades: number;
  memberSince: string;
  tier?: 'free' | 'pro';
  socialLinks?: {
    instagram?: string;
    twitter?: string;
  };
  deliveryPreference?: string;
  paymentPreference?: string;
}

// ממשק לפרופיל המשתמש (בשימוש ב-page.tsx)
export interface UserProfile {
  name: string;
  bio: string;
  avatar: string;
  joinDate: string;
  paymentMethods?: string[];
  shippingPreferences?: string[];
}

// Details stored on a locked item while a deal awaits fulfillment
export interface PendingDeal {
  counterpartyName: string;
  counterpartyAvatar: string;
  theirItems: Array<{ id: string; name: string; imageUrl: string; estimatedValue?: number }>;
  theirCash: number;
}

// Persisted trade history entry (both static seed and user-created)
export interface TradeHistoryEntry {
  id: string;
  from: { name: string; avatar: string };
  to: { name: string; avatar: string };
  fromItems: Array<{ id: string; name: string; imageUrl: string; estimatedValue?: number; category?: string }>;
  fromCash: number;
  toItems: Array<{ id: string; name: string; imageUrl: string; estimatedValue?: number; category?: string }>;
  toCash: number;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  completedAt?: string;  // absent while a trade is still pending
  message?: string;      // optional note from the offerer
}

export interface TradeOffer {
  id: string;
  from: User;
  to: User;
  fromItems: CollectibleItem[];
  toItems: CollectibleItem[];
  fromCash: number;
  toCash: number;
  status: "pending" | "accepted" | "declined" | "countered";
  createdAt: string;
  completedAt?: string;
}

export interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
  active?: boolean;
}