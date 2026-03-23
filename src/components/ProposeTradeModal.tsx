"use client";

import { useEffect, useState, useMemo } from "react";
import { CollectibleItem, TradeHistoryEntry } from "@/lib/types";
import { currentUser } from "@/lib/data";
import { useInventory } from "@/lib/InventoryContext";
import { useNotifications } from "@/lib/NotificationContext";
import { formatValue } from "@/lib/format";
import { ArrowLeftRight, Award, Box, Check, ChevronRight, DollarSign, MessageSquare, Plus, Send, Shield, Smile, X } from "lucide-react";
import { PowerPicker } from "@/components/PowerPicker";
import type { PowerPickerItem } from "@/components/PowerPicker";
import EquityBar from "./EquityBar";

interface Prefill {
  targetItem?:     CollectibleItem;
  selectedIds?:    Set<string>;
  cashOffer?:      number;
  theirCashOffer?: number;
}

interface Props {
  isOpen: boolean;
  targetItem?: CollectibleItem | null;
  targetUser: { name: string; avatar: string };
  onClose: () => void;
  onTradeSent?: (entry: TradeHistoryEntry) => void;
  prefill?: Prefill;
  skipNavigation?: boolean;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function isWhiteBg(item: CollectibleItem) {
  return item.category === "Lego" || item.category === "Funko Pop";
}

// ── Category-aware Condition Badge ───────────────────────────────────────────

function CategoryBadge({ item }: { item: CollectibleItem }) {
  const { category, graded, grader, gradeNum, condition } = item;

  // Funko Pop → NIB / OOB
  if (category === "Funko Pop") {
    const isOOB    = condition === "Out of Box";
    const colorCls = isOOB
      ? "bg-orange-500/15 border-orange-500/20 text-orange-400"
      : "bg-emerald-500/15 border-emerald-500/20 text-emerald-400";
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${colorCls}`}>
        <Box className="w-2.5 h-2.5" />
        {isOOB ? "Out of Box" : "New In Box"}
      </span>
    );
  }

  // Lego → Sealed / Open Box / Built
  if (category === "Lego") {
    const c     = (condition ?? "").toLowerCase();
    const label = c.includes("seal")                              ? "Sealed"
      : c.includes("open")                                        ? "Open Box"
      : c.includes("built") || c.includes("complet")             ? "Built"
      : "Sealed";
    const colorCls = label === "Sealed"   ? "bg-primary/15 border-primary/20 text-primary"
      : label === "Open Box"              ? "bg-amber-500/15 border-amber-500/20 text-amber-400"
      :                                     "bg-red-500/15 border-red-500/20 text-red-400";
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${colorCls}`}>
        <Box className="w-2.5 h-2.5" />
        {label}
      </span>
    );
  }

  // Cards (Pokémon TCG, Sports Cards, Other TCG, etc.) → grader/grade or condition
  if (graded && gradeNum) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/15 border border-purple-500/20 text-[10px] font-bold text-purple-400">
        <Award className="w-2.5 h-2.5" />
        {grader} {gradeNum}
      </span>
    );
  }
  if (condition) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface/15 border border-surface/20 text-[10px] font-bold text-surface-light">
        <Shield className="w-2.5 h-2.5" />
        {condition}
      </span>
    );
  }

  return null;
}

// ── Per-user tradeable item catalogue (for the item picker) ──────────────────

type PickerItem = {
  id: string;
  name: string;
  imageUrl: string;
  estimatedValue?: number;
  category: string;
};

