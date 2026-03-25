"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, Dispatch, SetStateAction, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { MasterItem } from "@/lib/catalog/types";
import { CollectibleItem, ItemCondition, ItemStatus, TradeHistoryEntry } from "@/lib/types";
import { mapCatalogCategory } from "@/lib/constants";
import { isDemoUser } from "@/lib/demo";

// v2: bumped to clear old corrupted data (duplicate Charizard bug)
const STORAGE_KEY = "uniques_inventory_v2";

// Shape returned by GET /api/items
type DBItem = {
  id:             string;
  title:          string;
  category:       string;
  imageUrl:       string;
  estimatedValue: number | null;
  upForTrade:     boolean;
  description:    string;
  status:         string;
};

// Shape returned by GET /api/trades
type DBTrade = {
  id:             string;
  proposerId:     string;
  offerData:      unknown;
  status:         string; // "pending" | "completed" | "declined"
  createdAt:      string;
  completedAt:    string | null;
};

function dbItemToCollectible(i: DBItem): CollectibleItem {
  return {
    id:             i.id,
    name:           i.title,
    category:       i.category as CollectibleItem["category"],
    imageUrl:       i.imageUrl,
    customImage:    i.imageUrl || undefined,
    estimatedValue: i.estimatedValue ?? undefined,
    upForTrade:     i.upForTrade,
  };
}

function dbTradeToEntry(trade: DBTrade, userName: string, userAvatar: string): TradeHistoryEntry {
  const od = (trade.offerData ?? {}) as {
    toUser?:    { name?: string; avatar?: string };
    fromItems?: Array<{ id: string; name: string; imageUrl: string; estimatedValue?: number; category?: string }>;
    toItems?:   Array<{ id: string; name: string; imageUrl: string; estimatedValue?: number; category?: string }>;
    fromCash?:  number;
    toCash?:    number;
    message?:   string;
  };
  return {
    id:          trade.id,
    from:        { name: userName || "You", avatar: userAvatar || "" },
    to:          { name: od.toUser?.name ?? "Unknown", avatar: od.toUser?.avatar ?? "" },
    fromItems:   od.fromItems ?? [],
    fromCash:    od.fromCash  ?? 0,
    toItems:     od.toItems   ?? [],
    toCash:      od.toCash    ?? 0,
    // DB uses "completed"; TradeHistoryEntry uses "accepted" — completedAt discriminates
    status:      (trade.status === "completed" ? "accepted" : trade.status) as TradeHistoryEntry["status"],
    createdAt:   trade.createdAt,
    completedAt: trade.completedAt ?? undefined,
    message:     od.message,
  };
}

export interface AddItemOptions {
  askingPrice?: number;
  condition?: ItemCondition;
  status?: ItemStatus;
  notes?: string;
  customImage?: string;
}

interface InventoryContextValue {
  items: CollectibleItem[];
  setItems: Dispatch<SetStateAction<CollectibleItem[]>>;
  totalValue: number;
  addFromCatalog: (item: MasterItem, options?: AddItemOptions) => void;
  updateItem: (id: string, updates: Partial<CollectibleItem>) => void;
  removeItem: (id: string) => void;
  addRawItem: (item: CollectibleItem) => void;
  hasItem: (masterId: string) => boolean;
  lockItems: (ids: string[], note?: string, type?: "sent" | "accepted") => void;
  unlockItems: (ids: string[]) => void;
  tradeHistoryEntries: TradeHistoryEntry[];
  addTradeHistory: (entry: TradeHistoryEntry) => void;
  updateTradeHistory: (id: string, updates: Partial<TradeHistoryEntry>) => void;
  toast: string | null;
  clearToast: () => void;
  showToast: (msg: string) => void;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}

// ── localStorage helpers (items only — still used as instant-hydration cache) ─
function loadItems(): CollectibleItem[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return JSON.parse(saved);
  } catch {}
  return [];
}

