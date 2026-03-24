"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import TradeCard from "@/components/TradeCard";
import ProposeTradeModal from "@/components/ProposeTradeModal";
import { tradeHistory as staticHistory, tradeOffers } from "@/lib/data";
import { useInventory } from "@/lib/InventoryContext";
import { isDemoUser } from "@/lib/demo";
import { History, Search } from "lucide-react";
import type { CollectibleItem, TradeHistoryEntry } from "@/lib/types";
import type { Category } from "@/lib/constants";

// ── Helpers ────────────────────────────────────────────────────────────────────

const isMe = (name: string) => name === "You" || name === "Collector";

// Normalise seed data into TradeHistoryEntry shape
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

// Normalise pending tradeOffers (shown as pending in history)
function offerToEntry(o: typeof tradeOffers[number]): TradeHistoryEntry {
  return {
    id:        o.id,
    from:      { name: o.from.name, avatar: o.from.avatar },
    to:        { name: o.to.name,   avatar: o.to.avatar   },
    fromItems: o.fromItems.map((i) => ({ id: i.id, name: i.name, imageUrl: i.imageUrl, estimatedValue: i.estimatedValue, category: i.category })),
    fromCash:  o.fromCash,
    toItems:   o.toItems.map((i)   => ({ id: i.id, name: i.name, imageUrl: i.imageUrl, estimatedValue: i.estimatedValue, category: i.category })),
    toCash:    o.toCash,
    status:    "pending",
    createdAt: o.createdAt,
  };
}

