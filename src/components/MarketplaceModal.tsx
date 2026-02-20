"use client";

import { useState, useMemo } from "react";
import {
  X,
  ArrowLeftRight,
  DollarSign,
  MessageCircle,
  Check,
  Star,
  TrendingUp,
  Gavel,
  Truck,
  Handshake,
  MapPin,
  Globe,
  CreditCard,
  Award,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import { formatValue } from "@/lib/format";
import type { Category } from "@/lib/constants";

// ── Public types ────────────────────────────────────────────────────────────

export interface MarketplaceItem {
  name: string;
  imageUrl: string;
  marketPrice: number;
  category?: Category | string;
}

interface MarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MarketplaceItem | null;
}

type MarketTab = "buy" | "sell";
type SortMode = "price" | "trust";
type TradeIntent = "Cash Only" | "Trade Only" | "Open to Both";
type Logistics = "Local Meetup" | "Ships Worldwide" | "PayPal G&S";

// ── Category → condition mapping (mirrors ItemConfigForm) ───────────────────

const CATEGORY_CONDITIONS: Record<string, string[]> = {
  "Pokémon TCG":  ["PSA 10", "PSA 9", "Near Mint", "Lightly Played", "Played", "Damaged"],
  "Sports Cards": ["PSA 10", "PSA 9", "BGS 9.5", "Near Mint", "Played"],
  "Other TCG":    ["Mint", "Near Mint", "Lightly Played", "Played", "Damaged"],
  "Funko Pop":    ["Mint Box", "Near Mint Box", "Damaged Box", "Out of Box"],
  "Lego":         ["Sealed", "Built (Complete)", "Incomplete"],
  "Sneakers":     ["Deadstock", "VNDS", "Used", "Beaters"],
  "Video Games":  ["Sealed", "CIB", "No Manual", "Loose"],
  "Comics":       ["Near Mint (9.0+)", "Very Fine", "Fine", "Reader Copy"],
  "Watches":      ["Brand New", "Box & Papers", "Watch Only", "Needs Service"],
  "Coins":        ["MS-70", "MS-69", "Uncirculated", "Proof", "Raw"],
};

const DEFAULT_CONDITIONS = ["Mint", "Near Mint", "Excellent", "Good", "Fair"];

function getConditionsForCategory(cat?: string): string[] {
  if (!cat) return DEFAULT_CONDITIONS;
  return CATEGORY_CONDITIONS[cat] || DEFAULT_CONDITIONS;
}

// ── Categories that support "Graded Only" filter ────────────────────────────

const GRADED_CATEGORIES = new Set([
  "Pokémon TCG", "Sports Cards", "Other TCG", "Coins", "Comics",
]);

// ── Mock data helpers ───────────────────────────────────────────────────────