const USER_TRADEABLE: Record<string, PickerItem[]> = {
  drew: [
    { id: "d-item-1", name: "Charizard (Base Set) PSA 9", imageUrl: "https://images.pokemontcg.io/base1/4.png", estimatedValue: 9500, category: "Pokémon TCG" },
    { id: "d-item-2", name: "Umbreon VMAX Alt Art", imageUrl: "https://images.pokemontcg.io/swsh7/215.png", estimatedValue: 310, category: "Pokémon TCG" },
    { id: "d-item-3", name: "Lugia (Neo Genesis) BGS 9", imageUrl: "https://images.pokemontcg.io/neo1/9.png", estimatedValue: 490, category: "Pokémon TCG" },
    { id: "d-item-4", name: "Mew ex SAR (Pokémon 151)", imageUrl: "https://images.pokemontcg.io/sv3pt5/205.png", estimatedValue: 320, category: "Pokémon TCG" },
  ],
  ethan: [
    { id: "e-item-1", name: "LEGO Star Wars AT-AT #75313", imageUrl: "https://cdn.rebrickable.com/media/sets/75313-1.jpg", estimatedValue: 850, category: "Lego" },
    { id: "e-item-2", name: "Shohei Ohtani 2018 Topps Update RC PSA 10", imageUrl: "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=400&h=400&fit=crop&auto=format&q=80&seed=41", estimatedValue: 1400, category: "Sports Cards" },
    { id: "e-item-3", name: "Pikachu Illustrator BGS 9", imageUrl: "https://images.pokemontcg.io/ecard2/26.png", estimatedValue: 35000, category: "Pokémon TCG" },
  ],
  alex: [
    { id: "a-item-1", name: "Freddy Funko Ghost Rider Metallic (SDCC 2013)", imageUrl: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&h=400&fit=crop&auto=format&q=80&seed=5", estimatedValue: 33500, category: "Funko Pop" },
    { id: "a-item-2", name: "Funko Pop Iron Man #04 (2010 Original)", imageUrl: "https://images.unsplash.com/photo-1608889175638-9322300c46e8?w=400&h=400&fit=crop&auto=format&q=80&seed=2", estimatedValue: 280, category: "Funko Pop" },
  ],
  sam: [
    { id: "s-item-1", name: "Charizard (Base Set) BGS 9", imageUrl: "https://images.pokemontcg.io/base1/4.png", estimatedValue: 7200, category: "Pokémon TCG" },
    { id: "s-item-2", name: "Blastoise (Base Set) PSA 8", imageUrl: "https://images.pokemontcg.io/base1/2.png", estimatedValue: 1800, category: "Pokémon TCG" },
    { id: "s-item-3", name: "Venusaur (Base Set) PSA 7", imageUrl: "https://images.pokemontcg.io/base1/15.png", estimatedValue: 900, category: "Pokémon TCG" },
  ],
  jordan: [
    { id: "j-item-1", name: "Air Jordan 1 Retro High OG 'Chicago' DS", imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop&auto=format&q=80&seed=43", estimatedValue: 900, category: "Sneakers" },
    { id: "j-item-2", name: "Nike Dunk Low Panda DS (US 10)", imageUrl: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=400&h=400&fit=crop&auto=format&q=80&seed=42", estimatedValue: 180, category: "Sneakers" },
  ],
};

// ── Quick-reaction emojis ────────────────────────────────────────────────────

const QUICK_EMOJIS = ["🔥", "🤝", "👀", "💯", "📈", "😎", "💎", "✨"];

// ── Spicy message placeholders ────────────────────────────────────────────────

const MSG_PLACEHOLDERS = [
  "Let's make a deal! 🤝",
  "I've been looking for this everywhere...",
  "Open to negotiating — hit me up!",
  "Fair offer incoming, let me know what you think 👀",
  "This one's got your name on it 🔥",
];

// ── Modal ────────────────────────────────────────────────────────────────────

export default function ProposeTradeModal({ isOpen, targetItem, targetUser, onClose, onTradeSent, prefill, skipNavigation }: Props) {
  // Pull live inventory directly from context — always reflects uniques_inventory_v2
  const { addTradeHistory, lockItems, items: contextItems } = useInventory();
  const { addNotification } = useNotifications();

  const [selectedTargetItem, setSelectedTargetItem] = useState<CollectibleItem | null>(targetItem ?? null);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [cashOffer,      setCashOffer]      = useState(0); // cash I'm adding
  const [theirCashOffer, setTheirCashOffer] = useState(0); // cash I'm requesting from them
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Reset form whenever the modal opens — apply prefill values if provided
  useEffect(() => {
    if (!isOpen) return;
    setSelectedTargetItem(prefill?.targetItem ?? targetItem ?? null);
    setShowItemPicker(false);
    setSelectedIds(prefill?.selectedIds ? new Set(prefill.selectedIds) : new Set());
    setCashOffer(prefill?.cashOffer ?? 0);
    setTheirCashOffer(prefill?.theirCashOffer ?? 0);
    setSent(false);
    setMessage("");
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Picker items for the current target user (keyed by lowercase name)
  const pickerItems = USER_TRADEABLE[targetUser.name.toLowerCase()] ?? [];

  // When editing/countering (prefill present), show all items including locked ones so
  // the user can re-offer items currently tied to the offer they're modifying.
  const myTradeable = useMemo(
    () => (prefill ? contextItems : contextItems.filter((i) => !i.isLocked)),
    [contextItems, prefill],
  );

  const selectedItems = useMemo(
    () => myTradeable.filter((i) => selectedIds.has(i.id)),
    [myTradeable, selectedIds],
  );

  const selectedValue = useMemo(
    () => selectedItems.reduce((s, i) => s + (i.estimatedValue ?? 0), 0),
    [selectedItems],
  );

  // Pick a random engaging placeholder once per modal open
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const msgPlaceholder = useMemo(
    () => MSG_PLACEHOLDERS[Math.floor(Math.random() * MSG_PLACEHOLDERS.length)],
    [isOpen],
  );

  if (!isOpen) return null;

  const toggleItem = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ── Send offer ────────────────────────────────────────────────────────────
  const handleSend = () => {
    if ((selectedIds.size === 0 && cashOffer <= 0) || !selectedTargetItem) return;

    const note = `Offer sent to ${targetUser.name} for "${selectedTargetItem.name}"`;

    if (selectedIds.size > 0) lockItems(Array.from(selectedIds), note, "sent");

    const now = new Date().toISOString();
    const entry: TradeHistoryEntry = {
      id:        `trade-${Date.now()}`,
      from:      { name: currentUser.name,  avatar: currentUser.avatar  },
      to:        { name: targetUser.name,   avatar: targetUser.avatar   },
      fromItems: selectedItems.map((i) => ({
        id:             i.id,
        name:           i.name,
        imageUrl:       i.customImage ?? i.imageUrl,
        estimatedValue: i.estimatedValue,
      })),
      fromCash: cashOffer,
      toItems: [{
        id:             selectedTargetItem.id,
        name:           selectedTargetItem.name,
        imageUrl:       selectedTargetItem.imageUrl,
        estimatedValue: selectedTargetItem.estimatedValue,
      }],
      toCash:    theirCashOffer,
      status:    "pending",
      createdAt: now,
      message:   message.trim() || undefined,
    };
    addTradeHistory(entry);
    onTradeSent?.(entry);
    addNotification({
      id:      Date.now().toString(),
      type:    "trade",
      message: `🤝 Trade Offer successfully sent to ${targetUser.name}!`,
      time:    "Just now",
      isRead:  false,
      href:    "/?tab=history",
    });

    // Store for inbox pre-population if the user visits later
    const payload = {
      targetUser:     targetUser.name.toLowerCase(),
      offeredItems:   selectedItems.map((i) => ({ name: i.name, imageUrl: (i as { customImage?: string }).customImage ?? i.imageUrl })),
      requestedItems: selectedTargetItem
        ? [{ name: selectedTargetItem.name, imageUrl: selectedTargetItem.imageUrl }]
        : [],
      cashOffer,
      theirCashOffer,
      message: message.trim() || undefined,
    };
    try { sessionStorage.setItem("injected_trade", JSON.stringify(payload)); } catch { /* quota */ }

    // Always show success state — never redirect, keep the user on their current page
    setSent(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Propose a trade"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="relative w-full max-w-md bg-charcoal-dark rounded-3xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up border border-white/10 shadow-2xl">

        {/* ── Item Picker Overlay ── */}
        {showItemPicker && (
          <div className="absolute inset-0 z-10 bg-charcoal-dark rounded-3xl flex flex-col animate-slide-up">
            {/* Picker header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
              <button
                onClick={() => setShowItemPicker(false)}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-cream/60" />
              </button>
              <div>
                <p className="text-[10px] text-cream/30 font-bold uppercase tracking-wider leading-none mb-0.5">Browse</p>
                <h3 className="text-sm font-bold text-cream leading-tight">{targetUser.name}&apos;s Items</h3>
              </div>
            </div>

            {/* Picker grid — PowerPicker in single-select mode */}
            <div className="flex-1 overflow-y-auto scrollbar-none px-5 pb-5 pt-3">
              {pickerItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-cream/30 text-sm font-medium">No pieces listed</p>
                  <p className="text-cream/20 text-xs mt-1">
                    {targetUser.name} hasn&apos;t listed any pieces for trade yet.
                  </p>
                </div>
              ) : (
                <PowerPicker
                  items={pickerItems as PowerPickerItem[]}
                  mode="single"
                  onSelect={(item) => {
                    setSelectedTargetItem(item as CollectibleItem);
                    setShowItemPicker(false);
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-cream">Make an Offer</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-cream/60" />
          </button>
        </div>

        {/* ── Success State ── */}
        {sent ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center animate-scale-in">
              <Check className="w-8 h-8 text-green-400" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-lg font-bold text-cream mb-1">Offer Sent!</p>
              <p className="text-sm text-cream/40 leading-relaxed">
                Your offer has been sent to{" "}
                <span className="text-cream/70 font-semibold">{targetUser.name}</span>.
                Your pieces are locked while awaiting their response.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-1 px-8 py-3 rounded-2xl bg-primary/20 text-primary font-bold text-sm hover:bg-primary/30 active:scale-95 transition-all"
            >
              Got it
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto scrollbar-none overscroll-contain">

              {/* ── YOU WANT section ── */}
              <div className="px-5 pt-5 pb-4 border-b border-white/[0.05]">
                <p className="text-[10px] text-cream/30 font-bold uppercase tracking-wider mb-2.5">
                  You want · {targetUser.name}&apos;s item
                </p>

                {selectedTargetItem ? (
                  /* ── Selected item card ── */
                  <div className="relative flex items-start gap-3 p-3 rounded-2xl bg-background-light border border-primary/20">
                    <div className={`w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden ${
                      isWhiteBg(selectedTargetItem) ? "bg-white p-1" : "bg-white/[0.05] p-1"
                    }`}>
                      <img src={selectedTargetItem.imageUrl} alt={selectedTargetItem.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                      <p className="text-sm font-bold text-cream leading-snug">{selectedTargetItem.name}</p>
                      <p className="text-xs text-cream/40 mt-0.5">{selectedTargetItem.category}</p>
                      {(selectedTargetItem.graded || selectedTargetItem.condition ||
                        selectedTargetItem.category === "Funko Pop" || selectedTargetItem.category === "Lego") && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <CategoryBadge item={selectedTargetItem} />
                        </div>
                      )}
                      {selectedTargetItem.estimatedValue != null && (
                        <p className="text-sm font-bold text-primary mt-1.5">
                          {formatValue(selectedTargetItem.estimatedValue)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowItemPicker(true)}
                      className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white/[0.08] hover:bg-white/[0.14] flex items-center justify-center transition-colors"
                      title="Change item"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-cream/40" />
                    </button>
                  </div>
                ) : (
                  /* ── Empty placeholder — open picker ── */
                  <button
                    onClick={() => setShowItemPicker(true)}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-white/[0.10] hover:border-primary/40 hover:bg-primary/[0.04] transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] group-hover:bg-primary/10 flex items-center justify-center flex-shrink-0 transition-colors">
                      <Plus className="w-5 h-5 text-cream/25 group-hover:text-primary/60 transition-colors" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-cream/35 group-hover:text-cream/60 transition-colors leading-snug">
                        Select an item from {targetUser.name}
                      </p>
                      <p className="text-[10px] text-cream/20 mt-0.5">Tap to browse their tradeable items</p>
                    </div>
                  </button>
                )}

                {/* ── Request cash — grouped with "You want" ── */}
                <div className="mt-3">
                  <p className="text-[9px] text-cream/20 font-bold uppercase tracking-wider mb-1.5">
                    + Also request cash
                  </p>
                  <div className="relative">
                    <DollarSign className="absolute top-1/2 -translate-y-1/2 left-3 w-3.5 h-3.5 text-amber-400/40 pointer-events-none" />
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={theirCashOffer || ""}
                      onChange={(e) => setTheirCashOffer(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                      placeholder="0"
                      className="w-full pl-8 pr-24 py-2 rounded-xl bg-amber-400/[0.04] border border-amber-400/[0.12] text-sm text-cream/80 placeholder:text-cream/20 focus:outline-none focus:border-amber-400/30 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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

              {/* ── Live offer summary + equity indicator ── */}
              {(selectedItems.length > 0 || cashOffer > 0 || theirCashOffer > 0) && (
                <div className="px-5 pb-3 space-y-2">
                  {/* Offer summary row */}
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-2xl bg-surface/10 border border-surface/20">
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedItems.length > 0 && (
                        <div className="flex -space-x-2">
                          {selectedItems.slice(0, 3).map((item) => (
                            <div
                              key={item.id}
                              className={`w-7 h-7 rounded-lg border-2 border-charcoal-dark flex items-center justify-center overflow-hidden ${
                                isWhiteBg(item) ? "bg-white" : "bg-white/10"
                              }`}
                            >
                              <img src={item.customImage ?? item.imageUrl} alt="" className="w-full h-full object-contain" />
                            </div>
                          ))}
                          {selectedItems.length > 3 && (
                            <div className="w-7 h-7 rounded-lg border-2 border-charcoal-dark bg-surface/20 flex items-center justify-center">
                              <span className="text-[9px] text-cream/60 font-bold">+{selectedItems.length - 3}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {cashOffer > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-green-500/15 border border-green-500/20 text-[10px] font-bold text-green-400">
                          <DollarSign className="w-2.5 h-2.5" />
                          +{formatValue(cashOffer)}
                        </span>
                      )}
                      {theirCashOffer > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/20 text-[10px] font-bold text-amber-400">
                          <DollarSign className="w-2.5 h-2.5" />
                          req. {formatValue(theirCashOffer)}
                        </span>
                      )}
                      {selectedItems.length > 0 && (
                        <span className="text-xs text-cream/60 font-medium">
                          {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-surface-light">{formatValue(selectedValue + cashOffer)}</span>
                  </div>

                  {/* Equity bar — compares both sides' total values */}
                  {selectedTargetItem && (selectedTargetItem.estimatedValue ?? 0) + theirCashOffer > 0 && (
                    <EquityBar
                      offered={selectedValue + cashOffer}
                      asking={(selectedTargetItem.estimatedValue ?? 0) + theirCashOffer}
                    />
                  )}
                </div>
              )}

              {/* ── YOUR OFFER section ── */}
              <div className="px-5 pt-4 pb-5">
                <p className="text-[10px] text-cream/30 font-bold uppercase tracking-wider mb-3">
                  Your offer · select pieces to trade
                </p>

                {myTradeable.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-cream/30 text-sm font-medium">Your vault is empty</p>
                    <p className="text-cream/20 text-xs mt-1 max-w-[200px] leading-relaxed">
                      Curate pieces to your vault to start trading.
                    </p>
                  </div>
                ) : (
                  <PowerPicker
                    items={myTradeable as PowerPickerItem[]}
                    mode="multi"
                    selectedIds={selectedIds}
                    onToggle={toggleItem}
                  />
                )}

                {/* ── Add Cash to offer (from me) ── */}
                <div className="mt-4">
                  <p className="text-[9px] text-cream/20 font-bold uppercase tracking-wider mb-1.5">
                    + Sweeten with cash
                  </p>
                  <div className="relative">
                    <DollarSign className="absolute top-1/2 -translate-y-1/2 left-3 w-3.5 h-3.5 text-green-400/40 pointer-events-none" />
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={cashOffer || ""}
                      onChange={(e) => setCashOffer(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                      placeholder="0"
                      className="w-full pl-8 pr-24 py-2 rounded-xl bg-green-400/[0.04] border border-green-400/[0.12] text-sm text-cream/80 placeholder:text-cream/20 focus:outline-none focus:border-green-400/30 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    {cashOffer > 0 ? (
                      <span className="absolute top-1/2 -translate-y-1/2 right-3 text-xs font-bold text-green-400">
                        {formatValue(cashOffer)}
                      </span>
                    ) : (
                      <span className="absolute top-1/2 -translate-y-1/2 right-3 text-[10px] text-cream/20 font-medium">
                        optional
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>{/* end flex-1 scroll area */}

            {/* ── Footer ── */}
            <div className="px-5 pb-6 pt-3 border-t border-white/[0.06] flex-shrink-0 space-y-3">
              {/* Message input + quick emoji picker */}
              <div className="relative">
                <MessageSquare className="absolute top-2.5 left-3 w-3.5 h-3.5 text-cream/25 pointer-events-none" />
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={msgPlaceholder}
                  maxLength={200}
                  rows={2}
                  className="w-full pl-8 pr-3 pb-7 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs text-cream/80 placeholder:text-cream/25 resize-none focus:outline-none focus:border-primary/30 transition-colors"
                />
                {/* Quick-emoji popover */}
                {showEmojiPicker && (
                  <div className="absolute bottom-[calc(100%-4px)] right-0 mb-1 flex gap-1 p-1.5 rounded-2xl bg-charcoal-dark/95 border border-white/[0.10] shadow-lg backdrop-blur-sm animate-slide-up z-10">
                    {QUICK_EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => { setMessage((m) => m + e); setShowEmojiPicker(false); }}
                        className="w-8 h-8 text-lg rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors active:scale-90"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
                {/* Smile toggle */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((v) => !v)}
                  className={`absolute bottom-2 right-2.5 w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                    showEmojiPicker
                      ? "bg-primary/20 text-primary"
                      : "text-cream/25 hover:text-cream/50 hover:bg-white/[0.06]"
                  }`}
                  aria-label="Quick emojis"
                >
                  <Smile className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-3 rounded-2xl bg-white/[0.06] text-cream/40 font-bold text-sm hover:bg-white/10 active:scale-[0.97] transition-all"
                >
                  Close
                </button>
                <button
                  onClick={handleSend}
                  disabled={!selectedTargetItem || (selectedIds.size === 0 && cashOffer <= 0)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/20 text-primary font-bold text-sm hover:bg-primary/30 active:scale-[0.97] transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Send className="w-4 h-4" />
                  Send Offer{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
