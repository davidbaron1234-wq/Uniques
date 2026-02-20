"use client";

import { useState, useMemo } from "react";
import {
  X,
  Search,
  Check,
  Send,
  PackageOpen,
  DollarSign,
  Star,
  Award,
} from "lucide-react";
import { useInventory } from "@/lib/InventoryContext";
import { CollectibleItem } from "@/lib/types";
import { formatValue } from "@/lib/format";
import type { MarketplaceItem, MockSeller, MockBuyer } from "./MarketplaceModal";

// ── Types ──────────────────────────────────────────────────────────────────

type OfferMode = "buy" | "accept";
type FairnessTier = "empty" | "low" | "below" | "fair" | "above";

export interface TradeOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketItem: MarketplaceItem | null;
  counterparty: MockSeller | MockBuyer | null;
  mode: OfferMode;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isSeller(cp: MockSeller | MockBuyer): cp is MockSeller {
  return "askingPrice" in cp;
}

function getPrice(cp: MockSeller | MockBuyer): number {
  return isSeller(cp) ? cp.askingPrice : (cp as MockBuyer).offerPrice;
}

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,ffd5dc`;
}

function condLabel(item: CollectibleItem): string {
  if (item.graded && item.grader) return `${item.grader} ${item.gradeNum ?? ""}`.trim();
  return item.condition ?? "";
}

function getFairness(offer: number, target: number): FairnessTier {
  if (offer === 0 || target === 0) return "empty";
  const r = offer / target;
  if (r < 0.7)  return "low";
  if (r < 0.9)  return "below";
  if (r <= 1.1) return "fair";
  return "above";
}

const TIER: Record<FairnessTier, { bar: string; text: string; label: string }> = {
  empty: { bar: "bg-white/10",   text: "text-cream/30",   label: "" },
  low:   { bar: "bg-red-500",    text: "text-red-400",    label: "Low offer" },
  below: { bar: "bg-amber-400",  text: "text-amber-400",  label: "Below asking" },
  fair:  { bar: "bg-primary",    text: "text-primary",    label: "Fair offer ✓" },
  above: { bar: "bg-green-400",  text: "text-green-400",  label: "Above asking ✓" },
};

// ── Inventory grid card ────────────────────────────────────────────────────

function InventoryCard({
  item,
  selected,
  onToggle,
}: {
  item: CollectibleItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const label = condLabel(item);
  const isGraded = !!(item.graded && item.grader);

  return (
    <button
      onClick={onToggle}
      className={`relative flex flex-col rounded-2xl overflow-hidden border-2 text-left transition-all active:scale-[0.94] ${
        selected
          ? "border-primary shadow-[0_0_14px_rgba(202,230,206,0.18)]"
          : "border-white/[0.06] hover:border-white/[0.15]"
      }`}
    >
      {/* Square image */}
      <div className="relative aspect-square w-full bg-charcoal-light/20 overflow-hidden">
        <img
          src={item.customImage || item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover"
        />

        {/* Selected overlay + checkmark */}
        {selected && (
          <div className="absolute inset-0 bg-primary/25 flex items-start justify-end p-1.5">
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow">
              <Check className="w-3 h-3 text-charcoal-dark" strokeWidth={3} />
            </div>
          </div>
        )}

        {/* Graded badge */}
        {isGraded && (
          <div className="absolute bottom-1.5 left-1.5">
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-400/90 text-charcoal-dark leading-none">
              <Award className="w-2 h-2" />
              {item.grader} {item.gradeNum}
            </span>
          </div>
        )}
      </div>

      {/* Info row */}
      <div className={`px-1.5 py-1.5 flex flex-col gap-0.5 transition-colors ${
        selected ? "bg-primary/10" : "bg-white/[0.03]"
      }`}>
        <p className="text-[10px] font-bold text-cream leading-tight line-clamp-2 min-h-[2.4em]">
          {item.name}
        </p>
        <div className="flex items-center justify-between gap-1">
          {item.estimatedValue != null ? (
            <span className={`text-[10px] font-bold ${selected ? "text-primary" : "text-primary/80"}`}>
              {formatValue(item.estimatedValue)}
            </span>
          ) : (
            <span className="text-[10px] text-cream/20">—</span>
          )}
          {label && !isGraded && (
            <span className="text-[9px] text-cream/30 truncate max-w-[50px]">{label}</span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function TradeOfferModal({
  isOpen,
  onClose,
  marketItem,
  counterparty,
  mode,
}: TradeOfferModalProps) {
  const { items } = useInventory();

  // ── All hooks above early return ──────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [cashAmount, setCashAmount]   = useState("");
  const [search, setSearch]           = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [gradedOnly, setGradedOnly]   = useState(false);
  const [success, setSuccess]         = useState(false);

  // Only items the user has marked for trade
  const tradeableItems = useMemo(
    () => items.filter((i) => i.upForTrade),
    [items]
  );

  // Unique categories present in tradeable items
  const categories = useMemo(
    () => Array.from(new Set(tradeableItems.map((i) => i.category))),
    [tradeableItems]
  );

  // Has any graded items → show "Graded" filter pill
  const hasGraded = useMemo(
    () => tradeableItems.some((i) => i.graded),
    [tradeableItems]
  );

  // Items after search + category + graded filters
  const filteredItems = useMemo(() => {
    let list = tradeableItems;
    const q = search.trim().toLowerCase();
    if (q)              list = list.filter((i) => i.name.toLowerCase().includes(q));
    if (activeCategory) list = list.filter((i) => i.category === activeCategory);
    if (gradedOnly)     list = list.filter((i) => i.graded);
    return list;
  }, [tradeableItems, search, activeCategory, gradedOnly]);

  // Value calculations
  const selectedItems = useMemo(
    () => items.filter((i) => selectedIds.has(i.id)),
    [items, selectedIds]
  );
  const selectedValue = useMemo(
    () => selectedItems.reduce((s, i) => s + (i.estimatedValue ?? 0), 0),
    [selectedItems]
  );
  const cashValue  = parseFloat(cashAmount) || 0;
  const totalOffer = selectedValue + cashValue;

  // ── Early return after hooks ──────────────────────────────────────────
  if (!isOpen || !marketItem || !counterparty) return null;

  const targetPrice = getPrice(counterparty);
  const fairnessPct = targetPrice > 0 ? Math.min((totalOffer / targetPrice) * 100, 100) : 0;
  const displayPct  = targetPrice > 0 ? Math.round((totalOffer / targetPrice) * 100) : 0;
  const fairness    = getFairness(totalOffer, targetPrice);
  const fStyle      = TIER[fairness];
  const canConfirm  = selectedIds.size > 0 || cashValue > 0;

  // ── Handlers ─────────────────────────────────────────────────────────
  const toggleItem = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const resetAndClose = () => {
    setSuccess(false);
    setSelectedIds(new Set());
    setCashAmount("");
    setSearch("");
    setActiveCategory(null);
    setGradedOnly(false);
    onClose();
  };

  const handleConfirm = () => {
    setSuccess(true);
    setTimeout(resetAndClose, 2200);
  };

  // ── Success screen ────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
        <div className="relative w-full max-w-xs bg-charcoal-dark rounded-3xl p-8 text-center animate-slide-up">
          <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500/35 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-400" strokeWidth={2.5} />
          </div>
          <h3 className="text-lg font-bold text-cream mb-2">Offer Sent!</h3>
          <p className="text-sm text-cream/40 leading-relaxed">
            <span className="text-cream/60 font-semibold">{counterparty.name}</span> will
            be notified and can accept, decline, or counter your offer.
          </p>
          {selectedIds.size > 0 && (
            <p className="text-[11px] text-cream/25 mt-3">
              {selectedIds.size} item{selectedIds.size > 1 ? "s" : ""}
              {cashValue > 0 ? ` + ${formatValue(cashValue)} cash` : ""} · {formatValue(totalOffer)} total
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-fade-in"
        onClick={resetAndClose}
      />

      {/* Modal shell */}
      <div className="relative w-full max-w-md bg-charcoal-dark rounded-3xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up">

        {/* Close */}
        <button
          onClick={resetAndClose}
          className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-white/80" />
        </button>

        {/* ══ HEADER: Target item + counterparty ══════════════════════ */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.06] flex-shrink-0">
          <p className="text-[11px] text-cream/30 font-semibold uppercase tracking-wider mb-3">
            {mode === "buy" ? "Offer Builder" : "Accept / Counter Offer"}
          </p>

          {/* Item being traded */}
          <div className="flex items-center gap-3 mb-3">
            <img
              src={marketItem.imageUrl}
              alt={marketItem.name}
              className="w-12 h-12 rounded-2xl object-cover bg-charcoal-light/20 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-cream truncate">{marketItem.name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {marketItem.category && (
                  <span className="text-[10px] text-cream/30 bg-white/5 px-1.5 py-0.5 rounded">
                    {marketItem.category}
                  </span>
                )}
                <span className="text-[11px] font-bold text-primary">
                  {formatValue(targetPrice)}
                </span>
                <span className="text-[10px] text-cream/25">asking</span>
              </div>
            </div>
          </div>

          {/* Counterparty */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <img
              src={avatarUrl(counterparty.seed)}
              alt={counterparty.name}
              className="w-8 h-8 rounded-full border border-white/10 bg-charcoal-light/20 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-cream">{counterparty.name}</span>
                <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                <span className="text-[10px] text-cream/40 font-semibold">{counterparty.trust}</span>
                <span className="text-[10px] text-cream/20">· {counterparty.trades} trades</span>
              </div>
              <p className="text-[10px] text-cream/30 mt-0.5">
                {counterparty.intent} · {counterparty.logistics}
              </p>
            </div>
          </div>
        </div>

        {/* ══ SEARCH + FILTERS (sticky) ════════════════════════════════ */}
        <div className="px-4 py-2.5 border-b border-white/[0.04] flex-shrink-0 space-y-2 bg-charcoal-dark">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cream/25 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your collection…"
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-background-light text-sm text-cream placeholder:text-cream/20 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cream/30 hover:text-cream/60 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter pills */}
          {(categories.length > 0 || hasGraded) && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {/* All */}
              <button
                onClick={() => { setActiveCategory(null); setGradedOnly(false); }}
                className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  !activeCategory && !gradedOnly
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-white/5 text-cream/35 border border-transparent hover:border-white/10 hover:text-cream/55"
                }`}
              >
                All
              </button>

              {/* Per-category */}
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(activeCategory === cat ? null : cat); setGradedOnly(false); }}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                    activeCategory === cat
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-white/5 text-cream/35 border border-transparent hover:border-white/10 hover:text-cream/55"
                  }`}
                >
                  {cat}
                </button>
              ))}

              {/* Graded only */}
              {hasGraded && (
                <button
                  onClick={() => { setGradedOnly(!gradedOnly); setActiveCategory(null); }}
                  className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    gradedOnly
                      ? "bg-yellow-400/15 text-yellow-400 border border-yellow-400/30"
                      : "bg-white/5 text-cream/35 border border-transparent hover:border-white/10 hover:text-cream/55"
                  }`}
                >
                  <Award className="w-2.5 h-2.5" />
                  Graded
                </button>
              )}
            </div>
          )}
        </div>

        {/* ══ SCROLLABLE BODY ══════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto overscroll-contain">

          {/* ── Inventory grid ── */}
          <div className="px-4 pt-3 pb-2">
            {tradeableItems.length === 0 ? (
              /* No items marked for trade at all */
              <div className="flex flex-col items-center py-10 text-center">
                <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3">
                  <PackageOpen className="w-7 h-7 text-cream/20" />
                </div>
                <p className="text-sm font-bold text-cream/40 mb-1">No items for trade</p>
                <p className="text-xs text-cream/25 leading-relaxed max-w-[200px] mb-4">
                  Mark items as &ldquo;For Trade&rdquo; in your inventory to include them here
                </p>
                <button
                  onClick={resetAndClose}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  Open Inventory →
                </button>
              </div>
            ) : filteredItems.length === 0 ? (
              /* Search / filter returned nothing */
              <div className="py-10 text-center">
                <Search className="w-7 h-7 text-cream/15 mx-auto mb-2" />
                <p className="text-sm text-cream/30">No items match your search</p>
              </div>
            ) : (
              <>
                {/* Header row */}
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[11px] text-cream/30 font-semibold uppercase tracking-wider">
                    Your items
                    <span className="ml-1 text-cream/20 font-normal">({filteredItems.length})</span>
                  </p>
                  {selectedIds.size > 0 && (
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="text-[10px] text-cream/35 hover:text-cream/60 transition-colors"
                    >
                      Clear {selectedIds.size} selected
                    </button>
                  )}
                </div>

                {/* 3-column grid */}
                <div className="grid grid-cols-3 gap-2">
                  {filteredItems.map((item) => (
                    <InventoryCard
                      key={item.id}
                      item={item}
                      selected={selectedIds.has(item.id)}
                      onToggle={() => toggleItem(item.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── Cash add-on ── */}
          <div className="px-4 pb-4 pt-2">
            <p className="text-[11px] text-cream/30 font-semibold uppercase tracking-wider mb-2">
              Add Cash to Offer
            </p>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream/25 pointer-events-none" />
              <input
                type="number"
                min="0"
                step="1"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-9 pr-9 py-3 rounded-xl bg-background-light text-cream text-sm placeholder:text-cream/20 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {cashValue > 0 && (
                <button
                  onClick={() => setCashAmount("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/30 hover:text-cream/60 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ══ FOOTER: Live calculator + actions ════════════════════════ */}
        <div className="px-4 pb-5 pt-3 border-t border-white/[0.06] flex-shrink-0 space-y-3">

          {/* Value calculator */}
          <div className="space-y-1.5">
            {/* Progress bar + label row */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-cream/30">
                {canConfirm
                  ? `${selectedIds.size > 0 ? `${selectedIds.size} item${selectedIds.size > 1 ? "s" : ""}` : ""}${
                      selectedIds.size > 0 && cashValue > 0 ? " + " : ""
                    }${cashValue > 0 ? formatValue(cashValue) + " cash" : ""}`
                  : "Select items or add cash"}
              </span>
              {canConfirm && (
                <span className={`font-bold ${fStyle.text}`}>
                  {fStyle.label} · {displayPct}%
                </span>
              )}
            </div>

            {/* Bar track */}
            <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${fStyle.bar}`}
                style={{ width: `${canConfirm ? fairnessPct : 0}%` }}
              />
            </div>

            {/* Totals row */}
            {canConfirm && (
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className={`font-bold ${fStyle.text}`}>
                  {formatValue(totalOffer)} total offer
                </span>
                <span className="text-cream/20">vs</span>
                <span className="text-cream/40">{formatValue(targetPrice)} asking</span>
                {totalOffer > targetPrice ? (
                  <span className="text-green-400 font-semibold">
                    (+{formatValue(totalOffer - targetPrice)})
                  </span>
                ) : totalOffer < targetPrice ? (
                  <span className="text-cream/30">
                    (−{formatValue(targetPrice - totalOffer)})
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={resetAndClose}
              className="px-4 py-3 rounded-2xl bg-white/[0.05] text-cream/40 font-bold text-sm hover:bg-white/10 active:scale-[0.97] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/20 text-primary font-bold text-sm hover:bg-primary/30 active:scale-[0.97] transition-all disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              Send Offer
              {canConfirm && (
                <span className="text-[10px] text-primary/60 font-normal">
                  {formatValue(totalOffer)}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
