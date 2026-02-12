"use client";

import { useState } from "react";
import { ArrowLeftRight, Check, X, MessageSquare, DollarSign } from "lucide-react";
import { TradeOffer } from "@/lib/types";

interface TradeOfferCardProps {
  offer: TradeOffer;
  index: number;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onCounter?: (id: string) => void;
}

export default function TradeOfferCard({
  offer,
  index,
  onAccept,
  onDecline,
  onCounter,
}: TradeOfferCardProps) {
  const [action, setAction] = useState<"accepted" | "declined" | null>(null);

  const handleAccept = () => {
    setAction("accepted");
    onAccept?.(offer.id);
  };

  const handleDecline = () => {
    setAction("declined");
    onDecline?.(offer.id);
  };

  if (action) {
    return (
      <div
        className={`mx-4 mb-4 rounded-2xl border p-6 text-center animate-scale-in ${
          action === "accepted"
            ? "border-mint/30 bg-mint/10"
            : "border-red-400/30 bg-red-400/10"
        }`}
      >
        <p className={`font-bold text-lg ${action === "accepted" ? "text-mint" : "text-red-400"}`}>
          {action === "accepted" ? "Trade Accepted!" : "Trade Declined"}
        </p>
        <p className="text-cream/50 text-sm mt-1">
          {action === "accepted"
            ? `You and ${offer.from.name} will be notified`
            : `${offer.from.name} has been notified`}
        </p>
      </div>
    );
  }

  return (
    <div
      className="mx-4 mb-4 rounded-2xl border border-charcoal-light/40 bg-charcoal-dark/60 overflow-hidden card-hover animate-slide-up"
      style={{ animationDelay: `${index * 0.1}s`, animationFillMode: "both" }}
    >
      {/* Header */}
      <div className="bg-lavender/15 px-4 py-2.5 flex items-center gap-2">
        <ArrowLeftRight className="w-4 h-4 text-lavender" />
        <span className="text-sm font-bold text-lavender">New Trade Offer!</span>
      </div>

      {/* Trade content */}
      <div className="p-4">
        {/* Users and their items */}
        <div className="flex items-center gap-3">
          {/* From (other user) */}
          <div className="flex-1 flex flex-col items-center">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-lavender/20 border-2 border-lavender/40 overflow-hidden mb-2">
              <img src={offer.from.avatar} alt={offer.from.name} className="w-full h-full object-cover" />
            </div>
            <p className="text-xs text-cream/60 mb-1 font-medium">{offer.from.name}</p>

            {/* Cash badge */}
            {offer.fromCash > 0 && (
              <div className="flex items-center gap-1 bg-mint/15 text-mint rounded-full px-2 py-0.5 mb-2">
                <DollarSign className="w-3 h-3" />
                <span className="text-xs font-bold">{offer.fromCash}</span>
              </div>
            )}

            {/* Item(s) */}
            <div className="w-full space-y-2">
              {offer.fromItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl bg-charcoal/60 border border-charcoal-light/30 overflow-hidden"
                >
                  <div className="aspect-square w-full bg-charcoal-light/30 flex items-center justify-center">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-[10px] text-center text-cream/70 py-1 px-1 truncate">
                    {item.name}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Swap arrows */}
          <div className="flex flex-col items-center gap-1 px-1">
            <div className="w-10 h-10 rounded-full bg-lavender/20 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-lavender" />
            </div>
          </div>

          {/* To (current user) */}
          <div className="flex-1 flex flex-col items-center">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-mint/20 border-2 border-mint/40 overflow-hidden mb-2">
              <img src={offer.to.avatar} alt={offer.to.name} className="w-full h-full object-cover" />
            </div>
            <p className="text-xs text-cream/60 mb-1 font-medium">You</p>

            {/* Cash badge */}
            {offer.toCash > 0 && (
              <div className="flex items-center gap-1 bg-cream/15 text-cream rounded-full px-2 py-0.5 mb-2">
                <DollarSign className="w-3 h-3" />
                <span className="text-xs font-bold">{offer.toCash}</span>
              </div>
            )}

            {/* Item(s) */}
            <div className="w-full space-y-2">
              {offer.toItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl bg-charcoal/60 border border-charcoal-light/30 overflow-hidden"
                >
                  <div className="aspect-square w-full bg-charcoal-light/30 flex items-center justify-center">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-[10px] text-center text-cream/70 py-1 px-1 truncate">
                    {item.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleAccept}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-mint/20 text-mint font-bold text-sm hover:bg-mint/30 active:scale-[0.97] transition-all"
          >
            <Check className="w-4 h-4" />
            Accept
          </button>
          <button
            onClick={() => onCounter?.(offer.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-lavender/20 text-lavender font-bold text-sm hover:bg-lavender/30 active:scale-[0.97] transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            Counter
          </button>
          <button
            onClick={handleDecline}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-400/20 text-red-400 font-bold text-sm hover:bg-red-400/30 active:scale-[0.97] transition-all"
          >
            <X className="w-4 h-4" />
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
