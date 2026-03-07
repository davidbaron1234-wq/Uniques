"use client";

import { useState, useMemo } from "react";
import { ArrowLeftRight, Check, X, MessageSquare, DollarSign } from "lucide-react";
import { TradeOffer } from "@/lib/types";
import { formatValue } from "@/lib/format";
import EquityBar from "./EquityBar";

interface TradeOfferCardProps {
  offer: TradeOffer;
  index: number;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onCounter?: (id: string) => void;
}

// ── Side column shared by both From and To ────────────────────────────────────

function TradeSide({
  avatar,
  name,
  items,
  cash,
  total,
  avatarRing,
}: {
  avatar: string;
  name: string;
  items: TradeOffer["fromItems"];
  cash: number;
  total: number;
  avatarRing: string;
}) {
  const cashOnly = items.length === 0 && cash > 0;
  const hasItemsAndCash = items.length > 0 && cash > 0;

  return (
    <div className="flex flex-col items-center">
      {/* Avatar */}
      <div className={`w-11 h-11 rounded-full overflow-hidden mb-2 border-2 ${avatarRing}`}>
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      </div>

      {/* Name */}
      <p className="text-xs text-cream/50 mb-2 font-semibold">{name}</p>

      {/* Items / Cash area — flex-1 ensures both sides grow to the same height */}
      <div className="w-full flex-1 flex flex-col gap-2">
        {/* Item thumbnails */}
        {items.map((item) => (
          <div key={item.id} className="rounded-xl bg-charcoal-dark/60 overflow-hidden shadow-soft">
            <div className="aspect-square w-full overflow-hidden">
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            </div>
            <p className="text-[10px] text-center text-cream/60 py-1.5 px-1 line-clamp-2 leading-snug font-medium">
              {item.name}
            </p>
          </div>
        ))}

        {/* Cash chip — only when items also present */}
        {hasItemsAndCash && (
          <div className="flex items-center justify-center gap-1 bg-primary/15 text-primary rounded-full px-2.5 py-1">
            <DollarSign className="w-3 h-3" />
            <span className="text-xs font-bold">+{formatValue(cash)}</span>
          </div>
        )}

        {/* Cash-only block — stretches to fill the same height as the item side */}
        {cashOnly && (
          <div className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/20 min-h-[5rem]">
            <span className="text-2xl leading-none">💰</span>
            <p className="text-[9px] text-emerald-400/60 font-bold uppercase tracking-wider text-center leading-none">
              Cash Only
            </p>
            <p className="text-base font-extrabold text-emerald-400 leading-none">{formatValue(cash)}</p>
          </div>
        )}
      </div>

      {/* Total value */}
      <p className="text-[10px] text-cream/30 mt-2 font-medium">{formatValue(total)}</p>
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────

export default function TradeOfferCard({
  offer,
  index,
  onAccept,
  onDecline,
  onCounter,
}: TradeOfferCardProps) {
  const [action, setAction] = useState<"accepted" | "declined" | null>(null);

  const fromTotal = useMemo(
    () => offer.fromItems.reduce((s, i) => s + (i.estimatedValue || 0), 0) + offer.fromCash,
    [offer]
  );
  const toTotal = useMemo(
    () => offer.toItems.reduce((s, i) => s + (i.estimatedValue || 0), 0) + offer.toCash,
    [offer]
  );

  const handleAccept  = () => { setAction("accepted");  onAccept?.(offer.id); };
  const handleDecline = () => { setAction("declined"); onDecline?.(offer.id); };

  if (action) {
    return (
      <div
        className={`mx-5 mb-4 rounded-2xl p-6 text-center animate-scale-in shadow-soft ${
          action === "accepted" ? "bg-primary/10" : "bg-red-400/10"
        }`}
      >
        <p className={`font-bold text-lg ${action === "accepted" ? "text-primary" : "text-red-400"}`}>
          {action === "accepted" ? "Trade Accepted!" : "Trade Declined"}
        </p>
        <p className="text-cream/40 text-sm mt-1">
          {action === "accepted"
            ? `You and ${offer.from.name} will be notified`
            : `${offer.from.name} has been notified`}
        </p>
      </div>
    );
  }

  return (
    <div
      className="mx-5 mb-4 rounded-2xl bg-background-light shadow-soft overflow-hidden card-hover animate-slide-up"
      style={{ animationDelay: `${index * 0.1}s`, animationFillMode: "both" }}
    >
      {/* Header */}
      <div className="bg-surface/10 px-5 py-3 flex items-center gap-2">
        <ArrowLeftRight className="w-4 h-4 text-surface-light" />
        <span className="text-sm font-bold text-surface-light">New Trade Offer!</span>
      </div>

      <div className="p-5">
        {/* ── Grid: From | Arrow | To — items-stretch makes both sides equal height ── */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
          {/* From side */}
          <TradeSide
            avatar={offer.from.avatar}
            name={offer.from.name}
            items={offer.fromItems}
            cash={offer.fromCash}
            total={fromTotal}
            avatarRing="border-surface/30 bg-surface/20"
          />

          {/* Centre arrow */}
          <div className="flex flex-col items-center justify-center gap-2 px-1">
            <div className="w-10 h-10 rounded-full bg-surface/15 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-surface-light" />
            </div>
          </div>

          {/* To side (the user) */}
          <TradeSide
            avatar={offer.to.avatar}
            name="You"
            items={offer.toItems}
            cash={offer.toCash}
            total={toTotal}
            avatarRing="border-primary/30 bg-primary/20"
          />
        </div>

        {/* ── Equity Bar ── */}
        <div className="mt-4">
          <EquityBar offered={fromTotal} asking={toTotal} />
        </div>

        {/* ── Action buttons ── */}
        <div className="flex gap-2.5 mt-4">
          <button
            onClick={handleAccept}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-primary/15 text-primary font-bold text-sm hover:bg-primary/25 active:scale-[0.97] transition-all"
          >
            <Check className="w-4 h-4" />
            Accept
          </button>
          <button
            onClick={() => onCounter?.(offer.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-surface/15 text-surface-light font-bold text-sm hover:bg-surface/25 active:scale-[0.97] transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            Counter
          </button>
          <button
            onClick={handleDecline}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-red-400/15 text-red-400 font-bold text-sm hover:bg-red-400/25 active:scale-[0.97] transition-all"
          >
            <X className="w-4 h-4" />
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
