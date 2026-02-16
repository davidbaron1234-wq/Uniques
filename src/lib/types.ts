import type { Category } from "./constants";
export type { Category };

export type ItemCondition = "Mint" | "Near Mint" | "Excellent" | "Played" | "Damaged";
export type ItemStatus = "For Trade" | "For Sale" | "Showcase";

export interface CollectibleItem {
  id: string;
  masterId?: string;         // Links to MasterItem.id in the global catalog
  name: string;
  category: Category;
  imageUrl: string;
  customImage?: string;      // User-uploaded Base64 image — takes priority over imageUrl
  upForTrade: boolean;
  estimatedValue?: number;
  condition?: ItemCondition;
  status?: ItemStatus;
  notes?: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  bio?: string;
  trustScore?: number;       // 0-5 stars
  totalTrades?: number;
  memberSince?: string;
  deliveryPreference?: string;
  paymentPreference?: string;
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
}

export interface TradeHistoryEntry extends TradeOffer {
  completedAt: string;
}
