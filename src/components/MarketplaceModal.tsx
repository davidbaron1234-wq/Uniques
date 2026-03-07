"use client";

import { useState, useMemo } from "react";
import {
  X,
  ArrowLeftRight,
  DollarSign,
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
  AlertCircle,
} from "lucide-react";
import { formatValue } from "@/lib/format";
import type { Category } from "@/lib/constants";
import { useInventory } from "@/lib/InventoryContext";
import type { PendingDeal } from "@/lib/types";
import TradeOfferModal from "./TradeOfferModal";

// ── Public types ────────────────────────────────────────────────────────────

export interface MarketplaceItem {
  id?: string;
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
export type TradeIntent = "Cash Only" | "Trade Only" | "Open to Both";
type Logistics = "Local Meetup" | "Ships Worldwide" | "PayPal G&S";
type DealTier = "low" | "below" | "fair" | "great";

// ── Category → condition mapping ────────────────────────────────────────────

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

const GRADED_CATEGORIES = new Set([
  "Pokémon TCG", "Sports Cards", "Other TCG", "Coins", "Comics",
]);

// ── Offer item names per category ────────────────────────────────────────────

// Pokémon items use real card names from the seed catalog so thumbnail URLs resolve correctly.
const OFFER_ITEM_NAMES: Record<string, string[]> = {
  "Pokémon TCG":  ["Charizard", "Blastoise", "Mewtwo", "Pikachu", "Snorlax"],
  "Sports Cards": ["Prizm Silver RC", "Jersey Auto RC", "Optic Holo RPA", "Select Prizm Die-Cut"],
  "Other TCG":    ["Black Lotus (PL)", "Mox Ruby", "Blue-Eyes Ultimate Dragon", "Dark Magician Gold"],
  "Funko Pop":    ["Freddy Funko Chase", "Batman #01 Chase", "GitD Con Exclusive", "SDCC Exclusive"],
  "Lego":         ["UCS Millennium Falcon", "Technic Bugatti Chiron", "Icons Big Ben", "Creator Eiffel Tower"],
  "Sneakers":     ["Jordan 1 High 'Chicago'", "Nike SB Dunk 'Panda'", "Air Max 97 'Silver'", "Yeezy 350 'Cream'"],
  "Video Games":  ["Factory Sealed SNES RPG", "Complete CIB N64", "Limited Edition PS2", "NTSC-J First Print"],
  "Comics":       ["Amazing Fantasy #15 FR", "X-Men #1 GD", "Batman #1 PL", "Action Comics FR/GD"],
  "Watches":      ["Seiko Prospex Turtle", "Hamilton Khaki Field", "Tissot PRX Auto", "Citizen Promaster"],
  "Coins":        ["1921 Morgan Dollar", "1oz Gold Eagle", "1909-S VDB Lincoln", "1881-S Morgan MS65"],
};

function getOfferItemName(category: string | undefined, idx: number): string {
  const pool = OFFER_ITEM_NAMES[category ?? ""] ?? ["Rare Collectible", "Limited Edition", "Vintage Piece"];
  return pool[idx % pool.length];
}

// ── Item thumbnail images ─────────────────────────────────────────────────────

// Real card face images from images.pokemontcg.io — confirmed from seed data.
// URL pattern: https://images.pokemontcg.io/{setId}/{cardNumber}.png
const TCG = "https://images.pokemontcg.io";
const ITEM_THUMBNAILS: Record<string, string> = {
  // ── Pokémon TCG (Base / Jungle / Fossil — all confirmed in seed data) ──────
  "Charizard":      `${TCG}/base1/4.png`,
  "Blastoise":      `${TCG}/base1/2.png`,
  "Mewtwo":         `${TCG}/base1/10.png`,
  "Pikachu":        `${TCG}/base1/35.png`,
  "Snorlax":        `${TCG}/base2/11.png`,
  "Gengar":         `${TCG}/base3/5.png`,
  "Articuno":       `${TCG}/base3/2.png`,
  "Dragonite":      `${TCG}/base3/4.png`,
  "Flareon":        `${TCG}/base2/3.png`,
  "Vaporeon":       `${TCG}/base2/12.png`,
  "Dark Charizard": `${TCG}/base5/4.png`,
  // ── Sneakers — Unsplash stable photos ─────────────────────────────────────
  "Jordan 1 High 'Chicago'": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=80&h=80&fit=crop",
  "Nike SB Dunk 'Panda'":    "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=80&h=80&fit=crop",
  "Air Max 97 'Silver'":     "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=80&h=80&fit=crop",
  "Yeezy 350 'Cream'":       "https://images.unsplash.com/photo-1539185441755-769473a23570?w=80&h=80&fit=crop",
};

function getItemThumbnail(name: string): string {
  return (
    ITEM_THUMBNAILS[name] ??
    `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name)}&size=40`
  );
}

// ── Mock data types ──────────────────────────────────────────────────────────

const avatar = (seed: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,ffd5dc`;

const INTENTS: TradeIntent[] = ["Cash Only", "Trade Only", "Open to Both"];
const LOGISTICS_OPTIONS: Logistics[] = ["Local Meetup", "Ships Worldwide", "PayPal G&S"];

export interface MockSeller {
  name: string;
  seed: string;
  trust: number;
  trades: number;
  condition: string;
  askingPrice: number;
  intent: TradeIntent;
  logistics: Logistics;
}

export interface BuyerOfferItem {
  name: string;
  condition: string;
  value: number;
  thumbnailUrl: string;
}

export interface MockBuyer {
  name: string;
  seed: string;
  trust: number;
  trades: number;
  offerPrice: number;        // cash component (0 for Trade Only)
  offerItems: BuyerOfferItem[]; // items component ([] for Cash Only)
  intent: TradeIntent;
  logistics: Logistics;
}

// ── Templates ────────────────────────────────────────────────────────────────

const SELLER_TEMPLATES = [
  { name: "Alex",   seed: "Alex",   trust: 4.5, trades: 32, condIdx: 0, priceMult: 1.10, intentIdx: 2, logIdx: 1 },
  { name: "Sam",    seed: "Sam",    trust: 5.0, trades: 89, condIdx: 0, priceMult: 1.25, intentIdx: 0, logIdx: 1 },
  { name: "Jordan", seed: "Jordan", trust: 3.9, trades: 15, condIdx: 2, priceMult: 0.85, intentIdx: 1, logIdx: 0 },
  { name: "Riley",  seed: "Riley",  trust: 4.2, trades: 8,  condIdx: 3, priceMult: 0.70, intentIdx: 2, logIdx: 2 },
  { name: "Morgan", seed: "Morgan", trust: 4.7, trades: 56, condIdx: 1, priceMult: 0.98, intentIdx: 0, logIdx: 1 },
  { name: "Taylor", seed: "Taylor", trust: 4.9, trades: 41, condIdx: 0, priceMult: 1.15, intentIdx: 2, logIdx: 0 },
];

// cashFraction: how much of total offer is cash (0=items only, 1=cash only)
// itemCount: how many items they're offering
const BUYER_TEMPLATES = [
  { name: "Casey", seed: "Casey", trust: 4.3, trades: 22, offerMult: 0.88, cashFraction: 0.40, itemCount: 1, intentIdx: 2, logIdx: 1 },
  { name: "Drew",  seed: "Drew",  trust: 4.8, trades: 63, offerMult: 0.92, cashFraction: 1.00, itemCount: 0, intentIdx: 0, logIdx: 2 },
  { name: "Quinn", seed: "Quinn", trust: 3.6, trades: 5,  offerMult: 0.75, cashFraction: 0.00, itemCount: 2, intentIdx: 1, logIdx: 0 },
  { name: "Avery", seed: "Avery", trust: 4.1, trades: 19, offerMult: 0.85, cashFraction: 0.35, itemCount: 2, intentIdx: 2, logIdx: 1 },
  { name: "Blake", seed: "Blake", trust: 4.6, trades: 37, offerMult: 0.90, cashFraction: 1.00, itemCount: 0, intentIdx: 0, logIdx: 1 },
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

  const buyers: MockBuyer[] = BUYER_TEMPLATES.map((t) => {
    const totalValue  = Math.round(price * t.offerMult);
    const cashAmount  = Math.round(totalValue * t.cashFraction);
    const itemsValue  = totalValue - cashAmount;
    const perItem     = t.itemCount > 0 ? Math.round(itemsValue / t.itemCount) : 0;

    const offerItems: BuyerOfferItem[] = Array.from({ length: t.itemCount }, (_, i) => {
      const itemName = getOfferItemName(category, i);
      return {
        name:         itemName,
        condition:    conditions[i % conditions.length],
        value:        perItem,
        thumbnailUrl: getItemThumbnail(itemName),
      };
    });

    return {
      name:       t.name,
      seed:       t.seed,
      trust:      t.trust,
      trades:     t.trades,
      offerPrice: cashAmount,
      offerItems,
      intent:     INTENTS[t.intentIdx],
      logistics:  LOGISTICS_OPTIONS[t.logIdx],
    };
  });

  return { sellers, buyers };
}

// ── Deal quality helpers ─────────────────────────────────────────────────────

function buyerTotalOffer(b: MockBuyer): number {
  return b.offerPrice + b.offerItems.reduce((s, i) => s + i.value, 0);
}

function getDealTier(offer: number, market: number): DealTier {
  if (market <= 0) return "fair";
  const r = offer / market;
  if (r < 0.70) return "low";
  if (r < 0.90) return "below";
  if (r <= 1.10) return "fair";
  return "great";
}

const DEAL_STYLE: Record<DealTier, { badge: string; bar: string; text: string; label: string }> = {
  low:   { badge: "text-red-400 bg-red-500/10 border-red-500/25",      bar: "bg-red-500",   text: "text-red-400",   label: "Low" },
  below: { badge: "text-amber-400 bg-amber-500/10 border-amber-500/25", bar: "bg-amber-400", text: "text-amber-400", label: "Below" },
  fair:  { badge: "text-primary bg-primary/10 border-primary/25",       bar: "bg-primary",   text: "text-primary",  label: "Fair" },
  great: { badge: "text-green-400 bg-green-500/10 border-green-500/25", bar: "bg-green-400", text: "text-green-400", label: "Great!" },
};

// ── Badge styling helpers ─────────────────────────────────────────────────────

function conditionColor(c: string): string {
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
    case "Cash Only":    return { text: "text-green-400",  icon: DollarSign };
    case "Trade Only":   return { text: "text-purple-400", icon: ArrowLeftRight };
    case "Open to Both": return { text: "text-cyan-400",   icon: Handshake };
  }
}

function logisticsIcon(l: Logistics): typeof Truck {
  switch (l) {
    case "Local Meetup":    return MapPin;
    case "Ships Worldwide": return Globe;
    case "PayPal G&S":      return CreditCard;
  }
}

// ── Offer item row (shared between buyer list and ConfirmAccept) ─────────────

function OfferItemRow({ oi }: { oi: BuyerOfferItem }) {
  const [imgErr, setImgErr] = useState(false);
  const isGraded =
    oi.condition.startsWith("PSA") ||
    oi.condition.startsWith("BGS") ||
    oi.condition.startsWith("MS-");
  const initial = oi.name.trim()[0]?.toUpperCase() ?? "?";
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-charcoal-light/20 border border-white/[0.06]">
        {imgErr ? (
          <div className="w-full h-full flex items-center justify-center bg-primary/15">
            <span className="text-xs font-bold text-primary">{initial}</span>
          </div>
        ) : (
          <img
            src={oi.thumbnailUrl}
            alt={oi.name}
            className="w-full h-full object-cover"
            onError={() => setImgErr(true)}
          />
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-[11px] text-cream/70 font-semibold leading-tight truncate">{oi.name}</p>
        <span className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border font-bold ${conditionColor(oi.condition)}`}>
          {isGraded && <Award className="w-2 h-2" />}
          {oi.condition}
        </span>
      </div>
      <span className="text-[11px] text-primary font-bold flex-shrink-0">{formatValue(oi.value)}</span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ██  MARKETPLACE MODAL  ██████████████████████████████████████████████████████
// ═════════════════════════════════════════════════════════════════════════════

export default function MarketplaceModal({ isOpen, onClose, item }: MarketplaceModalProps) {
  const { items: inventory, updateItem } = useInventory();
  const [activeTab, setActiveTab]       = useState<MarketTab>("buy");
  const [showBidForm, setShowBidForm]   = useState(false);
  const [bidPrice, setBidPrice]         = useState("");
  const [bidSubmitted, setBidSubmitted] = useState(false);
  const [sortMode, setSortMode]         = useState<SortMode>("price");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  // Offer Builder (Buy tab — sellers)
  const [offerTarget, setOfferTarget] = useState<{
    counterparty: MockSeller;
    mode: "buy";
  } | null>(null);

  // Confirm Accept (Sell tab — buyers)
  const [acceptTarget, setAcceptTarget]   = useState<MockBuyer | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState(false);
  const [acceptError, setAcceptError]     = useState<string | null>(null);

  // All hooks above early return ──────────────────────────────────────────
  const category        = item?.category || "Other";
  const supportsGrading = GRADED_CATEGORIES.has(category);
  const marketRef       = (item?.marketPrice ?? 0) > 0 ? item!.marketPrice : 100;
  const { sellers, buyers } = generateListings(item?.marketPrice || 100, category);

  const filteredSellers = useMemo(() => {
    let list = [...sellers];
    if (activeFilters.has("Graded Only"))
      list = list.filter((s) =>
        s.condition.startsWith("PSA") || s.condition.startsWith("BGS") ||
        s.condition.startsWith("CGC") || s.condition.startsWith("MS-")
      );
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
    if (sortMode === "price") list.sort((a, b) => buyerTotalOffer(b) - buyerTotalOffer(a));
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
      next.has(f) ? next.delete(f) : next.add(f);
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

  const handleAcceptConfirm = () => {
    // Normalize to alphanumeric-only slug: strips ALL punctuation, whitespace variants,
    // invisible chars (U+00A0, U+200B, etc.) and Unicode apostrophes in one pass.
    // "Erika's Oddish " → "erikasoddish",  "Budew\u00A0" → "budew"
    const norm = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9]/g, "");

    const marketId   = item?.id ?? "";
    const marketName = item?.name ? norm(item.name) : "";
    const marketImg  = item?.imageUrl ?? "";

    // Three-tier match — priority: masterId → name → imageUrl
    // Name is checked before imageUrl so AI-scanned items (blob/base64 URLs) still match.
    const matchedItem = inventory.find(
      (i) =>
        (marketId   && i.masterId && i.masterId === marketId)  ||
        (marketName && i.name    && norm(i.name) === marketName) ||
        (marketImg  && i.imageUrl === marketImg),
    );

    if (!matchedItem) {
      setAcceptError(
        `Cannot accept offer: you do not currently possess "${item?.name}" in your inventory.`,
      );
      return;
    }

    // ── Lock item with full deal context; inventory removal happens at fulfillment ──
    if (acceptTarget) {
      const pendingDeal: PendingDeal = {
        counterpartyName: acceptTarget.name,
        counterpartyAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${acceptTarget.seed}&backgroundColor=b6e3f4,c0aede,ffd5dc`,
        theirItems: acceptTarget.offerItems.map((oi, idx) => ({
          id: `pd-${Date.now()}-${idx}`,
          name: oi.name,
          imageUrl: oi.thumbnailUrl,
          estimatedValue: oi.value,
        })),
        theirCash: acceptTarget.offerPrice,
      };
      updateItem(matchedItem.id, {
        isLocked: true,
        lockedType: "accepted",
        lockedNote: `Deal accepted with ${acceptTarget.name}. Awaiting fulfillment.`,
        pendingDeal,
      });
    }

    setAcceptError(null);
    setAcceptSuccess(true);
    setTimeout(() => {
      setAcceptSuccess(false);
      setAcceptTarget(null);
      setAcceptError(null);
    }, 2200);
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
          <button
            onClick={() => setOfferTarget({ counterparty: s, mode: "buy" })}
            className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary/15 text-primary text-[10px] font-bold hover:bg-primary/25 active:scale-[0.97] transition-all"
          >
            <ArrowLeftRight className="w-3 h-3" />
            Offer
          </button>
        </div>
      </div>
    );
  };

  // ── Render a buyer row ──────────────────────────────────────────────────
  const renderBuyer = (b: MockBuyer) => {
    const iStyle     = intentStyle(b.intent);
    const IntentIcon = iStyle.icon;
    const LogIcon    = logisticsIcon(b.logistics);
    const total      = buyerTotalOffer(b);
    const tier       = getDealTier(total, marketRef);
    const dStyle     = DEAL_STYLE[tier];
    const pct        = Math.round((total / marketRef) * 100);
    const hasItems   = b.offerItems.length > 0;
    const hasCash    = b.offerPrice > 0;

    return (
      <div
        key={b.seed}
        className="p-3.5 rounded-2xl bg-background-light/70 border border-white/[0.04] hover:border-white/[0.08] transition-colors space-y-2.5"
      >
        {/* Top: avatar + name + deal badge */}
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
          {/* Deal quality badge */}
          <span className={`flex-shrink-0 px-2 py-1 rounded-lg border text-[10px] font-bold ${dStyle.badge}`}>
            {dStyle.label} {pct}%
          </span>
        </div>

        {/* Intent + logistics badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/[0.06] text-[10px] font-semibold ${iStyle.text}`}>
            <IntentIcon className="w-2.5 h-2.5" />{b.intent}
          </span>
          <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/[0.06] text-[10px] font-semibold text-cream/35">
            <LogIcon className="w-2.5 h-2.5" />{b.logistics}
          </span>
        </div>

        {/* Offer breakdown */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2.5 space-y-2">
          {/* Item offers — visual rows */}
          {b.offerItems.map((oi, i) => (
            <OfferItemRow key={i} oi={oi} />
          ))}

          {/* Cash offer */}
          {hasCash && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3 h-3 text-green-400" />
                <span className="text-[11px] text-cream/60">Cash</span>
              </div>
              <span className="text-[11px] text-green-400 font-semibold">
                {formatValue(b.offerPrice)}
              </span>
            </div>
          )}

          {/* Total line (only when hybrid) */}
          {hasItems && hasCash && (
            <div className="border-t border-white/[0.06] pt-2 flex items-center justify-between">
              <span className="text-[11px] text-cream/35 font-semibold">Total offer</span>
              <span className={`text-[11px] font-bold ${dStyle.text}`}>
                {formatValue(total)}
              </span>
            </div>
          )}
        </div>

        {/* Deal bar + Accept */}
        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-1">
            <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${dStyle.bar}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <p className={`text-[10px] font-semibold ${dStyle.text}`}>
              {dStyle.label} · {pct}% of {formatValue(marketRef)}
            </p>
          </div>
          <button
            onClick={() => { setAcceptTarget(b); setAcceptSuccess(false); setAcceptError(null); }}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-500/15 text-green-400 text-[10px] font-bold hover:bg-green-500/25 active:scale-[0.97] transition-all"
          >
            <Check className="w-3 h-3" />
            Accept
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
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

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-4">
            <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-2xl object-cover bg-charcoal-light/20 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-cream truncate">{item.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-cream/25 font-medium px-2 py-0.5 rounded-md bg-white/5">{category}</span>
              </div>
              {item.marketPrice > 0 && (
                <div className="flex items-center gap-1.5 mt-1">
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-sm font-bold text-green-400">{formatValue(item.marketPrice)}</span>
                  <span className="text-[10px] text-cream/25 ml-0.5">eBay Avg</span>
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
                    className={`w-full px-3 py-2.5 text-left text-[11px] font-semibold transition-colors ${sortMode === "price" ? "bg-primary/15 text-primary" : "text-cream/50 hover:bg-white/5"}`}
                  >
                    <DollarSign className="w-3 h-3 inline mr-1.5 -mt-0.5" />Price
                  </button>
                  <button
                    onClick={() => { setSortMode("trust"); setShowSortMenu(false); }}
                    className={`w-full px-3 py-2.5 text-left text-[11px] font-semibold transition-colors ${sortMode === "trust" ? "bg-primary/15 text-primary" : "text-cream/50 hover:bg-white/5"}`}
                  >
                    <Star className="w-3 h-3 inline mr-1.5 -mt-0.5" />Trust Score
                  </button>
                </div>
              )}
            </div>
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

        {/* ── Scrollable list ──────────────────────────────────────── */}
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
              ) : filteredSellers.map(renderSeller)}
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
              ) : filteredBuyers.map(renderBuyer)}
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
                  type="number" min="0" step="0.01"
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
                >Cancel</button>
                <button
                  onClick={handleSubmitBid}
                  disabled={!bidPrice || bidSubmitted}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/20 text-primary font-bold text-sm hover:bg-primary/30 active:scale-[0.97] transition-all disabled:opacity-40"
                >
                  {bidSubmitted ? <><Check className="w-4 h-4" />Bid Placed!</> : <><Gavel className="w-4 h-4" />Submit Bid</>}
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

    {/* ── Offer Builder (sellers) ─────────────────────────────────────── */}
    <TradeOfferModal
      isOpen={offerTarget !== null}
      onClose={() => setOfferTarget(null)}
      marketItem={item}
      counterparty={offerTarget?.counterparty ?? null}
      mode="buy"
    />

    {/* ── Confirm Accept overlay (buyers) ─────────────────────────────── */}
    {acceptTarget && (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-fade-in"
          onClick={() => { if (!acceptSuccess) { setAcceptTarget(null); setAcceptError(null); } }}
        />
        <div className="relative w-full max-w-sm bg-charcoal-dark rounded-3xl overflow-hidden animate-slide-up">
          {acceptSuccess ? (
            /* ── Success ── */
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-green-500/20 border-2 border-green-500/35 flex items-center justify-center mx-auto mb-4">
                <Check className="w-7 h-7 text-green-400" strokeWidth={2.5} />
              </div>
              <h3 className="text-base font-bold text-cream mb-2">Deal Accepted!</h3>
              <p className="text-sm text-cream/40 leading-relaxed">
                The item is now in your{" "}
                <span className="text-amber-400 font-semibold">In Trade</span> section.
                Once you and{" "}
                <span className="text-cream/60 font-semibold">{acceptTarget.name}</span>{" "}
                have exchanged, tap <span className="text-green-400 font-semibold">Mark as Completed</span> to finalise.
              </p>
            </div>
          ) : (
            /* ── Confirmation ── */
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[11px] text-cream/30 font-semibold uppercase tracking-wider">
                    Accept Offer
                  </p>
                  <h3 className="text-base font-bold text-cream mt-0.5">Is this a fair deal?</h3>
                </div>
                <button
                  onClick={() => { setAcceptTarget(null); setAcceptError(null); }}
                  className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4 text-cream/50" />
                </button>
              </div>

              {/* What they're selling */}
              <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-xl object-cover bg-charcoal-light/20 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-cream truncate">{item.name}</p>
                  <p className="text-[10px] text-cream/30 mt-0.5">
                    Your item · asking {formatValue(item.marketPrice)}
                  </p>
                </div>
              </div>

              {/* Offer breakdown */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] px-3.5 py-3 space-y-2 mb-3">
                <p className="text-[11px] text-cream/30 font-semibold uppercase tracking-wider">
                  {acceptTarget.name}&apos;s offer
                </p>

                {acceptTarget.offerItems.map((oi, i) => (
                  <OfferItemRow key={i} oi={oi} />
                ))}

                {acceptTarget.offerPrice > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3 h-3 text-green-400" />
                      <span className="text-[11px] text-cream/60">Cash</span>
                    </div>
                    <span className="text-[11px] text-green-400 font-semibold">
                      {formatValue(acceptTarget.offerPrice)}
                    </span>
                  </div>
                )}

                {/* Total */}
                {(() => {
                  const total = buyerTotalOffer(acceptTarget);
                  const tier  = getDealTier(total, marketRef);
                  const ds    = DEAL_STYLE[tier];
                  return (
                    <div className="border-t border-white/[0.06] pt-2 flex items-center justify-between">
                      <span className="text-[11px] text-cream/35 font-semibold">Total</span>
                      <span className={`text-[11px] font-bold ${ds.text}`}>{formatValue(total)}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Deal quality bar */}
              {(() => {
                const total  = buyerTotalOffer(acceptTarget);
                const tier   = getDealTier(total, marketRef);
                const ds     = DEAL_STYLE[tier];
                const pct    = Math.round((total / marketRef) * 100);
                const barPct = Math.min(pct, 100);
                return (
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-cream/30">vs market value</span>
                      <span className={`font-bold ${ds.text}`}>{ds.label} · {pct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${ds.bar}`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Inventory error */}
              {acceptError && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 mb-3">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  <p className="text-[11px] text-red-400 font-semibold">{acceptError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setAcceptTarget(null); setAcceptError(null); }}
                  className="px-4 py-3 rounded-2xl bg-white/[0.05] text-cream/40 font-bold text-sm hover:bg-white/10 active:scale-[0.97] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAcceptConfirm}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-500/20 text-green-400 font-bold text-sm hover:bg-green-500/30 active:scale-[0.97] transition-all"
                >
                  <Check className="w-4 h-4" />
                  Confirm & Accept
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}
