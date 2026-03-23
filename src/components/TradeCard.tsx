"use client";

import { useState } from "react";
import {
  ArrowLeftRight, Check, Clock, X,
  DollarSign, Pencil, PackageCheck, MessageSquare,
} from "lucide-react";
import type { TradeHistoryEntry } from "@/lib/types";
import { formatValue } from "@/lib/format";
import EquityBar from "./EquityBar";
import { useInventory } from "@/lib/InventoryContext";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface TradeCardProps {
  trade: TradeHistoryEntry;
  index?: number;
  // Action callbacks — omitting a prop hides the button
  onAccept?:     () => void;  // Incoming pending offer: Accept
  onCancel?:     () => void;  // Pending: Cancel / Decline
  onCounter?:    () => void;  // Pending: Counter offer
  onMessage?:    () => void;  // Subtle icon in status bar (not in button row)
  onComplete?:   () => void;  // Accepted & awaiting fulfillment: Complete Trade
  onRemove?:     () => void;  // Declined: Remove from history
  // Ownership guard — disables Accept/Complete and shows a warning
  itemsMissing?: boolean;
  // Navigation callbacks
  onPartyClick?: (name: string) => void;
  onClick?:      () => void;
}

// ── Side column (From / To) ───────────────────────────────────────────────────

function TradeSide({
  party,
  items,
  cash,
  avatarRing,
  onPartyClick,
}: {
  party: { name: string; avatar: string };
  items: TradeHistoryEntry["fromItems"];
  cash: number;
  avatarRing: string;
  onPartyClick?: () => void;
}) {
  const cashOnly        = items.length === 0 && cash > 0;
  const hasItemsAndCash = items.length > 0  && cash > 0;

  return (
    <div className="flex flex-col">
      {/* Avatar + name */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={onPartyClick}
          disabled={!onPartyClick}
          className={`flex items-center gap-2 min-w-0 ${onPartyClick ? "hover:opacity-75 transition-opacity active:scale-95" : "cursor-default"}`}
        >
          <div className={`w-7 h-7 rounded-full overflow-hidden flex-shrink-0 ${avatarRing}`}>
            <img src={party.avatar} alt={party.name} className="w-full h-full object-cover" />
          </div>
          <span className="text-xs text-cream/50 font-medium truncate">{party.name}</span>
        </button>
      </div>

      {/* Items / Cash area */}
      <div className="flex-1 flex flex-col gap-1.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 bg-charcoal-dark/40 rounded-xl p-2">
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-charcoal-light/20 flex-shrink-0">
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-cream/60 line-clamp-2 leading-snug font-medium">{item.name}</p>
              {item.estimatedValue != null && (
                <p className="text-[9px] text-primary/60 font-semibold">{formatValue(item.estimatedValue)}</p>
              )}
            </div>
          </div>
        ))}

        {/* Cash-only block */}
        {cashOnly && (
          <div className="flex-1 flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/20">
            <span className="text-xl leading-none">💰</span>
            <div>
              <p className="text-[9px] text-emerald-400/60 font-bold uppercase tracking-wider leading-none mb-0.5">Cash Offer</p>
              <p className="text-sm font-extrabold text-emerald-400 leading-none">{formatValue(cash)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Cash bonus chip */}
      {hasItemsAndCash && (
        <div className="flex items-center gap-1 mt-2 text-primary">
          <DollarSign className="w-3 h-3" />
          <span className="text-xs font-bold">+{formatValue(cash)}</span>
        </div>
      )}
    </div>
  );
}

// ── TradeCard ─────────────────────────────────────────────────────────────────

