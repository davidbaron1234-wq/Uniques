"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { MasterItem } from "@/lib/catalog/types";
import { CollectibleItem, ItemCondition, ItemStatus, TradeHistoryEntry } from "@/lib/types";
import { mapCatalogCategory } from "@/lib/constants";

const STORAGE_KEY   = "uniques_inventory";
const HISTORY_KEY   = "uniques_trade_history";

export interface AddItemOptions {
  askingPrice?: number;
  condition?: ItemCondition;
  status?: ItemStatus;
  notes?: string;
  customImage?: string;
}

interface InventoryContextValue {
  items: CollectibleItem[];
  totalValue: number;
  addFromCatalog: (item: MasterItem, options?: AddItemOptions) => void;
  updateItem: (id: string, updates: Partial<CollectibleItem>) => void;
  removeItem: (id: string) => void;
  hasItem: (masterId: string) => boolean;
  lockItems: (ids: string[], note?: string) => void;
  unlockItems: (ids: string[]) => void;
  tradeHistoryEntries: TradeHistoryEntry[];
  addTradeHistory: (entry: TradeHistoryEntry) => void;
  toast: string | null;
  clearToast: () => void;
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
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* corrupt */ }
  return [];
}

function loadHistory(): TradeHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* corrupt */ }
  return [];
}

// ── Provider ────────────────────────────────────────────────────────────

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CollectibleItem[]>([]);
  const [tradeHistoryEntries, setTradeHistoryEntries] = useState<TradeHistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Hydrate on mount
  useEffect(() => {
    setItems(loadItems());
    setTradeHistoryEntries(loadHistory());
    setHydrated(true);
  }, []);

  // Persist inventory on change
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch { /* quota */ }
  }, [items, hydrated]);

  // Persist trade history on change
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(tradeHistoryEntries));
    } catch { /* quota */ }
  }, [tradeHistoryEntries, hydrated]);

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
      setItems((prev) => [newItem, ...prev]);
      setToast(`Added ${master.name} to your collection!`);
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
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const lockItems = useCallback((ids: string[], note?: string) => {
    const idSet = new Set(ids);
    setItems((prev) =>
      prev.map((item) =>
        idSet.has(item.id)
          ? { ...item, isLocked: true, lockedNote: note ?? item.lockedNote }
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

  const clearToast = useCallback(() => setToast(null), []);

  return (
    <InventoryContext.Provider
      value={{ items, totalValue, addFromCatalog, updateItem, removeItem, hasItem, lockItems, unlockItems, tradeHistoryEntries, addTradeHistory, toast, clearToast }}
    >
      {children}
    </InventoryContext.Provider>
  );
}
