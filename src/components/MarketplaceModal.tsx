"use client";

import { useState } from "react";
import {
  X,
  ArrowLeftRight,
  DollarSign,
  MessageCircle,
  Check,
  Star,
  TrendingUp,
  Gavel,
} from "lucide-react";
import { formatValue } from "@/lib/format";

// ── Types ────────────────────────────────────────────────────────────────────

export interface MarketplaceItem {
  name: string;
  imageUrl: string;
  marketPrice: number;
}

interface MarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MarketplaceItem | null;
}

type MarketTab = "buy" | "sell";

// ── Mock marketplace data ────────────────────────────────────────────────────
// In production these would come from a real database.

const avatar = (seed: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,ffd5dc`;

function generateListings(price: number) {
  const sellers = [
    { name: "Alex", seed: "Alex", trust: 4.5, trades: 32, condition: "Near Mint" as const, priceMult: 0.95 },
    { name: "Sam", seed: "Sam", trust: 5.0, trades: 89, condition: "Mint" as const, priceMult: 1.1 },
    { name: "Jordan", seed: "Jordan", trust: 3.9, trades: 15, condition: "Excellent" as const, priceMult: 0.85 },
    { name: "Riley", seed: "Riley", trust: 4.2, trades: 8, condition: "Played" as const, priceMult: 0.7 },
    { name: "Morgan", seed: "Morgan", trust: 4.7, trades: 56, condition: "Near Mint" as const, priceMult: 0.98 },
  ];

  const buyers = [
    { name: "Casey", seed: "Casey", trust: 4.3, trades: 22, offerMult: 0.88 },
    { name: "Drew", seed: "Drew", trust: 4.8, trades: 63, offerMult: 0.92 },
    { name: "Quinn", seed: "Quinn", trust: 3.6, trades: 5, offerMult: 0.75 },
    { name: "Avery", seed: "Avery", trust: 4.1, trades: 19, offerMult: 0.85 },
  ];

  return {
    sellers: sellers.map((s) => ({
      ...s,
      avatar: avatar(s.seed),
      askingPrice: Math.round(price * s.priceMult),
    })),
    buyers: buyers.map((b) => ({
      ...b,
      avatar: avatar(b.seed),
      offerPrice: Math.round(price * b.offerMult),
    })),
  };
}

// ── Condition badge color ────────────────────────────────────────────────────

function conditionColor(c: string): string {
  switch (c) {
    case "Mint": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    case "Near Mint": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    case "Excellent": return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
    case "Played": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case "Damaged": return "text-red-400 bg-red-500/10 border-red-500/20";
    default: return "text-cream/40 bg-white/5 border-white/10";
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ██  MARKETPLACE MODAL  ██████████████████████████████████████████████████████
// ═════════════════════════════════════════════════════════════════════════════

export default function MarketplaceModal({ isOpen, onClose, item }: MarketplaceModalProps) {
  const [activeTab, setActiveTab] = useState<MarketTab>("buy");
  const [showBidForm, setShowBidForm] = useState(false);
  const [bidPrice, setBidPrice] = useState("");
  const [bidSubmitted, setBidSubmitted] = useState(false);

  if (!isOpen || !item) return null;

  const { sellers, buyers } = generateListings(item.marketPrice || 100);

  const handleSubmitBid = () => {
    if (!bidPrice) return;
    setBidSubmitted(true);
    setTimeout(() => {
      setBidSubmitted(false);
      setShowBidForm(false);
      setBidPrice("");
    }, 2000);
  };

  const handleClose = () => {
    setShowBidForm(false);
    setBidSubmitted(false);
    setBidPrice("");
    setActiveTab("buy");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-charcoal-dark rounded-3xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up">
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-4.5 h-4.5 text-white/80" />
        </button>

        {/* ── Header: Card Info ───────────────────────────────────── */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-4">
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-16 h-16 rounded-2xl object-cover bg-charcoal-light/20 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-cream truncate">{item.name}</h2>
              {item.marketPrice > 0 && (
                <div className="flex items-center gap-1.5 mt-1">
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-sm font-bold text-green-400">{formatValue(item.marketPrice)}</span>
                  <span className="text-[10px] text-cream/25 ml-0.5">market price</span>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab("buy")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "buy"
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-background-light text-cream/35 hover:text-cream/50"
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              Buy / Trade For
            </button>
            <button
              onClick={() => setActiveTab("sell")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "sell"
                  ? "bg-green-500/15 text-green-400 border border-green-500/25"
                  : "bg-background-light text-cream/35 hover:text-cream/50"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              Sell / Offers
            </button>
          </div>
        </div>

        {/* ── Scrollable list ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-3">
          {activeTab === "buy" ? (
            <>
              <p className="text-[11px] text-cream/25 font-semibold uppercase tracking-wider mb-1">
                Users who have this item ({sellers.length})
              </p>
              {sellers.map((s) => (
                <div
                  key={s.seed}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-background-light/70 border border-white/[0.04] hover:border-white/[0.08] transition-colors"
                >
                  {/* Avatar */}
                  <img
                    src={s.avatar}
                    alt={s.name}
                    className="w-10 h-10 rounded-full border-2 border-charcoal-dark bg-charcoal-light/20 flex-shrink-0"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-cream">{s.name}</span>
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-[10px] text-cream/40 font-semibold">{s.trust}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${conditionColor(s.condition)}`}>
                        {s.condition}
                      </span>
                      <span className="text-[10px] text-cream/20">{s.trades} trades</span>
                    </div>
                  </div>

                  {/* Price + action */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-primary">{formatValue(s.askingPrice)}</p>
                    <button className="mt-1.5 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface/15 text-surface-light text-[10px] font-bold hover:bg-surface/25 active:scale-[0.97] transition-all">
                      <MessageCircle className="w-3 h-3" />
                      Message
                    </button>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <p className="text-[11px] text-cream/25 font-semibold uppercase tracking-wider mb-1">
                Users who want this item ({buyers.length})
              </p>
              {buyers.map((b) => (
                <div
                  key={b.seed}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-background-light/70 border border-white/[0.04] hover:border-white/[0.08] transition-colors"
                >
                  {/* Avatar */}
                  <img
                    src={b.avatar}
                    alt={b.name}
                    className="w-10 h-10 rounded-full border-2 border-charcoal-dark bg-charcoal-light/20 flex-shrink-0"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-cream">{b.name}</span>
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-[10px] text-cream/40 font-semibold">{b.trust}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-cream/20">{b.trades} trades</span>
                  </div>

                  {/* Offer + accept */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-green-400">{formatValue(b.offerPrice)}</p>
                    <button className="mt-1.5 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-500/15 text-green-400 text-[10px] font-bold hover:bg-green-500/25 active:scale-[0.97] transition-all">
                      <Check className="w-3 h-3" />
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ── Sticky bottom: Place Bid ─────────────────────────────── */}
        <div className="px-5 pb-5 pt-3 border-t border-white/[0.06] flex-shrink-0">
          {showBidForm ? (
            <div className="space-y-3 animate-slide-up">
              <p className="text-xs font-bold text-cream/60">Set your offer price</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cream/30 text-sm font-semibold">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={bidPrice}
                  onChange={(e) => setBidPrice(e.target.value)}
                  placeholder={String(Math.round((item.marketPrice || 100) * 0.9))}
                  className="w-full pl-8 pr-4 py-3 rounded-2xl bg-background-light text-cream placeholder:text-cream/25 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowBidForm(false); setBidPrice(""); }}
                  className="px-5 py-3 rounded-2xl bg-background-light text-cream/40 font-bold text-sm hover:bg-charcoal-light/50 active:scale-[0.97] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitBid}
                  disabled={!bidPrice || bidSubmitted}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/20 text-primary font-bold text-sm hover:bg-primary/30 active:scale-[0.97] transition-all disabled:opacity-40"
                >
                  {bidSubmitted ? (
                    <>
                      <Check className="w-4 h-4" />
                      Bid Placed!
                    </>
                  ) : (
                    <>
                      <Gavel className="w-4 h-4" />
                      Submit Bid
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowBidForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-primary/25 to-surface/20 text-primary font-bold text-sm hover:from-primary/35 hover:to-surface/30 active:scale-[0.98] transition-all border border-primary/20"
            >
              <Gavel className="w-4.5 h-4.5" />
              Place Bid / I Want This
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
