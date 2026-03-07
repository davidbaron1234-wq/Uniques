"use client";

import { useMemo, useRef, useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import TradeCard from "@/components/TradeCard";
import ProposeTradeModal from "@/components/ProposeTradeModal";
import { tradeOffers, tradeHistory as staticHistory } from "@/lib/data";
import { useInventory } from "@/lib/InventoryContext";
import { formatValue } from "@/lib/format";
import { TrendingUp, Repeat2, Package, ArrowLeftRight, CheckCircle2, Users, Heart } from "lucide-react";
import type { CollectibleItem, TradeHistoryEntry } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const isMe = (name: string) => name === "You" || name === "Collector";

function toEntry(t: typeof staticHistory[number]): TradeHistoryEntry {
  return {
    id:          t.id,
    from:        { name: t.from.name,  avatar: t.from.avatar  },
    to:          { name: t.to.name,    avatar: t.to.avatar    },
    fromItems:   t.fromItems.map((i) => ({ id: i.id, name: i.name, imageUrl: i.imageUrl, estimatedValue: i.estimatedValue })),
    fromCash:    t.fromCash,
    toItems:     t.toItems.map((i)   => ({ id: i.id, name: i.name, imageUrl: i.imageUrl, estimatedValue: i.estimatedValue })),
    toCash:      t.toCash,
    status:      t.status as TradeHistoryEntry["status"],
    createdAt:   t.createdAt,
    completedAt: t.completedAt,
  };
}

function offerToEntry(o: typeof tradeOffers[number]): TradeHistoryEntry {
  return {
    id:        o.id,
    from:      { name: o.from.name, avatar: o.from.avatar },
    to:        { name: o.to.name,   avatar: o.to.avatar   },
    fromItems: o.fromItems.map((i) => ({ id: i.id, name: i.name, imageUrl: i.imageUrl, estimatedValue: i.estimatedValue })),
    fromCash:  o.fromCash,
    toItems:   o.toItems.map((i)   => ({ id: i.id, name: i.name, imageUrl: i.imageUrl, estimatedValue: i.estimatedValue })),
    toCash:    o.toCash,
    status:    "pending",
    createdAt: o.createdAt,
  };
}

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// Load all trade_completed_* timestamps from localStorage on mount
function loadCompletedMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const result: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("trade_completed_")) {
      const val = localStorage.getItem(key);
      if (val) result[key.replace("trade_completed_", "")] = val;
    }
  }
  return result;
}

// ── Community Highlights data ─────────────────────────────────────────────────

const COMMUNITY_HIGHLIGHTS = [
  {
    id: "ch-1",
    name: "LEGO Star Wars AT-AT #75313",
    category: "Lego",
    imageUrl: "https://cdn.rebrickable.com/media/sets/75313-1.jpg",
    estimatedValue: 850,
    ownerName: "Ethan",
    ownerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan&backgroundColor=FFDAC1",
    wantsTag: "Pokémon TCG",
  },
  {
    id: "ch-2",
    name: "Freddy Funko Ghost Rider Metallic (SDCC 2013)",
    category: "Funko Pop",
    imageUrl: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&h=400&fit=crop&auto=format&q=80&seed=5",
    estimatedValue: 33500,
    ownerName: "Alex",
    ownerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=AA95C5",
    wantsTag: "Alt Arts",
  },
  {
    id: "ch-3",
    name: "Shohei Ohtani 2018 Topps Update RC PSA 10",
    category: "Sports Cards",
    imageUrl: "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=400&h=400&fit=crop&auto=format&q=80&seed=41",
    estimatedValue: 1400,
    ownerName: "Ethan",
    ownerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan&backgroundColor=FFDAC1",
    wantsTag: "Pokémon TCG",
  },
  {
    id: "ch-4",
    name: "Lugia (Neo Genesis) BGS 9",
    category: "Pokémon TCG",
    imageUrl: "https://images.pokemontcg.io/neo1/9.png",
    estimatedValue: 490,
    ownerName: "Drew",
    ownerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Drew&backgroundColor=B5EAD7",
    wantsTag: "Vintage Cards",
  },
] as const;

// ── Network Activity data ─────────────────────────────────────────────────────

type EventType = "added_grail" | "completed_trade" | "updated_wishlist" | "new_listing" | "milestone";

