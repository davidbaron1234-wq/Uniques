"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, Check, Search } from "lucide-react";
import { formatValue } from "@/lib/format";

// ── Types ──────────────────────────────────────────────────────────────────

export type PowerPickerItem = {
  id: string;
  name: string;
  imageUrl: string;
  estimatedValue?: number;
  category: string;
  customImage?: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────

const CAT_LABEL: Record<string, string> = {
  "Pokémon TCG":  "Pokémon",
  "Sports Cards": "Sports",
  "Funko Pop":    "Funko",
};
const shortCat = (c: string) => CAT_LABEL[c] ?? c;

// ── PowerPicker ────────────────────────────────────────────────────────────
// Shared item-selection component used in both ProposeTradeModal (multi) and
// TradeOfferModal (multi). Provides Search + Sort toggle + Category pills + grid.

export function PowerPicker({
  items,
  mode,
  selectedIds,
  onToggle,
  onSelect,
}: {
  items: PowerPickerItem[];
  mode: "multi" | "single";
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
  onSelect?: (item: PowerPickerItem) => void;
}) {
  const [search,      setSearch]      = useState("");
  const [activeCats,  setActiveCats]  = useState<Set<string>>(new Set());
  const [sortBy,      setSortBy]      = useState<"value" | "newest">("value");

  const categories = useMemo(() => {
    const cats = Array.from(new Set(items.map((i) => i.category)));
    return cats.length > 1 ? ["All", ...cats] : [];
  }, [items]);

  const filtered = useMemo(() => {
    let list = [...items];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    if (activeCats.size > 0) list = list.filter((i) => activeCats.has(i.category));
    if (sortBy === "value") list.sort((a, b) => (b.estimatedValue ?? 0) - (a.estimatedValue ?? 0));
    return list;
  }, [items, search, activeCats, sortBy]);

  return (
    <div className="flex flex-col gap-2.5">
      {/* ── Search + sort ── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cream/25 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-cream/80 placeholder:text-cream/20 focus:outline-none focus:border-primary/30 transition-colors"
          />
        </div>
        <button
          onClick={() => setSortBy((s) => (s === "value" ? "newest" : "value"))}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[10px] text-cream/40 hover:text-cream/70 font-bold transition-colors whitespace-nowrap flex-shrink-0"
        >
          <ArrowUpDown className="w-3 h-3" />
          {sortBy === "value" ? "Value" : "Newest"}
        </button>
      </div>

      {/* ── Category pills (multi-select) ── */}
      {categories.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {categories.map((cat) => {
            const isAll    = cat === "All";
            const isActive = isAll ? activeCats.size === 0 : activeCats.has(cat);
            return (
              <button
                key={cat}
                onClick={() => {
                  if (isAll) {
                    setActiveCats(new Set());
                  } else {
                    setActiveCats((prev) => {
                      const next = new Set(prev);
                      next.has(cat) ? next.delete(cat) : next.add(cat);
                      return next;
                    });
                  }
                }}
                className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  isActive
                    ? "bg-primary text-charcoal-dark"
                    : "bg-white/[0.05] text-cream/35 hover:text-cream/60 hover:bg-white/[0.09]"
                }`}
              >
                {shortCat(cat)}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Items grid ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-8 gap-1.5 text-center">
          <p className="text-cream/25 text-xs font-medium">
            {search ? `No results for "${search}"` : "No items here"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {filtered.map((item) => {
            const selected = mode === "multi" && (selectedIds?.has(item.id) ?? false);
            const whiteBg  = item.category === "Lego" || item.category === "Funko Pop";
            return (
              <button
                key={item.id}
                onClick={() => mode === "multi" ? onToggle?.(item.id) : onSelect?.(item)}
                className={`relative rounded-xl overflow-hidden transition-all active:scale-95 ${
                  selected
                    ? "ring-2 ring-primary scale-[0.97]"
                    : "opacity-70 hover:opacity-100 hover:ring-1 hover:ring-primary/30"
                }`}
              >
                <div className={`aspect-square flex items-center justify-center ${
                  whiteBg ? "bg-white p-2" : "bg-white/[0.05] p-2.5"
                }`}>
                  <img
                    src={item.customImage ?? item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="px-1.5 py-1 bg-background-light">
                  <p className="text-[9px] text-cream/70 truncate font-medium leading-tight">{item.name}</p>
                  {item.estimatedValue != null && (
                    <p className="text-[9px] text-primary/70 font-bold">{formatValue(item.estimatedValue)}</p>
                  )}
                </div>
                {selected && (
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-soft">
                    <Check className="w-3 h-3 text-charcoal-dark" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
