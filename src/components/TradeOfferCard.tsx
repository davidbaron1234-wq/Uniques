"use client";

import { useState, useMemo } from "react";
import { ArrowLeftRight, Check, X, MessageSquare, DollarSign, AlertTriangle, ShieldCheck } from "lucide-react";
import { TradeOffer } from "@/lib/types";
import { formatValue } from "@/lib/format";

interface TradeOfferCardProps {
  offer: TradeOffer;
  index: number;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onCounter?: (id: string) => void;
}

type FairnessLevel = "fair" | "close" | "unfair";

function getFairness(fromTotal: number, toTotal: number): { level: FairnessLevel; pct: number } {
  if (fromTotal === 0 && toTotal === 0) return { level: "fair", pct: 50 };
  const max = Math.max(fromTotal, toTotal);
  const diff = Math.abs(fromTotal - toTotal) / max;
  const pct = max > 0 ? (fromTotal / (fromTotal + toTotal)) * 100 : 50;
  if (diff <= 0.1) return { level: "fair", pct };
  if (diff <= 0.2) return { level: "close", pct };
  return { level: "unfair", pct };
}

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
  const fairness = useMemo(() => getFairness(fromTotal, toTotal), [fromTotal, toTotal]);

  const handleAccept = () => { setAction("accepted"); onAccept?.(offer.id); };
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

  const barColor =
    fairness.level === "fair"
      ? "bg-green-400"
      : fairness.level === "close"
      ? "bg-yellow-400"
      : "bg-red-400";

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
        {/* Users + Items */}
        <div className="flex items-start gap-3">
          {/* From */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-11 h-11 rounded-full bg-surface/20 border-2 border-surface/30 overflow-hidden mb-2">
              <img src={offer.from.avatar} alt={offer.from.name} className="w-full h-full object-cover" />
            </div>
            <p className="text-xs text-cream/50 mb-1 font-semibold">{offer.from.name}</p>
            {offer.fromCash > 0 && (
              <div className="flex items-center gap-1 bg-primary/15 text-primary rounded-full px-2.5 py-0.5 mb-2">
                <DollarSign className="w-3 h-3" />
                <span className="text-xs font-bold">{offer.fromCash.toLocaleString()}</span>
              </div>
            )}
            <div className="w-full space-y-2">
              {offer.fromItems.map((item) => (
                <div key={item.id} className="rounded-xl bg-charcoal-dark/60 overflow-hidden shadow-soft">
                  <div className="aspect-square w-full overflow-hidden">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-[10px] text-center text-cream/60 py-1.5 px-1 truncate font-medium">{item.name}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-cream/30 mt-2 font-medium">{formatValue(fromTotal)}</p>
          </div>

          {/* Center: swap + fairness */}
          <div className="flex flex-col items-center gap-2 pt-8 px-1">
            <div className="w-10 h-10 rounded-full bg-surface/15 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-surface-light" />
            </div>
          </div>

          {/* To */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-11 h-11 rounded-full bg-primary/20 border-2 border-primary/30 overflow-hidden mb-2">
              <img src={offer.to.avatar} alt={offer.to.name} className="w-full h-full object-cover" />
            </div>
            <p className="text-xs text-cream/50 mb-1 font-semibold">You</p>
            {offer.toCash > 0 && (
              <div className="flex items-center gap-1 bg-cream/10 text-cream rounded-full px-2.5 py-0.5 mb-2">
                <DollarSign className="w-3 h-3" />
                <span className="text-xs font-bold">{offer.toCash.toLocaleString()}</span>
              </div>
            )}
            <div className="w-full space-y-2">
              {offer.toItems.map((item) => (
                <div key={item.id} className="rounded-xl bg-charcoal-dark/60 overflow-hidden shadow-soft">
                  <div className="aspect-square w-full overflow-hidden">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-[10px] text-center text-cream/60 py-1.5 px-1 truncate font-medium">{item.name}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-cream/30 mt-2 font-medium">{formatValue(toTotal)}</p>
          </div>
        </div>

        {/* ── Fairness Meter ───────────────────────────── */}
        <div className="mt-4 px-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-cream/30 font-medium">Their side</span>
            <div className="flex items-center gap-1">
              {fairness.level === "fair" && <ShieldCheck className="w-3.5 h-3.5 text-green-400" />}
              {fairness.level === "unfair" && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
              <span
                className={`text-[10px] font-bold ${
                  fairness.level === "fair"
                    ? "text-green-400"
                    : fairness.level === "close"
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {fairness.level === "fair" ? "Fair Trade" : fairness.level === "close" ? "Close" : "Value Discrepancy"}
              </span>
            </div>
            <span className="text-[10px] text-cream/30 font-medium">Your side</span>
          </div>
          <div className="h-2 rounded-full bg-charcoal-dark/60 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${Math.max(5, Math.min(95, fairness.pct))}%` }}
            />
          </div>
        </div>

        {/* Buttons */}
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