// ── Provider ────────────────────────────────────────────────────────────────
export function InventoryProvider({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted]               = useState(false);
  const [items, setItems]                       = useState<CollectibleItem[]>([]);
  const [tradeHistoryEntries, setTradeHistory]  = useState<TradeHistoryEntry[]>([]);
  const [toast, setToast]                       = useState<string | null>(null);
  const { data: session, status }               = useSession();
  const dbLoaded                                = useRef(false);

  // Mount: load items from localStorage cache for instant hydration
  useEffect(() => {
    setItems(loadItems());
    setIsMounted(true);
  }, []);

  // Cloud sync: re-runs whenever the logged-in user changes.
  // Replaces both items AND trade history from DB — single source of truth.
  useEffect(() => {
    if (status === "loading" || dbLoaded.current) return;
    if (isDemoUser(session?.user?.email)) { dbLoaded.current = true; return; }
    if (!session?.user?.id) return;

    dbLoaded.current = true;

    // Items
    fetch("/api/items?userId=me")
      .then((r) => r.ok ? r.json() : null)
      .then((data: { items: DBItem[] } | null) => {
        if (!data?.items) return;
        const dbItems = data.items.map(dbItemToCollectible);
        setItems(dbItems);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dbItems)); } catch {}
      })
      .catch(() => {});

    // Trade history — DB is the source of truth; localStorage no longer used
    fetch("/api/trades")
      .then((r) => r.ok ? r.json() : null)
      .then((data: { trades: DBTrade[] } | null) => {
        if (!data?.trades) return;
        const name   = session.user!.name  ?? "You";
        const avatar = session.user!.image ?? "";
        setTradeHistory(data.trades.map((t) => dbTradeToEntry(t, name, avatar)));
      })
      .catch(() => {});

  }, [status, session?.user?.email, session?.user?.id]);

  // Persist items to localStorage cache (fast hydration on next visit)
  useEffect(() => {
    if (isMounted) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
    }
  }, [items, isMounted]);

  // Auto-clear toast after 3 s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const totalValue = items.reduce((sum, i) => sum + (i.estimatedValue || 0), 0);

  const hasItem = useCallback(
    (masterId: string) => items.some((i) => i.masterId === masterId),
    [items]
  );

  const addFromCatalog = useCallback(
    (master: MasterItem, options?: AddItemOptions) => {
      if (hasItem(master.id)) return;
      const newItem: CollectibleItem = {
        id:             `catalog-${Date.now()}`,
        masterId:       master.id,
        name:           master.name,
        category:       mapCatalogCategory(master.category),
        imageUrl:       master.imageLarge || master.imageSmall,
        customImage:    options?.customImage,
        upForTrade:     options?.status === "For Trade",
        estimatedValue: options?.askingPrice ?? master.marketPrice,
        condition:      options?.condition,
        status:         options?.status,
        notes:          options?.notes,
      };
      setItems((prev) => {
        const next = [newItem, ...prev];
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
        return next;
      });
      setToast(`Added ${master.name} to your vault!`);
    },
    [hasItem]
  );

  const updateItem = useCallback((id: string, updates: Partial<CollectibleItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    setToast("Item updated!");
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const lockItems = useCallback((ids: string[], note?: string, type?: "sent" | "accepted") => {
    const idSet = new Set(ids);
    setItems((prev) =>
      prev.map((item) =>
        idSet.has(item.id)
          ? { ...item, isLocked: true, lockedType: type ?? "sent", lockedNote: note ?? item.lockedNote }
          : item
      )
    );
  }, []);

  const unlockItems = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setItems((prev) =>
      prev.map((item) =>
        idSet.has(item.id)
          ? { ...item, isLocked: false, lockedType: undefined, lockedNote: undefined, pendingDeal: undefined }
          : item
      )
    );
  }, []);

  const addTradeHistory = useCallback((entry: TradeHistoryEntry) => {
    setTradeHistory((prev) => [entry, ...prev]);
  }, []);

  const updateTradeHistory = useCallback((id: string, updates: Partial<TradeHistoryEntry>) => {
    setTradeHistory((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  }, []);

  const addRawItem = useCallback((item: CollectibleItem) => {
    setItems((prev) => {
      const next = [item, ...prev];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    setToast(`Added ${item.name} to your vault!`);
  }, []);

  const showToast  = useCallback((msg: string) => setToast(msg), []);
  const clearToast = useCallback(() => setToast(null), []);

  return (
    <InventoryContext.Provider
      value={{ items, setItems, totalValue, addFromCatalog, updateItem, removeItem, addRawItem, hasItem, lockItems, unlockItems, tradeHistoryEntries, addTradeHistory, updateTradeHistory, toast, clearToast, showToast }}
    >
      {children}
    </InventoryContext.Provider>
  );
}
