"use client";

import { useState, useMemo } from "react";
import {
  X,
  Send,
  PackageOpen,
  DollarSign,
  Star,
} from "lucide-react";
import { useInventory } from "@/lib/InventoryContext";
import { useNotifications } from "@/lib/NotificationContext";
import { formatValue } from "@/lib/format";
import type { MarketplaceItem, MockSeller, MockBuyer } from "./MarketplaceModal";
import type { TradeHistoryEntry } from "@/lib/types";
import { currentUser } from "@/lib/data";
import EquityBar from "./EquityBar";
import { PowerPicker } from "@/components/PowerPicker";
import type { PowerPickerItem } from "@/components/PowerPicker";

// ── Types ──────────────────────────────────────────────────────────────────

type OfferMode = "buy" | "accept";

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

// ── Main component ─────────────────────────────────────────────────────────

export default function TradeOfferModal({
  isOpen,
  onClose,
  marketItem,
  counterparty,
  mode,
}: TradeOfferModalProps) {
  const { items, lockItems, showToast, addTradeHistory } = useInventory();
  const { addNotification } = useNotifications();

  // ── All hooks above early return ──────────────────────────────────────
  const [selectedIds,     setSelectedIds]     = useState<Set<string>>(new Set());
  const [cashAmount,      setCashAmount]      = useState("");
  const [theirCashOffer,  setTheirCashOffer]  = useState(0);

  // All non-locked items are available to offer
  const availableItems = useMemo(
    () => items.filter((i) => !i.isLocked),
    [items]
  );

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
  const canConfirm  = selectedIds.size > 0 || cashValue > 0;

  // ── Handlers ─────────────────────────────────────────────────────────
  const toggleItem = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const resetAndClose = () => {
    setSelectedIds(new Set());
    setCashAmount("");
    setTheirCashOffer(0);
    onClose();
  };

  const handleConfirm = () => {
    if (selectedIds.size > 0) {
      const note = `Offer sent to ${counterparty.name} for "${marketItem.name}"`;
      lockItems(Array.from(selectedIds), note, "sent");
    }

    // Persist trade to global history so it appears in Trade History / Awaiting Others
    const entry: TradeHistoryEntry = {
      id:        `trade-${Date.now()}`,
      from:      { name: currentUser.name,    avatar: currentUser.avatar },
      to:        { name: counterparty.name,   avatar: avatarUrl(counterparty.seed) },
      fromItems: selectedItems.map((i) => ({
        id:             i.id,
        name:           i.name,
        imageUrl:       (i as { customImage?: string }).customImage ?? i.imageUrl,
        estimatedValue: i.estimatedValue,
      })),
      fromCash: cashValue,
      toItems: [{
        id:             marketItem.id,
        name:           marketItem.name,
        imageUrl:       marketItem.imageUrl,
        estimatedValue: marketItem.marketPrice,
      }],
      toCash:    theirCashOffer,
      status:    "pending",
      createdAt: new Date().toISOString(),
    };
    addTradeHistory(entry);

    const payload = {
      targetUser:     counterparty.name.toLowerCase(),
      offeredItems:   selectedItems.map((i) => ({ name: i.name, imageUrl: (i as { customImage?: string }).customImage ?? i.imageUrl })),
      requestedItems: [{ name: marketItem.name, imageUrl: marketItem.imageUrl }],
      cashOffer:      cashValue,
      theirCashOffer,
    };
    try { sessionStorage.setItem("injected_trade", JSON.stringify(payload)); } catch { /* quota */ }
    addNotification({
      id:      Date.now().toString(),
      type:    "trade",
      message: `🤝 Trade Offer successfully sent to ${counterparty.name}!`,
      time:    "Just now",
      isRead:  false,
      href:    "/?tab=history",
    });
    showToast(`Offer sent to ${counterparty.name}!`);
    resetAndClose();
  };

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

        {/* ══ SCROLLABLE BODY ══════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto overscroll-contain">

          {/* ── Your Offer: PowerPicker ── */}
          <div className="px-4 pt-4 pb-2">
            <p className="text-[11px] text-cream/30 font-semibold uppercase tracking-wider mb-3">
              Your Offer · select items
            </p>

            {availableItems.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3">
                  <PackageOpen className="w-7 h-7 text-cream/20" />
                </div>
                <p className="text-sm font-bold text-cream/40 mb-1">No items available</p>
                <p className="text-xs text-cream/25 leading-relaxed max-w-[200px]">
                  Add items to your inventory to include them here
                </p>
              </div>
            ) : (
              <PowerPicker
                items={availableItems as PowerPickerItem[]}
                mode="multi"
                selectedIds={selectedIds}
                onToggle={toggleItem}
              />
            )}
          </div>

          {/* ── Cash add-on (green = I add cash) ── */}
          <div className="px-4 pb-2 pt-2">
            <p className="text-[9px] text-cream/20 font-bold uppercase tracking-wider mb-1.5">
              + Add cash to sweeten
            </p>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-green-400/40 pointer-events-none" />
              <input
                type="number"
                min="0"
                step="1"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-9 pr-24 py-2 rounded-xl bg-green-400/[0.04] border border-green-400/[0.12] text-cream text-sm placeholder:text-cream/20 focus:outline-none focus:ring-2 focus:ring-green-400/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {cashValue > 0 ? (
                <span className="absolute top-1/2 -translate-y-1/2 right-3 text-xs font-bold text-green-400">
                  {formatValue(cashValue)}
                </span>
              ) : (
                <span className="absolute top-1/2 -translate-y-1/2 right-3 text-[10px] text-cream/20 font-medium">
                  optional
                </span>
              )}
            </div>
          </div>

          {/* ── Request cash (amber = they add cash) ── */}
          <div className="px-4 pb-4 pt-1">
            <p className="text-[9px] text-cream/20 font-bold uppercase tracking-wider mb-1.5">
              + Request cash from {counterparty.name}
            </p>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-400/40 pointer-events-none" />
              <input
                type="number"
                min="0"
                step="1"
                value={theirCashOffer || ""}
                onChange={(e) => setTheirCashOffer(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                placeholder="0"
                className="w-full pl-9 pr-24 py-2 rounded-xl bg-amber-400/[0.04] border border-amber-400/[0.12] text-cream text-sm placeholder:text-cream/20 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {theirCashOffer > 0 ? (
                <span className="absolute top-1/2 -translate-y-1/2 right-3 text-xs font-bold text-amber-400">
                  {formatValue(theirCashOffer)}
                </span>
              ) : (
                <span className="absolute top-1/2 -translate-y-1/2 right-3 text-[10px] text-cream/20 font-medium">
                  optional
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ══ FOOTER: Live calculator + actions ════════════════════════ */}
        <div className="px-4 pb-5 pt-3 border-t border-white/[0.06] flex-shrink-0 space-y-3">

          {/* Live trade equity */}
          {canConfirm ? (
            <div className="space-y-1.5">
              <EquityBar offered={totalOffer} asking={targetPrice + theirCashOffer} />
              <div className="flex items-center gap-1.5 text-[11px] text-cream/30 px-1">
                <span className="font-semibold text-cream/50">{formatValue(totalOffer)}</span>
                <span>vs</span>
                <span>{formatValue(targetPrice + theirCashOffer)} asking</span>
                {totalOffer > targetPrice + theirCashOffer && (
                  <span className="text-green-400 font-semibold">(+{formatValue(totalOffer - targetPrice - theirCashOffer)})</span>
                )}
                {totalOffer < targetPrice + theirCashOffer && (
                  <span>(−{formatValue(targetPrice + theirCashOffer - totalOffer)})</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-cream/20 text-center py-1">
              Select items or add cash to see trade equity
            </p>
          )}

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