const EVENT_META: Record<EventType, { label: string; cls: string }> = {
  added_grail:      { label: "New Grail",  cls: "bg-yellow-400/15 text-yellow-400" },
  completed_trade:  { label: "Trade",      cls: "bg-green-400/15  text-green-400"  },
  updated_wishlist: { label: "Wishlist",   cls: "bg-violet-400/15 text-violet-400" },
  new_listing:      { label: "For Trade",  cls: "bg-sky-400/15    text-sky-400"    },
  milestone:        { label: "Milestone",  cls: "bg-amber-400/15  text-amber-400"  },
};

const NETWORK_EVENTS: Array<{
  id: string;
  user: { name: string; handle: string; avatar: string };
  type: EventType;
  action: string;
  item: { name: string; imageUrl: string; estimatedValue?: number } | null;
  timestamp: string;
}> = [
  {
    id: "ne-1",
    user: { name: "Drew", handle: "drew", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Drew&backgroundColor=B5EAD7" },
    type: "added_grail",
    action: "added a new grail to their collection",
    item: { name: "Charizard (Base Set) PSA 10", imageUrl: "https://images.pokemontcg.io/base1/4.png", estimatedValue: 12000 },
    timestamp: "1h ago",
  },
  {
    id: "ne-2",
    user: { name: "Ethan", handle: "ethan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan&backgroundColor=FFDAC1" },
    type: "updated_wishlist",
    action: "updated their wishlist · 3 new wants",
    item: null,
    timestamp: "3h ago",
  },
  {
    id: "ne-3",
    user: { name: "Alex", handle: "alex", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=AA95C5" },
    type: "completed_trade",
    action: "just completed a high-value trade",
    item: { name: "Freddy Funko Ghost Rider Metallic (SDCC 2013)", imageUrl: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&h=400&fit=crop&auto=format&q=80&seed=5", estimatedValue: 33500 },
    timestamp: "5h ago",
  },
  {
    id: "ne-4",
    user: { name: "Drew", handle: "drew", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Drew&backgroundColor=B5EAD7" },
    type: "new_listing",
    action: "listed a new item for trade",
    item: { name: "Umbreon VMAX Alt Art", imageUrl: "https://images.pokemontcg.io/swsh7/215.png", estimatedValue: 310 },
    timestamp: "8h ago",
  },
  {
    id: "ne-5",
    user: { name: "Ethan", handle: "ethan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan&backgroundColor=FFDAC1" },
    type: "milestone",
    action: "hit a $10k collection milestone",
    item: { name: "LEGO Star Wars AT-AT #75313", imageUrl: "https://cdn.rebrickable.com/media/sets/75313-1.jpg", estimatedValue: 850 },
    timestamp: "1d ago",
  },
];

// ── Compact activity row ─────────────────────────────────────────────────────

function ActivityRow({
  trade,
  completedAt,
  onClick,
}: {
  trade: TradeHistoryEntry;
  completedAt?: string;
  onClick: () => void;
}) {
  const iAmFrom     = isMe(trade.from.name);
  const other       = iAmFrom ? trade.to : trade.from;
  const isCompleted = trade.status === "accepted" && !!(trade.completedAt || completedAt);

  const label = isCompleted
    ? `Completed trade with ${other.name}`
    : trade.status === "accepted"
    ? `Awaiting fulfillment · ${other.name}`
    : trade.status === "pending" && iAmFrom
    ? `Pending ${other.name}'s response`
    : trade.status === "pending"
    ? `Offer from ${other.name}`
    : trade.status === "declined"
    ? `Trade declined · ${other.name}`
    : `Trade with ${other.name}`;

  const dotCls = isCompleted              ? "bg-green-400"
    : trade.status === "accepted"         ? "bg-sky-400"
    : trade.status === "declined"         ? "bg-red-400/70"
    : /* pending */                         "bg-amber-400";

  const dateStr = new Date(trade.createdAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });

  const thumbItem = (iAmFrom ? trade.toItems : trade.fromItems)[0];

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-background-light hover:bg-white/[0.05] transition-colors text-left"
    >
      {/* Avatar + status dot */}
      <div className="relative flex-shrink-0">
        <div className="w-8 h-8 rounded-xl overflow-hidden bg-primary/10">
          <img src={other.avatar} alt={other.name} className="w-full h-full object-cover" />
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-charcoal-dark ${dotCls}`} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-cream/75 font-medium truncate">{label}</p>
        {thumbItem && (
          <p className="text-[10px] text-cream/30 truncate mt-0.5 leading-tight">{thumbItem.name}</p>
        )}
      </div>

      {/* Date */}
      <span className="text-[10px] text-cream/25 font-medium flex-shrink-0 tabular-nums">{dateStr}</span>
    </button>
  );
}

// ── Tab deep-link handler ─────────────────────────────────────────────────────
// Reads ?tab= from the URL and redirects to the appropriate page.
// Must be isolated in its own component so useSearchParams() can be wrapped in
// Suspense without forcing the entire HomePage into a suspense boundary.

function TabRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    if (searchParams.get("tab") === "history") {
      router.replace("/history");
    }
  }, [searchParams, router]);
  return null;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const {
    items, totalValue,
    tradeHistoryEntries, addTradeHistory, updateTradeHistory,
    removeItem, addRawItem,
    lockItems,
    showToast,
  } = useInventory();

  // Counter / Edit Offer modal state
  const [counterTradeEntry, setCounterTradeEntry] = useState<TradeHistoryEntry | null>(null);

  const counterPrefill = useMemo(() => {
    if (!counterTradeEntry) return null;
    const t = counterTradeEntry;
    const iAmFrom    = isMe(t.from.name);
    const targetRaw  = iAmFrom ? t.toItems[0]   : t.fromItems[0];
    const offerNames = iAmFrom ? t.fromItems.map((i) => i.name) : t.toItems.map((i) => i.name);
    return {
      counterUser:    iAmFrom ? t.to   : t.from,
      targetItem:     targetRaw ? ({
        id:             targetRaw.id,
        name:           targetRaw.name,
        category:       "Other",
        imageUrl:       targetRaw.imageUrl,
        estimatedValue: targetRaw.estimatedValue,
      } as CollectibleItem) : undefined,
      selectedIds: new Set(
        offerNames
          .map((name) => items.find((i) => i.name === name)?.id)
          .filter((id): id is string => !!id)
      ),
      cashOffer:      iAmFrom ? t.fromCash : t.toCash,
      theirCashOffer: iAmFrom ? t.toCash   : t.fromCash,
    };
  }, [counterTradeEntry, items]);

  // Heart likes for network feed rows
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLikedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // Pending offers — local state tracks dismissals (accept/decline removes from view)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const dismiss = (id: string) =>
    setDismissedIds((prev) => { const n = new Set(prev); n.add(id); return n; });

  // completedAtMap: dual read so completion is idempotent across page re-renders
  const [completedAtMap, setCompletedAtMap] = useState<Record<string, string>>(loadCompletedMap);

  // Ref guard: prevents double-execution of handleCompleteTrade within one render
  const completingIds = useRef(new Set<string>());

  // IDs that have already been handled (accepted/completed) — prevents stale re-appearing
  // after page refresh when dismissedIds (local state) is lost.
  const handledTradeIds = useMemo(
    () => new Set(tradeHistoryEntries.map((e) => e.id)),
    [tradeHistoryEntries]
  );

  // Convert pending tradeOffers into TradeHistoryEntry for the shared TradeCard.
  // Exclude any offer already in the context (accepted, completed, etc.).
  const pendingEntries = tradeOffers
    .filter((o) => o.status === "pending" && !dismissedIds.has(o.id) && !handledTradeIds.has(o.id))
    .map(offerToEntry)
    .slice(0, 3);

  // Accepted trades awaiting fulfillment (from context, not yet completed)
  const acceptedPending = tradeHistoryEntries.filter(
    (e) => e.status === "accepted" && !e.completedAt && !completedAtMap[e.id]
  );

  // Combined actionable entries — max 3 shown
  const actionEntries = [...pendingEntries, ...acceptedPending].slice(0, 3);

  // Name-based ownership set — catches items received with deterministic IDs and
  // catalog items that carry a "catalog-*" ID different from the trade offer's ID.
  const userItemNames = useMemo(() => new Set(items.map((i) => i.name)), [items]);

  // Returns true if the user no longer owns one or more items required by the trade.
  // Uses name matching so ID divergence between offer and received item never blocks valid trades.
  const tradeItemsMissing = (entry: TradeHistoryEntry): boolean => {
    const myItems = isMe(entry.from.name) ? entry.fromItems : entry.toItems;
    return myItems.some((item) => !userItemNames.has(item.name));
  };

  // Recent activity — last 3 unique, non-dismissed entries
  const recentActivity = useMemo(() => {
    const seen = new Set<string>();
    return [
      ...tradeHistoryEntries,
      ...staticHistory.map(toEntry),
    ]
      .filter((t) => {
        if (seen.has(t.id) || dismissedIds.has(t.id)) return false;
        seen.add(t.id);
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [tradeHistoryEntries, dismissedIds]);

  const handlePartyClick = (name: string) => {
    if (!isMe(name)) router.push(`/u/${name.toLowerCase()}`);
  };

  // Accept a pending offer: persist as accepted entry, lock the user's items, remove from pending view
  const handleAcceptOffer = (entry: TradeHistoryEntry) => {
    addTradeHistory({ ...entry, status: "accepted" });
    const myItems = isMe(entry.from.name) ? entry.fromItems : entry.toItems;
    // Look up real IDs by name — trade offer IDs may differ from local inventory IDs
    const realIds = myItems
      .map((tradeItem) => items.find((i) => i.name === tradeItem.name)?.id)
      .filter((id): id is string => !!id);
    if (realIds.length > 0) {
      lockItems(realIds, "Deal accepted · Awaiting fulfillment", "accepted");
    }
    dismiss(entry.id);
    showToast("Trade accepted! Complete the trade when items are exchanged.");
  };

  // Complete an accepted trade: atomic inventory swap + persist completion timestamp
  const handleCompleteTrade = (trade: TradeHistoryEntry) => {
    if (completingIds.current.has(trade.id)) return;
    if (trade.completedAt || completedAtMap[trade.id]) return;

    completingIds.current.add(trade.id);

    const now = new Date().toISOString();
    const iAmOfferer    = isMe(trade.from.name);
    const itemsToRemove = iAmOfferer ? trade.fromItems : trade.toItems;
    const itemsToAdd    = iAmOfferer ? trade.toItems   : trade.fromItems;

    // Remove items we gave away — look up the REAL inventory ID by name so
    // items received with a deterministic ID (or any catalog-* ID) are found correctly.
    itemsToRemove.forEach((tradeItem) => {
      const real = items.find((i) => i.name === tradeItem.name);
      if (real) removeItem(real.id);
    });
    itemsToAdd.forEach((item) => {
      const newItem: CollectibleItem = {
        id:             item.id,
        name:           item.name,
        category:       "Other",
        imageUrl:       item.imageUrl,
        estimatedValue: item.estimatedValue,
        upForTrade:     false,
      };
      addRawItem(newItem);
    });

    updateTradeHistory(trade.id, { completedAt: now });
    try { localStorage.setItem(`trade_completed_${trade.id}`, now); } catch { /* quota */ }
    setCompletedAtMap((prev) => ({ ...prev, [trade.id]: now }));

    showToast("🎉 Trade completed! Your collection has been updated.");
  };

  return (
    <div className="min-h-screen pb-20">
      <Suspense>
        <TabRedirect />
      </Suspense>
      <Header />

      <main className="max-w-lg mx-auto">

        {/* ── Greeting + Stats ── */}
        <div className="px-5 pt-7 pb-5">
          <p className="text-[10px] text-cream/30 font-bold uppercase tracking-widest mb-1">Dashboard</p>
          <h1 className="text-2xl font-bold text-cream mb-5">{timeGreeting()}, Collector.</h1>

          <div className="grid grid-cols-3 gap-2.5 animate-slide-up" style={{ animationFillMode: "both" }}>
            <div className="rounded-2xl bg-background-light p-3.5 flex flex-col gap-2 shadow-soft">
              <TrendingUp className="w-4 h-4 text-primary" />
              <div>
                <p className="text-[9px] text-cream/35 font-bold uppercase tracking-wider leading-none mb-1">Collection</p>
                <p className="text-sm font-extrabold text-cream leading-none">{formatValue(totalValue)}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-background-light p-3.5 flex flex-col gap-2 shadow-soft">
              <Repeat2 className="w-4 h-4 text-surface-light" />
              <div>
                <p className="text-[9px] text-cream/35 font-bold uppercase tracking-wider leading-none mb-1">Active Trades</p>
                <p className="text-sm font-extrabold text-cream leading-none">{pendingEntries.length + acceptedPending.length}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-background-light p-3.5 flex flex-col gap-2 shadow-soft">
              <Package className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-[9px] text-cream/35 font-bold uppercase tracking-wider leading-none mb-1">Total Items</p>
                <p className="text-sm font-extrabold text-cream leading-none">{items.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Action Required ── */}
        <div className="mb-6">
          <div className="px-5 flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] text-cream/30 font-bold uppercase tracking-widest">Action Required</p>
              {pendingEntries.length > 0 && (
                <p className="text-[10px] text-amber-400/70 font-semibold mt-0.5">
                  {pendingEntries.length} offer{pendingEntries.length !== 1 ? "s" : ""} waiting for your response
                </p>
              )}
              {acceptedPending.length > 0 && (
                <p className="text-[10px] text-sky-400/70 font-semibold mt-0.5">
                  {acceptedPending.length} trade{acceptedPending.length !== 1 ? "s" : ""} awaiting fulfillment
                </p>
              )}
            </div>
            <button
              onClick={() => router.push("/history")}
              className="text-[10px] text-primary/70 font-semibold hover:text-primary transition-colors"
            >
              View all →
            </button>
          </div>

          {actionEntries.length === 0 ? (
            <div className="mx-5 rounded-2xl bg-background-light p-6 flex flex-col items-center gap-2 text-center animate-slide-up" style={{ animationFillMode: "both" }}>
              <CheckCircle2 className="w-8 h-8 text-primary/40" />
              <p className="text-sm font-semibold text-cream/50">All caught up!</p>
              <p className="text-xs text-cream/25">No pending offers need your attention.</p>
            </div>
          ) : (
            <div className="px-5 space-y-3">
              {actionEntries.map((entry, i) => (
                <TradeCard
                  key={entry.id}
                  trade={entry}
                  index={i}
                  onAccept={
                    entry.status === "pending"
                      ? () => handleAcceptOffer(entry)
                      : undefined
                  }
                  onCancel={
                    entry.status === "pending"
                      ? () => dismiss(entry.id)
                      : undefined
                  }
                  onCounter={
                    entry.status === "pending"
                      ? () => setCounterTradeEntry(entry)
                      : undefined
                  }
                  onMessage={
                    entry.status === "pending"
                      ? () => {
                          const other = isMe(entry.from.name) ? entry.to : entry.from;
                          router.push(`/inbox/${other.name.toLowerCase()}`);
                        }
                      : undefined
                  }
                  onComplete={
                    entry.status === "accepted" && !entry.completedAt && !completedAtMap[entry.id]
                      ? () => handleCompleteTrade(entry)
                      : undefined
                  }
                  itemsMissing={tradeItemsMissing(entry)}
                  onPartyClick={handlePartyClick}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Following / Network Activity ── */}
        <div className="px-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cream/35" />
                <p className="text-[10px] text-cream/30 font-bold uppercase tracking-widest">Following</p>
              </div>
              <p className="text-[10px] text-cream/20 mt-0.5 font-medium">Activity from people you follow</p>
            </div>
          </div>

          <div className="space-y-2">
            {NETWORK_EVENTS.map((event, i) => {
              const meta = EVENT_META[event.type];
              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-background-light hover:bg-white/[0.05] transition-colors animate-slide-up"
                  style={{ animationDelay: `${i * 0.05}s`, animationFillMode: "both" }}
                >
                  <Link
                    href={`/u/${event.user.handle}`}
                    className="flex-shrink-0 w-9 h-9 rounded-xl overflow-hidden bg-primary/10 block hover:ring-2 hover:ring-primary/30 transition-all"
                  >
                    <img src={event.user.avatar} alt={event.user.name} className="w-full h-full object-cover" />
                  </Link>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-snug">
                      <Link href={`/u/${event.user.handle}`} className="font-bold text-cream hover:text-primary transition-colors">
                        {event.user.name}
                      </Link>
                      <span className="text-cream/45"> {event.action}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${meta.cls}`}>{meta.label}</span>
                      <span className="text-[9px] text-cream/25 font-medium">{event.timestamp}</span>
                    </div>
                  </div>

                  {event.item && (
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl overflow-hidden bg-white/[0.05] flex items-center justify-center p-1">
                      <img src={event.item.imageUrl} alt={event.item.name} className="w-full h-full object-contain" loading="lazy" />
                    </div>
                  )}

                  {/* Like button */}
                  <button
                    onClick={(e) => toggleLike(event.id, e)}
                    className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl hover:bg-white/[0.05] transition-all active:scale-90"
                  >
                    <Heart
                      className={`w-4 h-4 transition-all duration-150 ${
                        likedIds.has(event.id)
                          ? "fill-red-500 text-red-500 scale-110"
                          : "text-cream/20 hover:text-cream/40"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Community Highlights ── */}
        <div className="mb-6">
          <div className="px-5 mb-3">
            <p className="text-[10px] text-cream/30 font-bold uppercase tracking-widest">Trending Grails</p>
            <p className="text-[10px] text-cream/20 mt-0.5 font-medium">Highly sought-after items recently listed by collectors near you.</p>
          </div>

          <div className="flex gap-3 overflow-x-auto scrollbar-none pl-5 pr-5 pb-1">
            {COMMUNITY_HIGHLIGHTS.map((item, i) => (
              <button
                key={item.id}
                onClick={() => router.push(`/u/${item.ownerName.toLowerCase()}`)}
                className="flex-shrink-0 w-36 rounded-2xl bg-background-light shadow-soft overflow-hidden animate-slide-up cursor-pointer active:scale-[0.97] transition-transform text-left"
                style={{ animationDelay: `${i * 0.07}s`, animationFillMode: "both" }}
              >
                <div className="aspect-square w-full overflow-hidden bg-charcoal-dark/40">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-2.5">
                  <p className="text-[10px] text-cream/70 line-clamp-2 leading-snug font-semibold mb-2">{item.name}</p>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-4 h-4 rounded-full overflow-hidden bg-surface/20 flex-shrink-0">
                      <img src={item.ownerAvatar} alt={item.ownerName} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[9px] text-cream/35 font-medium">{item.ownerName}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <span className="text-[10px] font-extrabold text-primary">{formatValue(item.estimatedValue)}</span>
                    <span className="text-[8px] text-cream/25 font-semibold bg-white/[0.06] px-1.5 py-0.5 rounded-full whitespace-nowrap">{item.wantsTag}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Recent Activity ── */}
        <div className="px-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-cream/30 font-bold uppercase tracking-widest">Recent Activity</p>
            <button
              onClick={() => router.push("/history")}
              className="text-[10px] text-primary/70 font-semibold hover:text-primary transition-colors"
            >
              View all →
            </button>
          </div>

          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-3 text-center animate-slide-up" style={{ animationFillMode: "both" }}>
              <ArrowLeftRight className="w-7 h-7 text-cream/15" />
              <p className="text-sm text-cream/30 font-medium">No trade history yet</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentActivity.map((trade) => (
                <ActivityRow
                  key={trade.id}
                  trade={trade}
                  completedAt={completedAtMap[trade.id]}
                  onClick={() => router.push(`/history#trade-${trade.id}`)}
                />
              ))}
            </div>
          )}
        </div>

      </main>

      <BottomNav />

      {/* ── Counter / Edit Offer modal ── */}
      {counterTradeEntry && counterPrefill && (
        <ProposeTradeModal
          isOpen
          onClose={() => setCounterTradeEntry(null)}
          targetUser={counterPrefill.counterUser}
          prefill={{
            targetItem:     counterPrefill.targetItem,
            selectedIds:    counterPrefill.selectedIds,
            cashOffer:      counterPrefill.cashOffer,
            theirCashOffer: counterPrefill.theirCashOffer,
          }}
          onTradeSent={() => {
            dismiss(counterTradeEntry.id);
            setCounterTradeEntry(null);
            showToast(isMe(counterTradeEntry.from.name) ? "Offer updated and sent!" : "Counter offer sent!");
          }}
        />
      )}
    </div>
  );
}
