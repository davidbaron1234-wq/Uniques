"use client";

import { useState, useMemo } from "react";
import {
  X,
  ArrowLeftRight,
  DollarSign,
  Check,
  PackageOpen,
  Send,
  Star,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useInventory } from "@/lib/InventoryContext";
import { CollectibleItem } from "@/lib/types";
import { formatValue } from "@/lib/format";
import type { MarketplaceItem, MockSeller, MockBuyer } from "./MarketplaceModal";

// ── Types ──────────────────────────────────────────────────────────────────

type OfferMode = "buy" | "accept";
type OfferMethod = "trade" | "cash";

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
  return isSeller(cp) ? cp.askingPrice : cp.offerPrice;
}

function getAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,ffd5dc`;
}

function getConditionLabel(item: CollectibleItem): string {
  if (item.graded && item.grader) return `${item.grader} ${item.gradeNum ?? ""}`.trim();
  return item.condition ?? "Unknown";
}

// ── Sub-components ─────────────────────────────────────────────────────────

function EmptyTradeState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
        <PackageOpen className="w-7 h-7 text-red-400/70" />
      </div>
      <h3 className="text-base font-bold text-cream mb-2">No Items for Trade</h3>
      <p className="text-sm text-cream/40 max-w-[220px] mx-auto mb-6 leading-relaxed">
        You don&apos;t have any items marked as &ldquo;For Trade&rdquo; in your inventory yet.
      </p>
      <button
        onClick={onClose}
        className="px-6 py-2.5 rounded-2xl bg-primary/15 text-primary font-bold text-sm hover:bg-primary/25 active:scale-[0.97] transition-all"
      >
        Go to Inventory →
      </button>
    </div>
  );
}

function ItemPicker({
  items,
  selectedId,
  onSelect,
}: {
  items: CollectibleItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-cream/30 font-semibold uppercase tracking-wider">
        Pick an item to offer
      </p>
      {items.map((item) => {
        const selected = selectedId === item.id;
        const condLabel = getConditionLabel(item);
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
              selected
                ? "bg-primary/12 border-primary/40"
                : "bg-white/[0.03] border-white/[0.06] hover:border-white/[0.14]"
            }`}
          >
            <img
              src={item.customImage || item.imageUrl}
              alt={item.name}
              className="w-12 h-12 rounded-xl object-cover bg-charcoal-light/20 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-cream truncate">{item.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[10px] text-cream/35 bg-white/5 px-1.5 py-0.5 rounded">
                  {condLabel}
                </span>
                {item.estimatedValue != null && (
                  <span className="text-[10px] text-primary font-semibold">
                    {formatValue(item.estimatedValue)}
                  </span>
                )}
              </div>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                selected
                  ? "border-primary bg-primary"
                  : "border-white/20 bg-transparent"
              }`}
            >
              {selected && <Check className="w-3 h-3 text-charcoal-dark font-black" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function CashOfferView({
  price,
  mode,
  counterpartyName,
  cashAmount,
  onChange,
}: {
  price: number;
  mode: OfferMode;
  counterpartyName: string;
  cashAmount: string;
  onChange: (v: string) => void;
}) {
  if (mode === "accept") {
    // User is accepting — just show buyer's cash offer
    return (
      <div className="space-y-2">
        <p className="text-[11px] text-cream/30 font-semibold uppercase tracking-wider">
          Their cash offer
        </p>
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-500/8 border border-green-500/20">
          <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">{formatValue(price)}</p>
            <p className="text-[11px] text-cream/30 mt-0.5">from {counterpartyName}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-cream/30 font-semibold uppercase tracking-wider">
        Your cash offer
      </p>
      <p className="text-[11px] text-cream/30">
        Asking price: <span className="text-primary font-semibold">{formatValue(price)}</span>
      </p>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cream/30 font-semibold">
          $
        </span>
        <input
          type="number"
          min="0"
          value={cashAmount}
          onChange={(e) => onChange(e.target.value)}
          placeholder={String(price)}
          autoFocus
          className="w-full pl-8 pr-4 py-3 rounded-2xl bg-background-light text-cream placeholder:text-cream/20 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
    </div>
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

  // All state above early return
  const [offerMethod, setOfferMethod] = useState<OfferMethod | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [cashAmount, setCashAmount] = useState("");
  const [success, setSuccess] = useState(false);

  const tradeableItems = useMemo(() => items.filter((i) => i.upForTrade), [items]);

  const sameCatItems = useMemo(
    () => tradeableItems.filter((i) => i.category === marketItem?.category),
    [tradeableItems, marketItem?.category]
  );

  // Items to show in picker — prefer same category, fall back to all tradeable
  const pickerItems = sameCatItems.length > 0 ? sameCatItems : tradeableItems;

  if (!isOpen || !marketItem || !counterparty) return null;

  const intent = counterparty.intent;
  const price = getPrice(counterparty);

  // Derive effective offer method:
  // "Cash Only" → cash, "Trade Only" → trade, "Open to Both" → user picks
  const effectiveMethod: OfferMethod | null =
    intent === "Cash Only" ? "cash" : intent === "Trade Only" ? "trade" : offerMethod;

  const hasTradeItems = tradeableItems.length > 0;

  // ── Confirm logic ──
  const canConfirm =
    (effectiveMethod === "cash" && (mode === "accept" || cashAmount.trim() !== "")) ||
    (effectiveMethod === "trade" && selectedItemId !== null);

  const handleConfirm = () => {
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setSelectedItemId(null);
      setCashAmount("");
      setOfferMethod(null);
      onClose();
    }, 2200);
  };

  const handleClose = () => {
    setSuccess(false);
    setSelectedItemId(null);
    setCashAmount("");
    setOfferMethod(null);
    onClose();
  };

  const handleBack = () => {
    setOfferMethod(null);
    setSelectedItemId(null);
    setCashAmount("");
  };

  // ── Success screen ──────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
        <div className="relative w-full max-w-xs bg-charcoal-dark rounded-3xl p-8 text-center animate-slide-up">
          <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-400" strokeWidth={2.5} />
          </div>
          <h3 className="text-lg font-bold text-cream mb-2">Offer Sent!</h3>
          <p className="text-sm text-cream/40 leading-relaxed">
            <span className="text-cream/60 font-semibold">{counterparty.name}</span> will be
            notified and can accept or counter your offer.
          </p>
        </div>
      </div>
    );
  }

  // ── Determine footer visibility ─────────────────────────────────────────
  // Hide footer when: method picker shown, or trade+no items (error state handles its own CTA)
  const showFooter =
    effectiveMethod !== null && !(effectiveMethod === "trade" && !hasTradeItems);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-md bg-charcoal-dark rounded-3xl overflow-hidden max-h-[88vh] flex flex-col animate-slide-up">
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-white/80" />
        </button>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.06] flex-shrink-0">
          <p className="text-[11px] text-cream/30 font-semibold uppercase tracking-wider mb-3">
            {mode === "buy" ? "Send Trade Offer" : "Accept Offer"}
          </p>

          {/* Market item summary */}
          <div className="flex items-center gap-3 mb-4">
            <img
              src={marketItem.imageUrl}
              alt={marketItem.name}
              className="w-12 h-12 rounded-2xl object-cover bg-charcoal-light/20 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-cream leading-snug truncate">
                {marketItem.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-cream/30 bg-white/5 px-1.5 py-0.5 rounded">
                  {marketItem.category ?? "Collectible"}
                </span>
                <span className="text-[11px] text-primary font-bold">{formatValue(price)}</span>
              </div>
            </div>
          </div>

          {/* Counterparty pill */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <img
              src={getAvatarUrl(counterparty.seed)}
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

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">

          {/* "Open to Both" — method selector */}
          {intent === "Open to Both" && offerMethod === null && (
            <div className="space-y-2.5">
              <p className="text-[11px] text-cream/30 font-semibold uppercase tracking-wider">
                How would you like to offer?
              </p>

              <button
                onClick={() => setOfferMethod("trade")}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-primary/30 hover:bg-primary/5 active:scale-[0.98] transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <ArrowLeftRight className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-cream">Trade an Item</p>
                  <p className="text-[11px] text-cream/35 mt-0.5">
                    Offer something from your collection
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-cream/20" />
              </button>

              <button
                onClick={() => setOfferMethod("cash")}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-green-500/30 hover:bg-green-500/5 active:scale-[0.98] transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-cream">Pay Cash</p>
                  <p className="text-[11px] text-cream/35 mt-0.5">Make a direct cash offer</p>
                </div>
                <ChevronRight className="w-4 h-4 text-cream/20" />
              </button>
            </div>
          )}

          {/* Trade method: inventory picker or error */}
          {effectiveMethod === "trade" &&
            (hasTradeItems ? (
              <ItemPicker
                items={pickerItems}
                selectedId={selectedItemId}
                onSelect={(id) =>
                  setSelectedItemId((prev) => (prev === id ? null : id))
                }
              />
            ) : (
              <EmptyTradeState onClose={handleClose} />
            ))}

          {/* Cash method */}
          {effectiveMethod === "cash" && (
            <CashOfferView
              price={price}
              mode={mode}
              counterpartyName={counterparty.name}
              cashAmount={cashAmount}
              onChange={setCashAmount}
            />
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        {showFooter && (
          <div className="px-5 pb-5 pt-3 border-t border-white/[0.06] flex gap-2 flex-shrink-0">
            <button
              onClick={intent === "Open to Both" && offerMethod ? handleBack : handleClose}
              className="flex items-center gap-1 px-4 py-3 rounded-2xl bg-white/[0.05] text-cream/40 font-bold text-sm hover:bg-white/10 active:scale-[0.97] transition-all"
            >
              {intent === "Open to Both" && offerMethod ? (
                <><ChevronLeft className="w-3.5 h-3.5" />Back</>
              ) : (
                "Cancel"
              )}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/20 text-primary font-bold text-sm hover:bg-primary/30 active:scale-[0.97] transition-all disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              Confirm & Send Offer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
