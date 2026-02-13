export type Category = "Comics" | "Funko Pop" | "Trading Cards" | "Shoes" | "Coins" | "Figures";

export interface CollectibleItem {
  id: string;
  name: string;
  category: Category;
  imageUrl: string;
  upForTrade: boolean;
  estimatedValue?: number;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
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
