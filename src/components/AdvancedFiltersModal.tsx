"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { getConditionsForCategory } from "@/components/ItemConfigForm";

export interface ExploreFilters {
  categories: string[];  // max 1 element (single-select)
  minPrice: number | null;
  maxPrice: number | null;
  condition: string | null;
}

interface AdvancedFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ExploreFilters;
  onApply: (filters: ExploreFilters) => void;
}

const CATEGORIES = [
  "Pokémon TCG",
  "Sports Cards",
  "Other TCG",
  "Funko Pop",
  "Lego",
  "Sneakers",
  "Video Games",
  "Comics",
  "Watches",
  "Coins",
  "Other",
];

function emptyFilters(): ExploreFilters {
  return { categories: [], minPrice: null, maxPrice: null, condition: null };
}

function countActive(f: ExploreFilters): number {
  let n = f.categories.length > 0 ? 1 : 0;
  if (f.minPrice !== null) n++;
  if (f.maxPrice !== null) n++;
  if (f.condition !== null) n++;
  return n;
}

export default function AdvancedFiltersModal({
  isOpen,
  onClose,
  filters,
  onApply,
}: AdvancedFiltersModalProps) {
  const [draft, setDraft] = useState<ExploreFilters>(emptyFilters);
  const [minText, setMinText] = useState("");
  const [maxText, setMaxText] = useState("");

  // Sync draft from props when modal opens
  useEffect(() => {
    if (isOpen) {
      setDraft(filters);
      setMinText(filters.minPrice !== null ? String(filters.minPrice) : "");
      setMaxText(filters.maxPrice !== null ? String(filters.maxPrice) : "");
    }
  }, [isOpen, filters]);

  if (!isOpen) return null;

  // Single-select: clicking the active category deselects it; clicking another selects it
  const selectCategory = (cat: string) => {
    setDraft((prev) => {
      const isActive = prev.categories[0] === cat;
      const newCat = isActive ? [] : [cat];
      // Reset condition when category changes (different condition sets)
      const prevCat = prev.categories[0];
      const conditionStillValid =
        prev.condition === null ||
        getConditionsForCategory(newCat[0]).some((c) => c.value === prev.condition);
      return {
        ...prev,
        categories: newCat,
        condition: prevCat !== newCat[0] && !conditionStillValid ? null : prev.condition,
      };
    });
  };

  const setCondition = (cond: string) => {
    setDraft((prev) => ({ ...prev, condition: cond === "Any" ? null : cond }));
  };

  const handleMinChange = (val: string) => {
    setMinText(val);
    const n = parseFloat(val);
    setDraft((prev) => ({ ...prev, minPrice: isNaN(n) ? null : n }));
  };

  const handleMaxChange = (val: string) => {
    setMaxText(val);
    const n = parseFloat(val);
    setDraft((prev) => ({ ...prev, maxPrice: isNaN(n) ? null : n }));
  };

  const handleClearAll = () => {
    setDraft(emptyFilters());
    setMinText("");
    setMaxText("");
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const activeCount = countActive(draft);
  const activeCategory = draft.categories[0] ?? null;
  // Get conditions from the same source as ItemConfigForm
  const conditions = getConditionsForCategory(activeCategory ?? undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-[#1A1818] rounded-3xl border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <h2 className="text-lg font-bold text-cream">Filters</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto scrollbar-none p-5 space-y-6">
          {/* Category — single select */}
          <div>
            <h3 className="text-sm font-bold text-cream/70 mb-3">Category</h3>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const active = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => selectCategory(cat)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all ${
                      active
                        ? "bg-[#CAE6CE]/20 text-[#CAE6CE] ring-1 ring-[#CAE6CE]/40"
                        : "bg-white/5 text-cream/50 hover:text-cream/70"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="text-sm font-bold text-cream/70 mb-3">Price Range</h3>
            <div className="grid grid-cols-2 gap-4 w-full">
              <input
                type="text"
                inputMode="decimal"
                placeholder="Min $"
                value={minText}
                onChange={(e) => handleMinChange(e.target.value)}
                className="w-full min-w-0 box-border bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-cream text-sm placeholder:text-cream/25 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
              <input
                type="text"
                inputMode="decimal"
                placeholder="Max $"
                value={maxText}
                onChange={(e) => handleMaxChange(e.target.value)}
                className="w-full min-w-0 box-border bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-cream text-sm placeholder:text-cream/25 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
          </div>

          {/* Condition — dynamic from same source as ItemConfigForm */}
          <div>
            <h3 className="text-sm font-bold text-cream/70 mb-1">Condition</h3>
            {activeCategory && (
              <p className="text-[10px] text-cream/30 mb-3">
                Conditions for <span className="text-[#CAE6CE]/70">{activeCategory}</span>
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {/* "Any" deselect chip */}
              <button
                onClick={() => setCondition("Any")}
                className={`px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all ${
                  draft.condition === null
                    ? "bg-[#CAE6CE]/20 text-[#CAE6CE] ring-1 ring-[#CAE6CE]/40"
                    : "bg-white/5 text-cream/50 hover:text-cream/70"
                }`}
              >
                Any
              </button>
              {conditions.map((cond) => {
                const active = draft.condition === cond.value;
                return (
                  <button
                    key={cond.value}
                    onClick={() => setCondition(cond.value)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all ${
                      active
                        ? "bg-[#CAE6CE]/20 text-[#CAE6CE] ring-1 ring-[#CAE6CE]/40"
                        : "bg-white/5 text-cream/50 hover:text-cream/70"
                    }`}
                  >
                    {cond.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 pb-5 pt-3 border-t border-white/[0.06] flex-shrink-0">
          <button
            onClick={handleClearAll}
            className="px-5 py-3 rounded-2xl bg-white/5 text-cream/40 font-bold text-sm hover:bg-white/10 hover:text-cream/60 active:scale-[0.97] transition-all"
          >
            Clear All
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 rounded-2xl bg-[#CAE6CE]/20 text-[#CAE6CE] font-bold text-sm hover:bg-[#CAE6CE]/30 active:scale-[0.97] transition-all"
          >
            Apply{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
