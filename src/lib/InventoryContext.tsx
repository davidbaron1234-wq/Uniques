"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, Dispatch, SetStateAction, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { MasterItem } from "@/lib/catalog/types";
import { CollectibleItem, ItemCondition, ItemStatus, TradeHistoryEntry } from "@/lib/types";
import { mapCatalogCategory } from "@/lib/constants";
import { isDemoUser } from "@/lib/demo";

// v2: bumped to clear old corrupted data (duplicate Charizard bug)
const STORAGE_KEY   = "uniques_inventory_v2";
const HISTORY_KEY   = "uniques_trade_history";

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

function dbItemToCollectible(i: DBItem): CollectibleItem {
  return {
    id:             i.id,
    name:           i.title,
    category:       i.category as CollectibleItem["category"],
    // imageUrl holds the authoritative image in the DB (custom upload or catalog URL).
    // We also populate customImage so the UI's `customImage || imageUrl` pattern always
    // shows the correct photo — not a stale catalog URL from a previous local state.
    imageUrl:       i.imageUrl,
    customImage:    i.imageUrl || undefined,
    estimatedValue: i.estimatedValue ?? undefined,
    upForTrade:     i.upForTrade,
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

// ── Load from localStorage ──────────────────────────────────────────────
function loadItems(): CollectibleItem[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return JSON.parse(saved);
  } catch {}
  return []; // Real users start with an empty vault — no mock seed
}

function loadHistory(): TradeHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved !== null) return JSON.parse(saved);
  } catch {}
  return [];
}

// ── Provider ────────────────────────────────────────────────────────────
export function InventoryProvider({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  const [items, setItems] = useState<CollectibleItem[]>([]);
  const [tradeHistoryEntries, setTradeHistoryEntries] = useState<TradeHistoryEntry[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const dbLoaded = useRef(false);

  useEffect(() => {
    // 1. Read from localStorage exactly once on client mount
    setItems(loadItems());
    setTradeHistoryEntries(loadHistory());
    setIsMounted(true);
  }, []);

  // 2. Cloud sync: replace localStorage items with DB items for authenticated users.
  //    This is the source of truth on every device — ensures cross-device consistency.
  useEffect(() => {
    if (status === "loading" || dbLoaded.current) return;
    if (isDemoUser(session?.user?.email)) { dbLoaded.current = true; return; }
    if (!session?.user?.id) return;

    dbLoaded.current = true;
    fetch("/api/items?userId=me")
      .then((r) => r.ok ? r.json() : null)
      .then((data: { items: DBItem[] } | null) => {
        if (!data?.items) return;
        const dbItems = data.items.map(dbItemToCollectible);
        setItems(dbItems);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dbItems)); } catch {}
      })
      .catch(() => {});
  }, [status, session?.user?.email, session?.user?.id]);

  // 2. Persist ONLY if strictly mounted (prevents initial overwrite)
  useEffect(() => {
    if (isMounted) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
    }
  }, [items, isMounted]);

  useEffect(() => {
    if (isMounted) {
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(tradeHistoryEntries)); } catch {}
    }
  }, [tradeHistoryEntries, isMounted]);

  // Auto-clear toast after 3s
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
        id: `catalog-${Date.now()}`,
        masterId: master.id,
        name: master.name,
        category: mapCatalogCategory(master.category),
        imageUrl: master.imageLarge || master.imageSmall,
        customImage: options?.customImage,
        upForTrade: options?.status === "For Trade",
        estimatedValue: options?.askingPrice ?? master.marketPrice,
        condition: options?.condition,
        status: options?.status,
        notes: options?.notes,
      };
      // Write synchronously inside the updater so navigation can't outrun the effect
      setItems((prev) => {
        const next = [newItem, ...prev];
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* quota */ }
        return next;
      });
      setToast(`Added ${master.name} to your vault!`);
    },
    [hasItem]
  );

  const updateItem = useCallback((id: string, updates: Partial<CollectibleItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
    setToast("Item updated!");
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* quota */ }
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
    setTradeHistoryEntries((prev) => [entry, ...prev]);
  }, []);

  const updateTradeHistory = useCallback((id: string, updates: Partial<TradeHistoryEntry>) => {
    setTradeHistoryEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  }, []);

  const addRawItem = useCallback((item: CollectibleItem) => {
    // Write synchronously inside the updater — prevents navigation-race where the
    // async useEffect fires AFTER the route change and the addition is never persisted.
    setItems((prev) => {
      const next = [item, ...prev];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
    setToast(`Added ${item.name} to your vault!`);
  }, []);

  const showToast = useCallback((msg: string) => setToast(msg), []);

  const clearToast = useCallback(() => setToast(null), []);

  // During hydration, render children but provide seed values so layout doesn't shift.
  // The context values will update once isMounted flips to true.

  return (
    <InventoryContext.Provider
      value={{ items, setItems, totalValue, addFromCatalog, updateItem, removeItem, addRawItem, hasItem, lockItems, unlockItems, tradeHistoryEntries, addTradeHistory, updateTradeHistory, toast, clearToast, showToast }}
    >
      {children}
    </InventoryContext.Provider>
  );
}