export default function TradeCard({
  trade,
  index = 0,
  onAccept,
  onCancel,
  onCounter,
  onMessage,
  onComplete,
  onRemove,
  itemsMissing = false,
  onPartyClick,
  onClick,
}: TradeCardProps) {
  const { items, unlockItems, showToast } = useInventory();
  const [isCanceling,  setIsCanceling]  = useState(false);
  const [isDismissed,  setIsDismissed]  = useState(false);

  if (isDismissed) return null;

  const isPending   = trade.status === "pending";
  const isAccepted  = trade.status === "accepted";
  const isMyOffer   = trade.from.name === "You" || trade.from.name === "Collector";
  const counterLabel = isMyOffer ? "Edit Offer" : "Counter";
  const isCompleted = isAccepted && !!trade.completedAt;
  const isAwaiting  = isAccepted && !isCompleted;  // accepted, not yet exchanged
  const isDeclined  = trade.status === "declined";

  const dateStr = trade.completedAt ?? trade.createdAt;
  const formattedDate = new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  const offeredValue = trade.fromItems.reduce((s, i) => s + (i.estimatedValue ?? 0), 0) + trade.fromCash;
  const askingValue  = trade.toItems.reduce((s, i)   => s + (i.estimatedValue ?? 0), 0) + trade.toCash;

  const statusLabel = isPending   ? "Pending Response"
                    : isCompleted ? "Completed"
                    : isAwaiting  ? "Awaiting Fulfillment"
                    : "Declined";

  const statusColour = isPending   ? "text-amber-400"
                     : isDeclined  ? "text-red-400"
                     : isCompleted ? "text-primary"
                     : "text-surface";            // awaiting = lilac

  const statusBg     = isPending   ? "bg-amber-500/[0.08]"
                     : isDeclined  ? "bg-red-400/[0.08]"
                     : isCompleted ? "bg-primary/[0.08]"
                     : "bg-surface/[0.06]";         // awaiting

  const StatusIcon   = isPending   ? Clock
                     : isCompleted ? Check
                     : isAwaiting  ? PackageCheck
                     : X;

  // When Accept button is present, relabel "Cancel" → "Decline" (incoming offer context)
  const cancelLabel = onAccept ? "Decline" : "Cancel";

  // ── Cancel flow ──────────────────────────────────────────────────────────
  const handleCancelClick = () => {
    // Incoming offer (Decline) — fire directly, no confirmation needed
    if (onAccept) { onCancel?.(); return; }
    // Outgoing offer (Cancel) — show inline confirmation
    setIsCanceling(true);
  };

  const handleConfirmCancel = () => {
    // Unlock offered items by name-based ID lookup (matches pattern used across codebase)
    const myItems = isMyOffer ? trade.fromItems : trade.toItems;
    const realIds = myItems
      .map((t) => items.find((i) => i.name === t.name)?.id)
      .filter((id): id is string => !!id);
    if (realIds.length > 0) unlockItems(realIds);
    showToast("Trade offer cancelled.");
    onCancel?.();
    setIsDismissed(true);
  };

  return (
    <div
      className={`rounded-2xl bg-background-light shadow-soft overflow-hidden animate-slide-up ${
        onClick ? "cursor-pointer active:scale-[0.99] transition-transform" : ""
      }`}
      style={{ animationDelay: `${index * 0.07}s`, animationFillMode: "both" }}
      onClick={onClick}
    >
      {/* ── Status bar — Message icon lives here ── */}
      <div className={`px-4 py-2.5 flex items-center justify-between gap-2 ${statusBg}`}>
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon className={`w-4 h-4 flex-shrink-0 ${statusColour}`} />
          <span className={`text-sm font-bold truncate ${statusColour}`}>{statusLabel}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Subtle message icon — only for pending trades, removed from button row */}
          {onMessage && isPending && (
            <button
              onClick={(e) => { e.stopPropagation(); onMessage(); }}
              className="w-7 h-7 rounded-xl bg-white/[0.07] flex items-center justify-center hover:bg-white/[0.14] active:scale-95 transition-all"
              title="Send a message"
              aria-label="Message"
            >
              <MessageSquare className="w-3.5 h-3.5 text-cream/50" />
            </button>
          )}
          <span className="text-xs text-cream/30 whitespace-nowrap">{formattedDate}</span>
        </div>
      </div>

      {/* ── Trade body ── */}
      <div className="p-5 pb-3">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
          <TradeSide
            party={trade.from}
            items={trade.fromItems}
            cash={trade.fromCash}
            avatarRing="bg-surface/20"
            onPartyClick={onPartyClick ? () => onPartyClick(trade.from.name) : undefined}
          />
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center flex-shrink-0">
              <ArrowLeftRight className="w-4 h-4 text-cream/30" />
            </div>
          </div>
          <TradeSide
            party={trade.to}
            items={trade.toItems}
            cash={trade.toCash}
            avatarRing="bg-primary/20"
            onPartyClick={onPartyClick ? () => onPartyClick(trade.to.name) : undefined}
          />
        </div>
      </div>

      {/* ── Equity Bar ── */}
      <div className="px-5 pb-4">
        <EquityBar offered={offeredValue} asking={askingValue} />
      </div>

      {/* ── Optional message quote ── */}
      {trade.message && (
        <div className="px-5 pb-4">
          <div className="flex items-start gap-2 px-3.5 py-3 rounded-2xl bg-surface/[0.08] border border-surface/15">
            <MessageSquare className="w-3.5 h-3.5 text-surface-light/50 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-cream/60 leading-relaxed italic">&ldquo;{trade.message}&rdquo;</p>
          </div>
        </div>
      )}

      {/* ── Pending actions: max 3 buttons (Message moved to status bar) ── */}
      {isPending && (onAccept || onCancel || onCounter) && (
        <div className="px-5 pb-5 space-y-2">
          {itemsMissing && (
            <p className="text-[11px] text-red-400/90 font-semibold text-center">
              ⚠ Piece no longer in your vault
            </p>
          )}

          {/* ── Cancel confirmation (outgoing offers only) ── */}
          {isCanceling ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-between px-4 py-3 rounded-2xl bg-red-400/[0.06] border border-red-400/15 animate-slide-up"
            >
              <p className="text-xs text-cream/50 font-medium">Cancel this offer?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsCanceling(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.06] text-cream/40 text-xs font-bold hover:bg-white/10 active:scale-95 transition-all"
                >
                  No
                </button>
                <button
                  onClick={handleConfirmCancel}
                  className="px-3 py-1.5 rounded-xl bg-red-400/20 text-red-400 text-xs font-bold hover:bg-red-400/30 active:scale-95 transition-all"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {onAccept && (
                <button
                  onClick={(e) => { e.stopPropagation(); if (!itemsMissing) onAccept(); }}
                  disabled={itemsMissing}
                  aria-disabled={itemsMissing || undefined}
                  className={`flex-1 min-w-0 flex items-center justify-center gap-1 py-2.5 rounded-2xl bg-primary/15 text-primary text-xs font-bold hover:bg-primary/25 active:scale-[0.97] transition-all border border-primary/20 ${itemsMissing ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <Check className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Accept</span>
                </button>
              )}
              {onCancel && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleCancelClick(); }}
                  className="flex-1 min-w-0 py-2.5 rounded-2xl bg-red-400/10 text-red-400 text-xs font-bold hover:bg-red-400/20 active:scale-[0.97] transition-all border border-red-400/20 truncate"
                >
                  {cancelLabel}
                </button>
              )}
              {onCounter && (
                <button
                  onClick={(e) => { e.stopPropagation(); if (!itemsMissing) onCounter(); }}
                  disabled={itemsMissing}
                  aria-disabled={itemsMissing || undefined}
                  className={`flex-1 min-w-0 flex items-center justify-center gap-1 py-2.5 rounded-2xl bg-white/[0.06] text-cream/50 text-xs font-bold hover:bg-white/10 active:scale-[0.97] transition-all border border-white/[0.08] ${itemsMissing ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <Pencil className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{counterLabel}</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Awaiting fulfillment: single "Complete Trade" CTA ── */}
      {isAwaiting && onComplete && (
        <div className="px-5 pb-5">
          {itemsMissing && (
            <p className="text-[11px] text-red-400/90 font-semibold text-center mb-2">
              ⚠ Piece no longer in your vault
            </p>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); if (!itemsMissing) onComplete(); }}
            disabled={itemsMissing}
            aria-disabled={itemsMissing || undefined}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-surface/15 text-surface font-bold text-sm hover:bg-surface/25 active:scale-[0.97] transition-all border border-surface/25 ${itemsMissing ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <PackageCheck className="w-4 h-4" />
            Complete Trade
          </button>
          {!itemsMissing && (
            <p className="text-center text-[10px] text-cream/25 mt-2">
              This will update your vault with the exchanged pieces.
            </p>
          )}
        </div>
      )}

      {/* ── Declined: remove ── */}
      {isDeclined && onRemove && (
        <div className="px-5 pb-5">
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="w-full py-2.5 rounded-2xl bg-white/[0.04] text-cream/25 text-xs font-semibold hover:bg-white/[0.07] active:scale-[0.97] transition-all"
          >
            Remove from History
          </button>
        </div>
      )}
    </div>
  );
}