const avatar = (seed: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,ffd5dc`;

const INTENTS: TradeIntent[] = ["Cash Only", "Trade Only", "Open to Both"];
const LOGISTICS_OPTIONS: Logistics[] = ["Local Meetup", "Ships Worldwide", "PayPal G&S"];

interface MockSeller {
  name: string;
  seed: string;
  trust: number;
  trades: number;
  condition: string;
  askingPrice: number;
  intent: TradeIntent;
  logistics: Logistics;
}

interface MockBuyer {
  name: string;
  seed: string;
  trust: number;
  trades: number;
  offerPrice: number;
  intent: TradeIntent;
  logistics: Logistics;
}

const SELLER_TEMPLATES = [
  { name: "Alex",   seed: "Alex",   trust: 4.5, trades: 32, condIdx: 0, priceMult: 1.10, intentIdx: 2, logIdx: 1 },
  { name: "Sam",    seed: "Sam",    trust: 5.0, trades: 89, condIdx: 0, priceMult: 1.25, intentIdx: 0, logIdx: 1 },
  { name: "Jordan", seed: "Jordan", trust: 3.9, trades: 15, condIdx: 2, priceMult: 0.85, intentIdx: 1, logIdx: 0 },
  { name: "Riley",  seed: "Riley",  trust: 4.2, trades: 8,  condIdx: 3, priceMult: 0.70, intentIdx: 2, logIdx: 2 },
  { name: "Morgan", seed: "Morgan", trust: 4.7, trades: 56, condIdx: 1, priceMult: 0.98, intentIdx: 0, logIdx: 1 },
  { name: "Taylor", seed: "Taylor", trust: 4.9, trades: 41, condIdx: 0, priceMult: 1.15, intentIdx: 2, logIdx: 0 },
];

const BUYER_TEMPLATES = [
  { name: "Casey", seed: "Casey", trust: 4.3, trades: 22, offerMult: 0.88, intentIdx: 2, logIdx: 1 },
  { name: "Drew",  seed: "Drew",  trust: 4.8, trades: 63, offerMult: 0.92, intentIdx: 0, logIdx: 2 },
  { name: "Quinn", seed: "Quinn", trust: 3.6, trades: 5,  offerMult: 0.75, intentIdx: 1, logIdx: 0 },
  { name: "Avery", seed: "Avery", trust: 4.1, trades: 19, offerMult: 0.85, intentIdx: 2, logIdx: 1 },
  { name: "Blake", seed: "Blake", trust: 4.6, trades: 37, offerMult: 0.90, intentIdx: 0, logIdx: 1 },
];

function generateListings(price: number, category?: string) {
  const conditions = getConditionsForCategory(category);

  const sellers: MockSeller[] = SELLER_TEMPLATES.map((t) => ({
    name: t.name,
    seed: t.seed,
    trust: t.trust,
    trades: t.trades,
    condition: conditions[t.condIdx % conditions.length],
    askingPrice: Math.round(price * t.priceMult),
    intent: INTENTS[t.intentIdx],
    logistics: LOGISTICS_OPTIONS[t.logIdx],
  }));

  const buyers: MockBuyer[] = BUYER_TEMPLATES.map((t) => ({
    name: t.name,
    seed: t.seed,
    trust: t.trust,
    trades: t.trades,
    offerPrice: Math.round(price * t.offerMult),
    intent: INTENTS[t.intentIdx],
    logistics: LOGISTICS_OPTIONS[t.logIdx],
  }));

  return { sellers, buyers };
}

// ── Badge styling helpers ───────────────────────────────────────────────────

function conditionColor(c: string): string {
  // Graded cards
  if (c.startsWith("PSA") || c.startsWith("BGS") || c.startsWith("MS-"))
    return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
  switch (c) {
    case "Mint": case "Mint Box": case "Deadstock": case "Sealed":
    case "Brand New": case "Near Mint (9.0+)": case "MS-70": case "MS-69": case "Proof":
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    case "Near Mint": case "Near Mint Box": case "VNDS": case "CIB":
    case "Box & Papers": case "Very Fine": case "Uncirculated":
      return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    case "Lightly Played": case "Used": case "Built (Complete)": case "No Manual":
    case "Fine": case "Watch Only": case "Raw":
      return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
    case "Played": case "Damaged Box": case "Incomplete": case "Reader Copy":
    case "Needs Service":
      return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case "Damaged": case "Out of Box": case "Beaters": case "Loose":
      return "text-red-400 bg-red-500/10 border-red-500/20";
    default:
      return "text-cream/40 bg-white/5 border-white/10";
  }
}

function intentStyle(intent: TradeIntent): { text: string; icon: typeof DollarSign } {
  switch (intent) {
    case "Cash Only":     return { text: "text-green-400", icon: DollarSign };
    case "Trade Only":    return { text: "text-purple-400", icon: ArrowLeftRight };
    case "Open to Both":  return { text: "text-cyan-400", icon: Handshake };
  }
}

function logisticsIcon(l: Logistics): typeof Truck {
  switch (l) {
    case "Local Meetup":     return MapPin;
    case "Ships Worldwide":  return Globe;
    case "PayPal G&S":       return CreditCard;
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
  const [sortMode, setSortMode] = useState<SortMode>("price");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  // All hooks MUST be above any early return ──────────────────────────────
  const category = item?.category || "Other";
  const supportsGrading = GRADED_CATEGORIES.has(category);
  const { sellers, buyers } = generateListings(item?.marketPrice || 100, category);

  const filteredSellers = useMemo(() => {
    let list = [...sellers];
    if (activeFilters.has("Graded Only")) {
      list = list.filter((s) =>
        s.condition.startsWith("PSA") || s.condition.startsWith("BGS") ||
        s.condition.startsWith("CGC") || s.condition.startsWith("MS-")
      );
    }
    if (activeFilters.has("Cash Only"))
      list = list.filter((s) => s.intent === "Cash Only" || s.intent === "Open to Both");
    if (activeFilters.has("Trade Only"))
      list = list.filter((s) => s.intent === "Trade Only" || s.intent === "Open to Both");
    if (activeFilters.has("Local Meetup"))
      list = list.filter((s) => s.logistics === "Local Meetup");

    if (sortMode === "price") list.sort((a, b) => a.askingPrice - b.askingPrice);
    else list.sort((a, b) => b.trust - a.trust);
    return list;
  }, [sellers, activeFilters, sortMode]);

  const filteredBuyers = useMemo(() => {
    let list = [...buyers];
    if (activeFilters.has("Cash Only"))
      list = list.filter((b) => b.intent === "Cash Only" || b.intent === "Open to Both");
    if (activeFilters.has("Trade Only"))
      list = list.filter((b) => b.intent === "Trade Only" || b.intent === "Open to Both");
    if (activeFilters.has("Local Meetup"))
      list = list.filter((b) => b.logistics === "Local Meetup");

    if (sortMode === "price") list.sort((a, b) => b.offerPrice - a.offerPrice);
    else list.sort((a, b) => b.trust - a.trust);
    return list;
  }, [buyers, activeFilters, sortMode]);

  // Early return AFTER all hooks ─────────────────────────────────────────
  if (!isOpen || !item) return null;

  const filterChips: string[] = [];
  if (supportsGrading) filterChips.push("Graded Only");
  filterChips.push("Cash Only", "Trade Only", "Local Meetup");

  const toggleFilter = (f: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  };

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
    setSortMode("price");
    setActiveFilters(new Set());
    setShowSortMenu(false);
    onClose();
  };

  // ── Render a seller row ─────────────────────────────────────────────────
  const renderSeller = (s: MockSeller) => {
    const iStyle = intentStyle(s.intent);
    const IntentIcon = iStyle.icon;
    const LogIcon = logisticsIcon(s.logistics);
    return (
      <div
        key={s.seed}
        className="p-3.5 rounded-2xl bg-background-light/70 border border-white/[0.04] hover:border-white/[0.08] transition-colors space-y-2.5"
      >
        {/* Top row: avatar + name + price */}
        <div className="flex items-center gap-3">
          <img src={avatar(s.seed)} alt={s.name} className="w-10 h-10 rounded-full border-2 border-charcoal-dark bg-charcoal-light/20 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-cream">{s.name}</span>
              <div className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-[10px] text-cream/40 font-semibold">{s.trust}</span>
              </div>
              <span className="text-[10px] text-cream/20">{s.trades} trades</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-primary">{formatValue(s.askingPrice)}</p>
          </div>
        </div>

        {/* Bottom row: condition + intent + logistics + action */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${conditionColor(s.condition)}`}>
            {s.condition.startsWith("PSA") || s.condition.startsWith("BGS") || s.condition.startsWith("MS-") ? (
              <><Award className="w-2.5 h-2.5 inline -mt-0.5 mr-0.5" />{s.condition}</>
            ) : s.condition}
          </span>
          <span className={`flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/[0.06] text-[10px] font-semibold ${iStyle.text}`}>
            <IntentIcon className="w-2.5 h-2.5" />{s.intent}
          </span>
          <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/[0.06] text-[10px] font-semibold text-cream/35">
            <LogIcon className="w-2.5 h-2.5" />{s.logistics}
          </span>
          <button className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface/15 text-surface-light text-[10px] font-bold hover:bg-surface/25 active:scale-[0.97] transition-all">
            <MessageCircle className="w-3 h-3" />
            Message
          </button>
        </div>
      </div>
    );
  };

  // ── Render a buyer row ──────────────────────────────────────────────────
  const renderBuyer = (b: MockBuyer) => {
    const iStyle = intentStyle(b.intent);
    const IntentIcon = iStyle.icon;
    const LogIcon = logisticsIcon(b.logistics);
    return (
      <div
        key={b.seed}
        className="p-3.5 rounded-2xl bg-background-light/70 border border-white/[0.04] hover:border-white/[0.08] transition-colors space-y-2.5"
      >
        <div className="flex items-center gap-3">
          <img src={avatar(b.seed)} alt={b.name} className="w-10 h-10 rounded-full border-2 border-charcoal-dark bg-charcoal-light/20 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-cream">{b.name}</span>
              <div className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-[10px] text-cream/40 font-semibold">{b.trust}</span>
              </div>
              <span className="text-[10px] text-cream/20">{b.trades} trades</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-green-400">{formatValue(b.offerPrice)}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/[0.06] text-[10px] font-semibold ${iStyle.text}`}>
            <IntentIcon className="w-2.5 h-2.5" />{b.intent}
          </span>
          <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/[0.06] text-[10px] font-semibold text-cream/35">
            <LogIcon className="w-2.5 h-2.5" />{b.logistics}
          </span>
          <button className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-500/15 text-green-400 text-[10px] font-bold hover:bg-green-500/25 active:scale-[0.97] transition-all">
            <Check className="w-3 h-3" />
            Accept
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-fade-in" onClick={handleClose} />

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

        {/* ── Header: Card Info ──────────────────────────────────── */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-4">
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-16 h-16 rounded-2xl object-cover bg-charcoal-light/20 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-cream truncate">{item.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-cream/25 font-medium px-2 py-0.5 rounded-md bg-white/5">{category}</span>
              </div>
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

        {/* ── Sort + Filter Bar ──────────────────────────────────── */}
        <div className="px-5 py-3 border-b border-white/[0.04] flex-shrink-0 space-y-2.5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-cream/25 flex-shrink-0" />

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background-light text-[10px] font-bold text-cream/50 hover:text-cream/70 transition-colors"
              >
                Sort: {sortMode === "price" ? "Price" : "Trust Score"}
                <ChevronDown className={`w-3 h-3 transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
              </button>
              {showSortMenu && (
                <div className="absolute top-full left-0 mt-1 w-36 bg-charcoal-dark border border-white/10 rounded-xl shadow-xl z-40 overflow-hidden">
                  <button
                    onClick={() => { setSortMode("price"); setShowSortMenu(false); }}
                    className={`w-full px-3 py-2.5 text-left text-[11px] font-semibold transition-colors ${
                      sortMode === "price" ? "bg-primary/15 text-primary" : "text-cream/50 hover:bg-white/5"
                    }`}
                  >
                    <DollarSign className="w-3 h-3 inline mr-1.5 -mt-0.5" />Price
                  </button>
                  <button
                    onClick={() => { setSortMode("trust"); setShowSortMenu(false); }}
                    className={`w-full px-3 py-2.5 text-left text-[11px] font-semibold transition-colors ${
                      sortMode === "trust" ? "bg-primary/15 text-primary" : "text-cream/50 hover:bg-white/5"
                    }`}
                  >
                    <Star className="w-3 h-3 inline mr-1.5 -mt-0.5" />Trust Score
                  </button>
                </div>
              )}
            </div>

            {/* Filter chips */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none flex-1">
              {filterChips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => toggleFilter(chip)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                    activeFilters.has(chip)
                      ? "bg-surface/20 text-surface-light border border-surface/30"
                      : "bg-white/5 text-cream/30 border border-transparent hover:text-cream/50"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Scrollable list ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-3">
          {activeTab === "buy" ? (
            <>
              <p className="text-[11px] text-cream/25 font-semibold uppercase tracking-wider mb-1">
                Users who have this item ({filteredSellers.length})
              </p>
              {filteredSellers.length === 0 ? (
                <div className="py-8 text-center">
                  <Truck className="w-8 h-8 text-cream/15 mx-auto mb-2" />
                  <p className="text-xs text-cream/25">No sellers match your filters</p>
                </div>
              ) : (
                filteredSellers.map(renderSeller)
              )}
            </>
          ) : (
            <>
              <p className="text-[11px] text-cream/25 font-semibold uppercase tracking-wider mb-1">
                Users who want this item ({filteredBuyers.length})
              </p>
              {filteredBuyers.length === 0 ? (
                <div className="py-8 text-center">
                  <Truck className="w-8 h-8 text-cream/15 mx-auto mb-2" />
                  <p className="text-xs text-cream/25">No buyers match your filters</p>
                </div>
              ) : (
                filteredBuyers.map(renderBuyer)
              )}
            </>
          )}
        </div>

        {/* ── Sticky bottom: Place Bid ───────────────────────────── */}
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
                    <><Check className="w-4 h-4" />Bid Placed!</>
                  ) : (
                    <><Gavel className="w-4 h-4" />Submit Bid</>
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