// Load all trade_completed_* keys from localStorage on mount
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

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = ["All", "Action Required", "Awaiting Others", "Completed"] as const;
type TabName = typeof TABS[number];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isDemo = isDemoUser(session?.user?.email);
  const { items, tradeHistoryEntries, addTradeHistory, updateTradeHistory, removeItem, addRawItem, lockItems, showToast } = useInventory();

  const [activeTab, setActiveTab]   = useState<TabName>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set());
  const [completedAtMap, setCompletedAtMap] = useState<Record<string, string>>(loadCompletedMap);
  const [counterTradeEntry, setCounterTradeEntry] = useState<TradeHistoryEntry | null>(null);

  // Deep-link: if a hash like #trade-xyz is in the URL, scroll to that card after mount
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const id = hash.replace("#", "");
    // Small delay so the list has rendered before we try to scroll
    const t = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => clearTimeout(t);
  }, []);

  // Ref-based guard prevents double-execution even within the same render cycle
  const completingIds = useRef(new Set<string>());

  // ── Build unified entry list (memoized to avoid rebuilding on every render) ──
  // Demo account includes mock tradeOffers + staticHistory; real users see only real trades.
  const allEntries = useMemo(() => {
    const seen = new Set<string>();
    return [
      ...tradeHistoryEntries,
      ...(isDemo ? tradeOffers.map(offerToEntry) : []),
      ...(isDemo ? staticHistory.map(toEntry) : []),
    ]
      .filter((t) => {
        if (seen.has(t.id) || cancelledIds.has(t.id)) return false;
        seen.add(t.id);
        return true;
      })
      .map((t) => completedAtMap[t.id] ? { ...t, completedAt: completedAtMap[t.id] } : t)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tradeHistoryEntries, cancelledIds, completedAtMap, isDemo]);

  // ── Tab filtering ────────────────────────────────────────────────────────
  const filteredEntries = allEntries.filter((t) => {
    switch (activeTab) {
      case "Action Required": return t.status === "pending" && isMe(t.to.name);
      case "Awaiting Others": return t.status === "pending" && isMe(t.from.name);
      case "Completed":       return t.status !== "pending";
      default:                return true;
    }
  });

  // ── Search filter (applied on top of tab filter) ─────────────────────
  const displayEntries = useMemo(() => {
    if (!searchQuery.trim()) return filteredEntries;
    const q = searchQuery.toLowerCase();
    return filteredEntries.filter((t) => {
      const other = isMe(t.from.name) ? t.to.name : t.from.name;
      if (other.toLowerCase().includes(q)) return true;
      return [...t.fromItems, ...t.toItems].some((i) => i.name.toLowerCase().includes(q));
    });
  }, [filteredEntries, searchQuery]);

  // Badge counts for tabs
  const actionCount   = allEntries.filter((t) => t.status === "pending" && isMe(t.to.name)).length;
  const awaitingCount = allEntries.filter((t) => t.status === "pending" && isMe(t.from.name)).length;

  // ── Ownership guard ──────────────────────────────────────────────────────
  // Name-based check: the user may own an item with the right name but a different ID
  // (e.g. received items use the source item's ID, but catalog adds use "catalog-*")
  const userItemNames = useMemo(() => new Set(items.map((i) => i.name)), [items]);

  // ── Build prefill data for the counter/edit ProposeTradeModal ────────────
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
        category:       (targetRaw.category ?? "Other") as Category,
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

  const tradeItemsMissing = (entry: TradeHistoryEntry): boolean => {
    const myItems = isMe(entry.from.name) ? entry.fromItems : entry.toItems;
    return myItems.some((item) => !userItemNames.has(item.name));
  };

  // ── Accept a pending offer: persist, lock the user's items, dismiss from pending view ──
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
    showToast("Trade accepted! Mark as complete once pieces have been exchanged.");
  };

  // ── Bulletproof, atomic, idempotent trade completion ────────────────────
  const handleCompleteTrade = (trade: TradeHistoryEntry) => {
    // Ref guard: blocks double-execution within the same synchronous event
    if (completingIds.current.has(trade.id)) return;
    // State guard: blocks re-execution after first completion
    if (trade.completedAt || completedAtMap[trade.id]) return;

    completingIds.current.add(trade.id);

    const now = new Date().toISOString();

    // Determine which side is the current user
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
        category:       (item.category ?? "Other") as Category,
        imageUrl:       item.imageUrl,
        estimatedValue: item.estimatedValue,
        upForTrade:     false,
      };
      addRawItem(newItem);
    });

    // Persist completion timestamp — dual write: context + localStorage
    updateTradeHistory(trade.id, { completedAt: now });
    try { localStorage.setItem(`trade_completed_${trade.id}`, now); } catch { /* quota */ }
    setCompletedAtMap((prev) => ({ ...prev, [trade.id]: now }));

    showToast("🎉 Trade completed! Your vault has been updated.");
  };

  const dismiss = (id: string) =>
    setCancelledIds((prev) => { const n = new Set(prev); n.add(id); return n; });

  const otherParty = (trade: TradeHistoryEntry) =>
    isMe(trade.from.name) ? trade.to : trade.from;

  return (
    <div className="min-h-screen pb-20">
      <Header />

      <main className="max-w-lg mx-auto">

        {/* ── Title ── */}
        <div className="px-5 pt-6 pb-3">
          <div className="flex items-center gap-2.5 mb-1">
            <History className="w-5 h-5 text-cream/70" />
            <h1 className="text-xl font-bold text-cream">Trade History</h1>
          </div>
          <p className="text-sm text-cream/40 font-medium">
            {displayEntries.length}{searchQuery.trim() ? ` of ${filteredEntries.length}` : ""} trade{displayEntries.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* ── Search ── */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream/25 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trades, pieces, or Collectors…"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-background-light border border-white/[0.06] text-sm text-cream/80 placeholder:text-cream/20 focus:outline-none focus:border-primary/30 transition-colors"
            />
          </div>
        </div>

        {/* ── Sticky Tab Bar ── */}
        <div className="sticky top-0 z-20 bg-background border-b border-white/[0.06] px-5 py-2.5">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              const badge = tab === "Action Required" ? actionCount
                          : tab === "Awaiting Others" ? awaitingCount
                          : 0;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-primary text-charcoal-dark"
                      : "bg-white/[0.06] text-cream/40 hover:text-cream/70 hover:bg-white/[0.09]"
                  }`}
                >
                  {tab}
                  {badge > 0 && (
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full leading-none ${
                      isActive ? "bg-charcoal-dark/20 text-charcoal-dark" : "bg-amber-400 text-charcoal-dark"
                    }`}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Trade List ── */}
        <div className="space-y-3 px-5 pt-4">
          {displayEntries.map((trade, i) => (
            <div key={trade.id} id={`trade-${trade.id}`}>
              <TradeCard
                trade={trade}
                index={i}
                onAccept={
                  trade.status === "pending" && isMe(trade.to.name)
                    ? () => handleAcceptOffer(trade)
                    : undefined
                }
                onCancel={
                  trade.status === "pending"
                    ? () => { addTradeHistory({ ...trade, status: "declined" }); dismiss(trade.id); }
                    : undefined
                }
                onCounter={
                  trade.status === "pending"
                    ? () => setCounterTradeEntry(trade)
                    : undefined
                }
                onMessage={
                  trade.status === "pending"
                    ? () => router.push(`/inbox/${otherParty(trade).name.toLowerCase()}`)
                    : undefined
                }
                onComplete={
                  trade.status === "accepted" && !trade.completedAt && !completedAtMap[trade.id]
                    ? () => handleCompleteTrade(trade)
                    : undefined
                }
                onRemove={trade.status === "declined" ? () => dismiss(trade.id) : undefined}
                itemsMissing={tradeItemsMissing(trade)}
                onPartyClick={(name) => {
                  if (!isMe(name)) router.push(`/u/${name.toLowerCase()}`);
                }}
              />
            </div>
          ))}
        </div>

        {displayEntries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-background-light flex items-center justify-center mb-4 shadow-soft">
              {searchQuery.trim()
                ? <Search className="w-8 h-8 text-cream/20" />
                : <History className="w-8 h-8 text-cream/20" />
              }
            </div>
            {searchQuery.trim() ? (
              <>
                <p className="text-cream/40 font-medium">{`No results for "${searchQuery}"`}</p>
                <p className="text-cream/25 text-sm mt-1">Try a different name or item</p>
              </>
            ) : activeTab === "All" ? (
              <>
                <p className="text-cream/70 font-extrabold text-base mb-1">Your Trading Saga Begins...</p>
                <p className="text-cream/30 text-xs mb-5 max-w-[220px] leading-relaxed">
                  Every legendary collector started with one trade. Yours is one tap away.
                </p>
                <button
                  onClick={() => router.push("/search")}
                  className="bg-primary text-charcoal-dark text-xs font-bold px-5 py-2.5 rounded-full shadow-[0_0_16px_rgba(202,230,206,0.3)] active:scale-95 transition-all"
                >
                  Initiate First Trade
                </button>
              </>
            ) : (
              <>
                <p className="text-cream/40 font-medium">Nothing here yet</p>
                <p className="text-cream/25 text-sm mt-1">{`No "${activeTab}" trades`}</p>
              </>
            )}
          </div>
        )}
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
