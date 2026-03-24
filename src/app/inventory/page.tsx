"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { driver } from "driver.js";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { useInventory } from "@/lib/InventoryContext";
import AddItemModal from "@/components/AddItemModal";
import EditProfileModal, { UserProfile } from "@/components/EditProfileModal";
import GrailsPickerModal from "@/components/GrailsPickerModal";
import ReviewsListModal from "@/components/ReviewsListModal";
import ItemConfigForm, { ItemConfig } from "@/components/ItemConfigForm";
import MarketplaceModal from "@/components/MarketplaceModal";
import { PowerPicker } from "@/components/PowerPicker";
import type { PowerPickerItem } from "@/components/PowerPicker";
import EquityBar from "@/components/EquityBar";
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { tradeOffers } from "@/lib/data";
import { formatValue } from "@/lib/format";
import { CollectibleItem, Category, ItemCondition, ItemStatus, TradeHistoryEntry } from "@/lib/types";
import type { MasterItem } from "@/lib/catalog/types";
import { CATEGORIES } from "@/lib/constants";
import {
  Plus,
  ArrowLeftRight,
  Crown,
  GripVertical,
  Star,
  DollarSign,
  TrendingUp,
  Package,
  Database,
  Edit3,
  X,
  Save,
  Trash2,
  ChevronLeft,
  Shield,
  Tag,
  Award,
  BarChart3,
  Lock,
  Unlock,
  CheckCircle2,
  ArrowRight,
  RotateCcw as HistoryIcon,
  Zap,
  ShieldCheck,
  CreditCard,
  Truck,
  RefreshCw,
  Calendar,
  TrendingDown,
  Info,
  Crosshair,
  Target,
  Bell,
  Search,
  MessageSquare,
  Smile,
  Send,
  Globe,
  Flame,
  Gem,
  Telescope,
  Rocket,
  Heart,
  Pin,
} from "lucide-react";
import { type Achievement, ACHIEVEMENTS } from "@/lib/achievements";
import AchievementModal from "@/components/AchievementModal";
import { useAchievements } from "@/lib/AchievementsContext";
import { isDemoUser } from "@/lib/demo";

const DUMMY_DATA_MAP: Record<string, { name: string; val: number }[]> = {
  "1W": [
    { name: "Mon", val: 49800 }, { name: "Tue", val: 50200 }, { name: "Wed", val: 51500 },
    { name: "Thu", val: 50900 }, { name: "Fri", val: 52100 }, { name: "Sat", val: 53400 },
    { name: "Sun", val: 54200 },
  ],
  "1M": [
    { name: "W1", val: 48200 }, { name: "W2", val: 49600 }, { name: "W3", val: 51400 },
    { name: "W4", val: 54200 },
  ],
  "3M": [
    { name: "Jan", val: 44000 }, { name: "Feb", val: 47500 }, { name: "Mar", val: 54200 },
  ],
  "1Y": [
    { name: "Apr", val: 38000 }, { name: "Jun", val: 40500 }, { name: "Aug", val: 43200 },
    { name: "Oct", val: 48900 }, { name: "Dec", val: 51000 }, { name: "Mar", val: 54200 },
  ],
  "ALL": [
    { name: "2022", val: 12000 }, { name: "2023", val: 28500 }, { name: "2024", val: 41000 },
    { name: "2025", val: 48200 }, { name: "2026", val: 54200 },
  ],
};

// Achievement type + data are imported from @/lib/achievements


// ── Soft paywall modal ────────────────────────────────────────────────────
function LimitReachedModal({ onClose, onUpgrade }: { onClose: () => void; onUpgrade: () => void }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-charcoal-dark rounded-3xl p-6 animate-slide-up border border-white/[0.08] shadow-2xl space-y-4">
        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/10 flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-cream/50" />
        </button>

        <div className="flex flex-col items-center text-center gap-3 pt-1">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Package className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-lg font-extrabold text-cream leading-tight">Vault Capacity Reached</p>
            <p className="text-xs text-cream/40 mt-1.5 leading-relaxed max-w-[240px] mx-auto">
              You&apos;ve hit the <span className="text-cream/60 font-semibold">10-piece limit</span> on the Free plan.
              Upgrade to Uniques Pro for an unlimited vault and Wall-Street analytics.
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <button
            onClick={onUpgrade}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-charcoal-dark font-extrabold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <Zap className="w-4 h-4 relative" />
            <span className="relative">Upgrade to Pro — $4.99/mo</span>
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl text-cream/40 text-sm font-semibold hover:text-cream/60 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

// ── localStorage keys ────────────────────────────────────────────────────
const STORAGE_PROFILE = "uniques_profile";
const STORAGE_GRAILS  = "uniques_pinned_grails";

// ── Loaders ──────────────────────────────────────────────────────────────
// fallback is the session-derived default — only used when no saved profile exists
function loadProfile(fallback: UserProfile): UserProfile {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = localStorage.getItem(STORAGE_PROFILE);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.name) return { ...fallback, ...parsed };
    }
  } catch { /* corrupt data */ }
  return fallback;
}

function loadPinnedGrails(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_GRAILS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* corrupt data */ }
  return [];
}


// ── Trophy Room — All Achievements (inline, respects Header + BottomNav) ─────
function AchievementsAllView({
  achievements,
  onClose,
  onSelect,
}: {
  achievements: Achievement[];
  onClose:      () => void;
  onSelect:     (a: Achievement) => void;
}) {
  const unlocked = achievements.filter((a) => a.status === "unlocked").length;
  const pct      = Math.round((unlocked / achievements.length) * 100);

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      {/* Section header — back button + title */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4 border-b border-white/[0.06]">
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-4 h-4 text-cream/60" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-black text-cream tracking-tight leading-tight">Trophy Room</h1>
          <p className="text-[11px] text-cream/30 font-semibold">
            {unlocked} of {achievements.length} unlocked
          </p>
        </div>
        <Award className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
      </div>

      {/* Progress bar */}
      <div className="px-5 pt-4 pb-4 border-b border-white/[0.05]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-cream/40 font-semibold">Completion</p>
          <p className="text-[11px] text-cream/70 font-extrabold">{pct}%</p>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-3 px-4 pt-4 pb-6">
        {achievements.map((achievement, i) => {
          const Icon   = achievement.icon;
          const locked = achievement.status === "locked";
          return (
            <button
              key={achievement.id}
              onClick={() => onSelect(achievement)}
              className={`relative flex flex-col items-center gap-2 pt-4 pb-3 px-2 rounded-2xl text-center active:scale-95 transition-all animate-scale-in overflow-hidden ${
                locked
                  ? "bg-background-light/50 border border-dashed border-white/[0.08] grayscale opacity-50"
                  : "bg-[#1A1818]"
              }`}
              style={{
                animationDelay:    `${i * 0.03}s`,
                animationFillMode: "both",
                ...(!locked ? {
                  border:    `1px solid ${achievement.glow.replace(/[\d.]+\)$/, "0.4)")}`,
                  boxShadow: `0 0 14px -4px ${achievement.glow}, inset 0 1px 0 rgba(255,255,255,0.04)`,
                } : {}),
              }}
            >
              {/* Icon */}
              <div className="relative flex-shrink-0">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center ${locked ? "bg-white/[0.04]" : "bg-white/[0.07]"}`}
                  style={!locked ? { boxShadow: `0 0 12px -3px ${achievement.glow}` } : undefined}
                >
                  <Icon className={`w-5 h-5 ${locked ? "text-cream/25" : achievement.color}`} strokeWidth={locked ? 1.5 : 2} />
                </div>
                {locked && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#221F1F] border border-white/[0.08] flex items-center justify-center">
                    <Lock className="w-2 h-2 text-cream/35" />
                  </div>
                )}
              </div>

              <p className={`text-[10px] font-extrabold leading-tight line-clamp-2 ${locked ? "text-cream/25" : "text-cream/90"}`}>
                {achievement.title}
              </p>

              {/* Bottom glow strip */}
              {!locked && (
                <div
                  className="absolute bottom-0 left-3 right-3 h-[1.5px] rounded-full"
                  style={{ background: `linear-gradient(90deg, transparent, ${achievement.glow}, transparent)` }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Filter helper ────────────────────────────────────────────────────────
const PROFILE_FILTERS = ["All", "In Trade", ...CATEGORIES] as const;
type ProfileFilter = (typeof PROFILE_FILTERS)[number];

// ── Add to Radar Modal — live catalog search via eBay API ─────────────────
function AddToRadarModal({
  isOpen, onClose, onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: { name: string; imageUrl: string; category: string; marketValue: number }) => void;
}) {
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState<MasterItem[]>([]);
  const [loading, setLoading]     = useState(false);
  const [searched, setSearched]   = useState(false);
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q || q.length < 2) {
      setResults([]);
      setLoading(false);
      setSearched(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/catalog/search?q=${encodeURIComponent(q)}&pageSize=12`);
        const data = await res.json();
        setResults(data.items || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    }, 300);
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setLoading(false);
      setSearched(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className="relative w-full max-w-lg bg-[#1A1818] rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden animate-slide-up flex flex-col"
        style={{ maxHeight: "82vh", boxShadow: "0 0 0 1px rgba(202,230,206,0.07), 0 32px 64px rgba(0,0,0,0.65)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-[#CAE6CE]/10 border border-[#CAE6CE]/20 flex items-center justify-center">
              <Target className="w-3.5 h-3.5 text-[#CAE6CE]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-cream">Add to Radar</h2>
              <p className="text-[10px] text-cream/30">Search the catalog — results are powered by live eBay data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-cream/40 hover:text-cream/70 transition-all flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cream/25 pointer-events-none" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); doSearch(e.target.value); }}
              placeholder="e.g. Charizard Base Set, LEGO AT-AT…"
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-cream text-sm placeholder:text-cream/20 focus:outline-none focus:ring-2 focus:ring-[#CAE6CE]/20 focus:border-[#CAE6CE]/25 transition-all"
            />
            {loading && (
              <RefreshCw className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cream/30 animate-spin pointer-events-none" />
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/[0.05] mx-5" />

        {/* Results / states */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Idle — no query yet */}
          {!query && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#CAE6CE]/[0.07] border border-[#CAE6CE]/15 flex items-center justify-center">
                <Search className="w-6 h-6 text-[#CAE6CE]/40" />
              </div>
              <div>
                <p className="text-cream/40 text-sm font-semibold">Search the catalog</p>
                <p className="text-cream/20 text-xs mt-1 max-w-[200px] leading-relaxed">
                  Type a card name, set, or item — we'll pull live results
                </p>
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && query && (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.04] animate-pulse">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-white/[0.06] rounded-full w-3/4" />
                    <div className="h-2 bg-white/[0.04] rounded-full w-1/2" />
                    <div className="h-2 bg-white/[0.04] rounded-full w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No results */}
          {!loading && searched && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
              <Search className="w-8 h-8 text-cream/10" />
              <p className="text-cream/30 text-sm font-semibold">No results found</p>
              <p className="text-cream/20 text-xs">Try a different search term</p>
            </div>
          )}

          {/* Results grid */}
          {!loading && results.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onAdd({
                      name: item.name,
                      imageUrl: item.imageLarge || item.imageSmall,
                      category: item.category,
                      marketValue: item.marketPrice,
                    });
                    onClose();
                  }}
                  className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-[#CAE6CE]/25 text-left transition-all active:scale-[0.97] group"
                >
                  <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden ${
                    item.category === "Lego" ? "bg-white p-0.5" : "bg-white/[0.06] p-1"
                  }`}>
                    <img
                      src={item.imageSmall || item.imageLarge}
                      alt={item.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-cream leading-snug line-clamp-2 group-hover:text-cream/90 transition-colors">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-cream/30 mt-0.5">{item.category}</p>
                    {item.marketPrice > 0 && (
                      <p className="text-[10px] font-bold text-[#CAE6CE]/60 mt-1">
                        ~${item.marketPrice >= 1000 ? `${(item.marketPrice / 1000).toFixed(1)}K` : item.marketPrice}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-white/[0.05] flex items-center gap-2">
          <Bell className="w-3 h-3 text-cream/20 flex-shrink-0" />
          <p className="text-[10px] text-cream/20">Tap any result to lock it onto your Radar and set your bounty terms.</p>
        </div>
      </div>
    </div>
  );
}

// ── Radar types + seed data ───────────────────────────────────────────────
type RadarEntry = {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  marketValue: number;
  budget?: string;      // legacy display string from seed data
  cashOffer?: number;   // numeric cash offer from Bounty Builder
  tradingItemIds?: string[];
  note?: string;
  matchCount: number;
};

const RADAR_SEED: RadarEntry[] = [
  {
    id: "radar-1",
    name: "Charizard VSTAR Rainbow Rare",
    imageUrl: "https://images.pokemontcg.io/swsh9/174.png",
    category: "Pokémon TCG",
    marketValue: 280,
    budget: "$300",
    matchCount: 3,
  },
  {
    id: "radar-2",
    name: "LEGO Icons Eiffel Tower #10307",
    imageUrl: "https://cdn.rebrickable.com/media/sets/10307-1.jpg",
    category: "Lego",
    marketValue: 630,
    matchCount: 1,
  },
  {
    id: "radar-3",
    name: "Pikachu VMAX Rainbow Rare",
    imageUrl: "https://images.pokemontcg.io/swsh4/188.png",
    category: "Pokémon TCG",
    marketValue: 140,
    budget: "$150",
    matchCount: 0,
  },
];

// ── Sortable grid item ──────────────────────────────────────────────────
function SortableItem({ item, onTap }: { item: CollectibleItem; onTap: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative rounded-2xl overflow-hidden bg-background-light shadow-soft group cursor-pointer"
      onClick={onTap}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-1.5 left-1.5 z-10 w-6 h-6 rounded-lg bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-3.5 h-3.5 text-white/70" />
      </button>

      <div className={`aspect-square flex items-center justify-center ${
        item.category === "Lego" || item.category === "Funko Pop"
          ? "bg-white p-2"
          : "bg-white/[0.05] p-3"
      }`}>
        <img
          src={item.customImage || item.imageUrl}
          alt={item.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      <div className="px-2 py-1.5">
        <p className="text-[10px] text-cream/80 truncate leading-tight font-medium">
          {item.name}
        </p>
        {item.isLocked ? (
          <p className="text-[9px] font-bold text-amber-400 mt-0.5 flex items-center gap-1 flex-wrap">
            <span className="flex items-center gap-0.5">
              <Lock className="w-2 h-2" />
              In Trade
            </span>
            {item.estimatedValue ? (
              <span className="text-cream/35 font-normal">· {formatValue(item.estimatedValue)}</span>
            ) : null}
          </p>
        ) : item.estimatedValue ? (
          <p className="text-[9px] text-primary/70 font-semibold mt-0.5">
            {formatValue(item.estimatedValue)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ── Trust stars ──────────────────────────────────────────────────────────
function TrustStars({ score, reviewCount, onClick }: { score: number; reviewCount?: number; onClick?: () => void }) {
  const fullStars = Math.floor(score);
  const hasHalf = score - fullStars >= 0.5;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-0.5 hover:opacity-80 transition-opacity"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < fullStars
              ? "text-yellow-400 fill-yellow-400"
              : i === fullStars && hasHalf
              ? "text-yellow-400 fill-yellow-400/50"
              : "text-cream/15"
          }`}
        />
      ))}
      <span className="text-xs text-cream/50 ml-1 font-semibold">{score.toFixed(1)}</span>
      {reviewCount !== undefined && (
        <span className="text-[10px] text-cream/30 ml-0.5">({reviewCount} reviews)</span>
      )}
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// ██  PROFILE PAGE  ███████████████████████████████████████████████████████
// ═════════════════════════════════════════════════════════════════════════

export default function ProfilePage() {
  const router = useRouter();

  // ── Tour step 7 of 7 — baton passed from /inbox via tourStep=profile ────
  useEffect(() => {
    if (localStorage.getItem("tourStep") !== "profile") return;

    const t = setTimeout(() => {
      if (localStorage.getItem("tourStep") !== "profile") return;
      localStorage.removeItem("tourStep");

      const el = document.querySelector("[data-tour='header-search']");
      if (!el) return;

      const driverObj = driver({
        showProgress: true,
        allowClose: true,
        stagePadding: 8,
        disableActiveInteraction: true,
        steps: [
          {
            element: "[data-tour='header-search']",
            popover: {
              title: "⚡ Hunt Your Grails",
              description: "Search for your next chase piece, add it to your vault, and let the offers roll in.",
              side: "bottom" as const,
              align: "start" as const,
              nextBtnText: "Let's Cook",
              progressText: "7 of 7",
            },
          },
        ],
      });
      driverObj.drive();
    }, 2000);

    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: session, status: authStatus } = useSession();
  const isFree = !session?.user?.tier || session.user.tier === "free";
  const isDemo = isDemoUser(session?.user?.email);
  const { items, setItems, updateItem, removeItem, unlockItems, addTradeHistory, addRawItem, tradeHistoryEntries } = useInventory();
  const { achievements } = useAchievements();
  const [profile, setProfile] = useState<UserProfile>({
    name: "", bio: "", avatar: "", joinDate: "",
  });
  const [pinnedGrailIds, setPinnedGrailIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [showAddModal, setShowAddModal]     = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showEditPulse, setShowEditPulse]   = useState(false);
  const [showGrailsPicker, setShowGrailsPicker] = useState(false);
  const [isChartExpanded, setIsChartExpanded] = useState(false);
  const [timeframe, setTimeframe] = useState("1M");
  const [showReviews, setShowReviews] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ProfileFilter>("All");
  const [editingItem, setEditingItem] = useState<CollectibleItem | null>(null);
  const [viewMode, setViewMode] = useState(true);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [editConfig, setEditConfig] = useState<ItemConfig>({
    askingPrice: undefined,
    condition: "Near Mint",
    status: "For Trade",
    notes: "",
  });
  const [profileTab, setProfileTab]       = useState<"collection" | "radar">("collection");
  const [radarItems, setRadarItems]       = useState<RadarEntry[]>([]);
  const [radarToast, setRadarToast]       = useState("");
  const [radarViewItem, setRadarViewItem] = useState<RadarEntry | null>(null);
  const [showAddToRadar, setShowAddToRadar] = useState(false);
  const [editingRadarEntry, setEditingRadarEntry] = useState<RadarEntry | null>(null);
  const [editCash, setEditCash]                   = useState(0);
  const [editSelectedIds, setEditSelectedIds]     = useState<Set<string>>(new Set());
  const [editNote, setEditNote]                   = useState("");
  const [editShowEmoji, setEditShowEmoji]         = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [pinnedAchievementIds, setPinnedAchievementIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set<string>();
    try {
      const raw = localStorage.getItem("uniques_pinned_achievements");
      if (!raw) return new Set<string>();
      const parsed = JSON.parse(raw);
      return new Set<string>(Array.isArray(parsed) ? parsed : []);
    } catch { return new Set<string>(); }
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Persist pinned achievements to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("uniques_pinned_achievements", JSON.stringify(Array.from(pinnedAchievementIds)));
    } catch { /* quota */ }
  }, [pinnedAchievementIds]);

  const togglePin = (id: string) => {
    setPinnedAchievementIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Sort: pinned → unlocked → locked  (uses live context achievements)
  const sortedAchievements = useMemo(() => {
    return [...achievements].sort((a, b) => {
      const ap = pinnedAchievementIds.has(a.id) ? 0 : 1;
      const bp = pinnedAchievementIds.has(b.id) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      const au = a.status === "unlocked" ? 0 : 1;
      const bu = b.status === "unlocked" ? 0 : 1;
      return au - bu;
    });
  }, [pinnedAchievementIds]);

  // ── Category pills drag-to-scroll ─────────────────────────────────────
  const pillsRef = useRef<HTMLDivElement>(null);
  const pillsDrag = useRef({ active: false, startX: 0, scrollLeft: 0 });
  const handlePillsDown = (e: React.MouseEvent) => {
    pillsDrag.current = { active: true, startX: e.pageX, scrollLeft: pillsRef.current?.scrollLeft ?? 0 };
    if (pillsRef.current) pillsRef.current.style.cursor = "grabbing";
  };
  const handlePillsMove = (e: React.MouseEvent) => {
    if (!pillsDrag.current.active || !pillsRef.current) return;
    e.preventDefault();
    pillsRef.current.scrollLeft = pillsDrag.current.scrollLeft - (e.pageX - pillsDrag.current.startX);
  };
  const handlePillsEnd = () => {
    pillsDrag.current.active = false;
    if (pillsRef.current) pillsRef.current.style.cursor = "grab";
  };

  useEffect(() => {
    if (authStatus === "loading") return;
    const sessionFallback: UserProfile = {
      name: session?.user?.name ?? "Collector",
      bio: "",
      avatar: session?.user?.image ?? "",
      joinDate: new Date().toISOString().split("T")[0],
    };

    // Immediately show cached localStorage data to avoid flash
    setProfile(loadProfile(sessionFallback));
    setPinnedGrailIds(loadPinnedGrails());
    if (isDemoUser(session?.user?.email)) setRadarItems(RADAR_SEED);

    // Then hydrate from the real DB (non-demo users)
    if (!isDemoUser(session?.user?.email)) {
      fetch("/api/profile")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (!data) return;
          setProfile((prev) => ({
            ...prev,
            name:                data.name                || prev.name,
            bio:                 data.bio                 ?? prev.bio,
            avatar:              data.avatar              || prev.avatar,
            paymentMethods:      data.paymentMethods      ?? prev.paymentMethods,
            shippingPreferences: data.shippingPreferences ?? prev.shippingPreferences,
          }));
          // Keep localStorage in sync so instant hydration on next visit
          try { localStorage.setItem(STORAGE_PROFILE, JSON.stringify(data)); } catch { /* quota */ }
        })
        .catch(() => { /* network offline — cached data stays */ });
    }

    setHydrated(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus]);

  // Show one-time pulse on Edit Profile for new real users
  useEffect(() => {
    if (authStatus === "loading") return;
    if (isDemoUser(session?.user?.email)) return; // demo account doesn't need onboarding hint
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("profile_edit_tipped")) {
      setShowEditPulse(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus]);

  // Persist profile and grails together to prevent partial-write race conditions
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile)); } catch { /* quota */ }
    try { localStorage.setItem(STORAGE_GRAILS, JSON.stringify(pinnedGrailIds)); } catch { /* quota */ }
  }, [profile, pinnedGrailIds, hydrated]);

  const totalValue = useMemo(
    () => items.reduce((sum, item) => sum + (item.estimatedValue || 0), 0),
    [items]
  );

  const grails = useMemo(() => {
    // Free users always get auto Top 3 by value — no manual picks
    if (isFree) {
      return [...items]
        .sort((a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0))
        .slice(0, 3);
    }
    const pinned = pinnedGrailIds
      .map((id) => items.find((i) => i.id === id))
      .filter((i): i is CollectibleItem => !!i);

    if (pinned.length < 3) {
      const pinnedSet = new Set(pinnedGrailIds);
      const byValue = [...items]
        .filter((i) => !pinnedSet.has(i.id))
        .sort((a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0));
      const remaining = byValue.slice(0, 3 - pinned.length);
      return [...pinned, ...remaining];
    }
    return pinned.slice(0, 3);
  }, [items, pinnedGrailIds, isFree]);

  const filteredItems = useMemo(() => {
    if (activeFilter === "All")      return items;
    if (activeFilter === "In Trade") return items.filter((item) => item.isLocked === true);
    return items.filter((item) => item.category === activeFilter);
  }, [items, activeFilter]);

  const linkedCount = useMemo(
    () => items.filter((i) => i.masterId).length,
    [items]
  );

  const lockedCount = useMemo(
    () => items.filter((i) => i.isLocked).length,
    [items]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleAddItem = (newItem: {
    name: string;
    category: Category;
    upForTrade: boolean;
    imagePreview: string | null;
    customImage?: string;
    estimatedValue?: number;
    masterId?: string;
    condition?: string;
    status?: string;
    notes?: string;
    year?: string;
    pieces?: string;
    graded?: boolean;
    grader?: string;
    gradeNum?: string;
  }) => {
    const item: CollectibleItem = {
      id: `new-${Date.now()}`,
      masterId: newItem.masterId,
      name: newItem.name,
      category: newItem.category,
      imageUrl:
        newItem.imagePreview ||
        `https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=400&h=400&fit=crop&auto=format&q=80`,
      customImage: newItem.customImage,
      upForTrade: newItem.upForTrade,
      estimatedValue: newItem.estimatedValue,
      condition: (newItem.condition as ItemCondition) || undefined,
      status: (newItem.status as ItemStatus) || undefined,
      notes: newItem.notes,
      graded: newItem.graded,
      grader: newItem.grader,
      gradeNum: newItem.gradeNum,
      year: newItem.year,
      pieces: newItem.pieces
    };
    // addRawItem updates the shared InventoryContext — items on this page
    // re-renders automatically since items now comes from context.
    addRawItem(item);
  };

  const handleViewItem = (item: CollectibleItem) => {
    setEditingItem(item);
    setViewMode(true);
    setEditConfig({
      askingPrice: item.estimatedValue,
      condition: item.condition || "Near Mint",
      status: item.status || "For Trade",
      notes: item.notes || "",
      customImage: item.customImage,
      graded: item.graded,
      grader: item.grader,
      gradeNum: item.gradeNum,
      year: item.year,
      pieces: item.pieces
    });
  };

  const handleStartEdit = () => {
    setViewMode(false);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    updateItem(editingItem.id, {
      estimatedValue: editConfig.askingPrice,
      condition: editConfig.condition as ItemCondition,
      status: editConfig.status as ItemStatus,
      upForTrade: editConfig.status === "For Trade",
      notes: editConfig.notes || undefined,
      customImage: editConfig.customImage,
      graded: editConfig.graded,
      grader: editConfig.grader,
      gradeNum: editConfig.gradeNum,
      year: editConfig.year,
      pieces: editConfig.pieces,
    });
    setEditingItem(null);
  };

  const handleDeleteItem = () => {
    if (!editingItem) return;
    removeItem(editingItem.id);
    setEditingItem(null);
  };

  // Sent offer cancelled — unlockItems in context clears all lock fields
  const handleCancelOffer = () => {
    if (!editingItem) return;
    unlockItems([editingItem.id]);
    setEditingItem(null);
  };

  // Accepted deal cancelled before real-world fulfillment
  const handleCancelDeal = () => {
    if (!editingItem) return;
    unlockItems([editingItem.id]);
    setEditingItem(null);
  };

  // Finalize: write history record then permanently remove the traded item
  const handleMarkCompleted = () => {
    if (!editingItem?.pendingDeal) return;
    const deal = editingItem.pendingDeal;
    const now = new Date().toISOString();
    const entry: TradeHistoryEntry = {
      id: `trade-${Date.now()}`,
      from: { name: deal.counterpartyName, avatar: deal.counterpartyAvatar },
      to: { name: "You", avatar: profile.avatar },
      fromItems: deal.theirItems,
      fromCash: deal.theirCash,
      toItems: [{
        id: editingItem.id,
        name: editingItem.name,
        imageUrl: editingItem.customImage || editingItem.imageUrl,
        estimatedValue: editingItem.estimatedValue,
      }],
      toCash: 0,
      status: "accepted",
      createdAt: now,
      completedAt: now,
    };
    addTradeHistory(entry);
    removeItem(editingItem.id);
    setEditingItem(null);
  };

  const categoryCounts = useMemo(() =>
    items.reduce((acc: Record<string, number>, item) => {
      if (item.category) acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {}), [items]);

  const filters = useMemo(() =>
    ["All", "In Trade", ...Object.keys(categoryCounts)],
    [categoryCounts]);

  const memberDate = profile.joinDate
    ? new Date(profile.joinDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null;

  const hasPinnedGrails = pinnedGrailIds.length > 0;

  const isPro = !isFree; // Toggle isFree in data.ts to test both states
  const trendPercentage = 8.5;
  const isPositiveTrend = trendPercentage >= 0;

  return (
    <div className="min-h-screen pb-20">
      <Header />

      <main className="max-w-lg mx-auto">
        {/* ── Trophy Room — replaces profile content when active ── */}
        {showAllAchievements && (
          <AchievementsAllView
            achievements={sortedAchievements}
            onClose={() => setShowAllAchievements(false)}
            onSelect={(a) => setSelectedAchievement(a)}
          />
        )}
        {showAllAchievements ? null : <>
        {/* ── Profile Header ──────────────────────────────────── */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-primary/20 border-2 border-primary/30 overflow-hidden flex-shrink-0">
              <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 min-w-0">
              {/* Name row — items-center ensures badge is vertically centered with name */}
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-cream truncate">
                  {profile.name || "My Profile"}
                </h1>
                {/* Pro / Upgrade badge */}
                {!isFree ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#CAE6CE] text-[#1A1818] shrink-0">
                    PRO
                  </span>
                ) : (
                  <button
                    onClick={() => router.push("/upgrade")}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-[#CAE6CE]/10 to-[#AA95C5]/20 border border-[#AA95C5]/30 text-[#AA95C5] hover:from-[#CAE6CE]/15 hover:to-[#AA95C5]/30 transition-all shrink-0"
                  >
                    <Zap className="w-3 h-3" />
                    Go Pro
                  </button>
                )}
                <div className="ml-auto relative shrink-0">
                  {/* One-time pulse ring for new users */}
                  {showEditPulse && (
                    <span className="absolute inset-0 rounded-lg animate-ping bg-primary/50 pointer-events-none" />
                  )}
                  <button
                    onClick={() => {
                      setShowEditProfile(true);
                      if (showEditPulse) {
                        setShowEditPulse(false);
                        try { localStorage.setItem("profile_edit_tipped", "1"); } catch { /* quota */ }
                      }
                    }}
                    className="p-1 rounded-lg hover:bg-charcoal-light/50 transition-colors"
                  >
                    <Edit3 className={`w-3.5 h-3.5 ${showEditPulse ? "text-primary" : "text-cream/30"}`} />
                  </button>
                  {/* Tooltip */}
                  {showEditPulse && (
                    <div className="absolute bottom-full right-0 mb-2 w-[190px] bg-[#2C2929] border border-primary/20 rounded-xl shadow-2xl p-2.5 text-left pointer-events-none z-50">
                      <p className="text-[10px] text-cream/80 leading-snug">Tap to personalize your profile, payment &amp; shipping methods.</p>
                      <div className="absolute top-full right-3 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#2C2929]" />
                    </div>
                  )}
                </div>
              </div>

              {/* Trust stars */}
              <TrustStars score={isDemo ? 4.8 : 0} reviewCount={isDemo ? 6 : 0} onClick={() => setShowReviews(true)} />

              {/* Bio */}
              {profile.bio && (
                <p className="text-xs text-cream/40 mt-1.5 leading-relaxed">{profile.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Mega-Card: Value + Preferences ──────────────────── */}
        {(() => {
          const payments = profile.paymentMethods?.length  ? profile.paymentMethods  : (isDemo ? ["PayPal", "Venmo"] : []);
          const shipping = profile.shippingPreferences?.length ? profile.shippingPreferences : (isDemo ? ["Worldwide Shipping", "Local Pickup"] : []);
          return (
            <div className="mx-5 mb-5 rounded-2xl bg-background-light shadow-soft overflow-visible">
              {/* Value half — left: label+amount, right: stats */}
              <div className="px-4 pt-4 pb-3.5 flex flex-wrap justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <p className="text-[10px] text-cream/40 font-bold uppercase tracking-wider">Total Vault Value</p>
                  </div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-2xl font-extrabold text-primary value-display">{formatValue(totalValue)}</p>
                    {isPro ? (
                      /* PRO STATE — clickable to expand chart */
                      <button
                        onClick={() => setIsChartExpanded(!isChartExpanded)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-semibold tracking-wide transition-colors active:scale-95 ${isPositiveTrend ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" : "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20"}`}
                      >
                        {isPositiveTrend ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        <span>{isPositiveTrend ? "+" : ""}$4.2K ({trendPercentage}%)</span>
                        <Info className="w-3 h-3 ml-0.5 opacity-60" />
                      </button>
                    ) : (
                      /* NON-PRO (LOCKED) STATE — no chart, tooltip on hover */
                      <div className="relative group">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.05] text-[#787569] text-[11px] font-semibold tracking-wide cursor-default select-none">
                          <Lock className="w-3 h-3 text-[#AA95C5]" />
                          <span className="blur-[3px] opacity-70 select-none">+$4.2K (8.5%)</span>
                        </div>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[190px] p-2.5 bg-[#221F1F] border border-white/[0.08] rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 flex flex-col items-center gap-1.5 text-center">
                          <Lock className="w-3.5 h-3.5 text-[#AA95C5]" />
                          <span className="text-[11px] font-bold text-[#FCF9D5]">Pro Feature</span>
                          <span className="text-[9px] text-[#787569] leading-tight">Upgrade to unlock portfolio tracking.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  {tradeHistoryEntries.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2C2929] border border-white/[0.08] text-[#FCF9D5] text-[10px] font-semibold shadow-sm whitespace-nowrap">
                      <RefreshCw className="w-3 h-3 text-[#CAE6CE]" />
                      {tradeHistoryEntries.length} Trade{tradeHistoryEntries.length !== 1 ? "s" : ""}
                    </div>
                  )}
                  {memberDate && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2C2929] border border-white/[0.08] text-[#FCF9D5] text-[10px] font-semibold shadow-sm whitespace-nowrap">
                      <Calendar className="w-3 h-3 text-[#AA95C5]" />
                      Joined &apos;{memberDate.slice(-2)}
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded Portfolio Chart */}
              {isChartExpanded && isPro && (
                <div className="px-4 pb-4 pt-3 border-t border-white/[0.05] animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold bg-gradient-to-r from-[#CAE6CE] to-[#AA95C5] bg-clip-text text-transparent">Vault Trajectory</span>
                    <div className="flex items-center gap-0.5 bg-white/[0.03] p-0.5 rounded-lg border border-white/[0.05]">
                      {["1W", "1M", "3M", "1Y", "ALL"].map((tf) => (
                        <button
                          key={tf}
                          onClick={() => setTimeframe(tf)}
                          className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${timeframe === tf ? "bg-[#2C2929] text-[#FCF9D5] shadow-sm" : "text-[#787569] hover:text-[#FCF9D5]"}`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] text-[#787569] font-medium tracking-wide mb-5">Track the historical pulse and momentum of your vault.</div>
                  <div className="h-[130px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={DUMMY_DATA_MAP[timeframe]} margin={{ top: 4, right: 0, left: 0, bottom: 15 }}>
                        <defs>
                          <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={isPositiveTrend ? "#34d399" : "#fb7185"} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={isPositiveTrend ? "#34d399" : "#fb7185"} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#787569" }} dy={10} />
                        <Tooltip
                          cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1, strokeDasharray: "3 3" }}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-[#221F1F]/90 backdrop-blur-md border border-[#CAE6CE]/20 p-2 rounded-lg shadow-xl">
                                  <p className="text-[10px] text-[#787569] mb-1">{label}</p>
                                  <p className="text-xs font-bold text-[#CAE6CE]">${(payload[0].value as number).toLocaleString()}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="val"
                          stroke={isPositiveTrend ? "#34d399" : "#fb7185"}
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#portfolioGradient)"
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Preferences — two-row static layout */}
              <div className="px-4 pb-4">
                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/[0.1] to-transparent mb-3 mt-1" />
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <CreditCard className="w-4 h-4 shrink-0 text-[#CAE6CE] drop-shadow-[0_0_8px_rgba(202,230,206,0.3)]" />
                    {payments.slice(0, 3).map((m) => (
                      <div key={m} className="px-2.5 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.06] transition-colors border border-white/[0.05] text-[10px] font-medium text-[#FCF9D5] whitespace-nowrap backdrop-blur-sm">
                        {m}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Truck className="w-4 h-4 shrink-0 text-[#AA95C5] drop-shadow-[0_0_8px_rgba(170,149,197,0.3)]" />
                    {shipping.slice(0, 3).map((s) => (
                      <div key={s} className="px-2.5 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.06] transition-colors border border-white/[0.05] text-[10px] font-medium text-[#FCF9D5] whitespace-nowrap backdrop-blur-sm">
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Trophy Room ─────────────────────────────────────── */}
        {(() => {
          const unlocked = achievements.filter((a) => a.status === "unlocked").length;
          const pct      = Math.round((unlocked / achievements.length) * 100);
          return (
            <div className="mb-5">
              {/* Section header */}
              <div className="px-5 flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#D4AF37]" />
                  <h2 className="text-sm font-bold text-cream/80">
                    Achievements{" "}
                    <span className="text-cream/30 font-semibold">
                      ({unlocked}/{ACHIEVEMENTS.length})
                    </span>
                  </h2>
                </div>
                <button
                  onClick={() => setShowAllAchievements(true)}
                  className="text-[10px] text-primary/60 font-semibold hover:text-primary transition-colors"
                >
                  View All →
                </button>
              </div>

              {/* Completion progress bar */}
              <div className="px-5 mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-cream/40 font-extrabold tabular-nums">{pct}%</span>
                </div>
              </div>

              {/* Horizontal scroll — scroll-pl keeps first card flush with header */}
              {(() => {
                const visibleAchievements = sortedAchievements;
                const lockedCount = 0;

                return (
                  <>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-pl-5 pb-2 pl-5">
                      {visibleAchievements.map((achievement, i) => {
                        const Icon   = achievement.icon;
                        const locked = achievement.status === "locked";

                        return (
                          <button
                            key={achievement.id}
                            onClick={() => setSelectedAchievement(achievement)}
                            className={`relative flex-shrink-0 w-32 h-36 snap-start rounded-2xl flex flex-col items-center justify-center gap-2 px-2.5 pt-4 pb-3 text-center active:scale-95 transition-all animate-scale-in overflow-hidden ${
                              locked
                                ? "bg-background-light/60 border border-dashed border-white/[0.09] grayscale opacity-50"
                                : "bg-[#1A1818]"
                            }`}
                            style={{
                              animationDelay:    `${i * 0.06}s`,
                              animationFillMode: "both",
                              ...(!locked ? {
                                border:    `1px solid ${achievement.glow.replace("0.3", "0.4").replace("0.35", "0.4")}`,
                                boxShadow: `0 0 14px -4px ${achievement.glow}, inset 0 1px 0 rgba(255,255,255,0.04)`,
                              } : {}),
                            }}
                          >
                            {/* Pin badge — top-right corner */}
                            {pinnedAchievementIds.has(achievement.id) && (
                              <div className="absolute top-2 right-2 z-10">
                                <Pin className="w-2.5 h-2.5 text-primary/70" />
                              </div>
                            )}

                            {/* Icon */}
                            <div className="relative flex-shrink-0">
                              <div
                                className={`w-12 h-12 rounded-xl flex items-center justify-center ${locked ? "bg-white/[0.04]" : "bg-white/[0.07]"}`}
                                style={!locked ? { boxShadow: `0 0 12px -3px ${achievement.glow}` } : undefined}
                              >
                                <Icon
                                  className={`w-6 h-6 ${locked ? "text-cream/25" : achievement.color}`}
                                  strokeWidth={locked ? 1.5 : 2}
                                />
                              </div>
                              {locked && (
                                <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#221F1F] border border-white/[0.09] flex items-center justify-center">
                                  <Lock className="w-2.5 h-2.5 text-cream/35" />
                                </div>
                              )}
                            </div>

                            {/* Text */}
                            <div className="flex flex-col items-center gap-0.5 w-full">
                              <p className={`text-[11px] font-extrabold leading-tight text-center w-full ${locked ? "text-cream/25" : "text-cream/90"}`}>
                                {achievement.title}
                              </p>
                              <p className={`text-[9px] leading-snug line-clamp-2 text-center w-full ${locked ? "text-cream/20" : "text-cream/40"}`}>
                                {achievement.description}
                              </p>
                            </div>

                            {/* Bottom glow strip */}
                            {!locked && (
                              <div
                                className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full"
                                style={{ background: `linear-gradient(90deg, transparent, ${achievement.glow}, transparent)` }}
                              />
                            )}
                          </button>
                        );
                      })}
                      {/* End spacer so last card doesn't hug the edge */}
                      <div className="w-5 flex-shrink-0" />
                    </div>

                  </>
                );
              })()}
            </div>
          );
        })()}

        {/* ── Top 3 Grails ────────────────────────────────────── */}
        <div className="px-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-bold text-cream/80">Top 3 Grails</h2>
            {!isFree && (
              <button onClick={() => setShowGrailsPicker(true)} className="ml-auto p-1.5 rounded-lg hover:bg-charcoal-light/50 transition-colors">
                <Edit3 className="w-3.5 h-3.5 text-cream/30" />
              </button>
            )}
          </div>
          {grails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <Crown className="w-8 h-8 text-white/10 mb-1" />
              <p className="text-sm text-cream/30 font-medium">No Grails to display yet.</p>
              <p className="text-xs text-cream/20 max-w-[180px] leading-relaxed">Curate your vault to see your top pieces here.</p>
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-3 w-full">
            {grails.map((item, i) => {
              const isHero = i === 0;

              // Gold / Silver / Bronze theme
              const theme = [
                {
                  badge:   "bg-[#D4AF37] text-[#713F12] border border-[#FDE047]/80",
                  wrapper: "shadow-[0_0_15px_rgba(212,175,55,0.15)] ring-1 ring-[#D4AF37]/50",
                },
                {
                  badge:   "bg-[#C0C0C0] text-[#374151] border border-white/80",
                  wrapper: "shadow-[0_0_15px_rgba(156,163,175,0.15)] ring-1 ring-[#9CA3AF]/50",
                },
                {
                  badge:   "bg-[#CD7F32] text-[#451A03] border border-[#FDBA74]/80",
                  wrapper: "shadow-[0_0_15px_rgba(180,83,9,0.15)] ring-1 ring-[#B45309]/50",
                },
              ][i];

              return (
                <div
                  key={item.id}
                  onClick={() => handleViewItem(item)}
                  className={`${isHero ? "col-span-2" : "col-span-1"} relative rounded-2xl p-[1px] bg-gradient-to-b from-white/10 via-transparent to-transparent cursor-pointer transition-transform active:scale-95 hover:opacity-90 animate-scale-in ${theme.wrapper}`}
                  style={{ animationDelay: `${i * 0.1}s`, animationFillMode: "both" }}
                >
                  {/* Inner card */}
                  <div className="h-full w-full bg-[#2C2929] rounded-2xl overflow-hidden">
                    <div className={`relative overflow-hidden ${isHero ? "h-[200px]" : "aspect-square"}`}>
                      <img
                        src={item.customImage || item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      {/* Rank badge — solid metallic coin */}
                      <div className={`absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center text-sm font-black shadow-sm shadow-black/30 z-10 ${theme.badge}`}>
                        {i + 1}
                      </div>
                    </div>
                    <div className={isHero ? "px-3 py-3" : "px-2 py-1.5"}>
                      <p className={`text-cream/90 truncate font-semibold leading-tight ${isHero ? "text-sm" : "text-[10px]"}`}>
                        {item.name}
                      </p>
                      <p className={`font-bold mt-0.5 ${isHero ? "text-sm" : "text-[9px]"} ${["text-[#FDE047]", "text-[#E5E7EB]", "text-[#FDBA74]"][i]}`}>
                        {formatValue(item.estimatedValue || 0)}
                      </p>
                      {isHero && item.category && (
                        <p className="text-[10px] text-muted mt-0.5">{item.category}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* ── Section toggle: My Collection / My Radar ────────── */}
        <div className="px-5 mb-5">
          <div className="flex gap-2 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <button
              onClick={() => setProfileTab("collection")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                profileTab === "collection"
                  ? "bg-background-light text-cream shadow-sm"
                  : "text-cream/35 hover:text-cream/60"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              My Vault
            </button>
            <button
              onClick={() => setProfileTab("radar")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                profileTab === "radar"
                  ? "bg-background-light text-[#CAE6CE] shadow-sm"
                  : "text-cream/35 hover:text-cream/60"
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              My Radar
              {radarItems.length > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  profileTab === "radar"
                    ? "bg-[#CAE6CE]/20 text-[#CAE6CE]"
                    : "bg-white/[0.08] text-cream/40"
                }`}>
                  {radarItems.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Filters ────────────────────────────────────────── */}
        {profileTab === "collection" && <div className="px-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-cream/50" />
            <h2 className="text-sm font-bold text-cream/80">Vault</h2>
          </div>
          <div
            ref={pillsRef}
            className="flex flex-nowrap gap-2 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-none cursor-grab select-none"
            onMouseDown={handlePillsDown}
            onMouseMove={handlePillsMove}
            onMouseUp={handlePillsEnd}
            onMouseLeave={handlePillsEnd}
          >
            {filters.map((f) => {
              const isInTrade = f === "In Trade";
              const isActive = activeFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f as ProfileFilter)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isInTrade && isActive
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : isInTrade && !isActive
                      ? "bg-background-light text-amber-400/60 hover:text-amber-400"
                      : isActive
                      ? "bg-surface/25 text-surface-light shadow-glow-surface"
                      : "bg-background-light text-cream/40 hover:text-cream/60"
                  }`}
                >
                  {f === "All" ? `All (${items.length})` : f === "In Trade" ? "In Trade" : `${f} (${categoryCounts[f] ?? 0})`}
                  {isInTrade && lockedCount > 0 && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? "bg-amber-500/30 text-amber-300" : "bg-amber-500/20 text-amber-400"
                    }`}>
                      {lockedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>}

        {/* ── "In Trade" dedicated list view + DnD grid ─── (collection only) */}
        {profileTab === "collection" && (activeFilter === "In Trade" ? (
          <div className="px-5 pb-6">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
                  <Lock className="w-7 h-7 text-amber-400/50" />
                </div>
                <p className="text-cream/40 font-medium text-sm">No pieces in play</p>
                <p className="text-cream/25 text-xs mt-1 max-w-[200px] leading-relaxed">
                  When you send a trade offer, those pieces will appear here so you always know where they are.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-[11px] text-amber-400/60 font-semibold uppercase tracking-wider mb-3">
                  {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""} pending · tap to cancel
                </p>
                {filteredItems.map((item) => {
                  const isAccepted = item.lockedType === "accepted";
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleViewItem(item)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl bg-background-light transition-colors text-left border ${
                        isAccepted
                          ? "border-green-500/20 hover:border-green-500/35"
                          : "border-amber-500/15 hover:border-amber-500/30"
                      }`}
                    >
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                        <img
                          src={item.customImage || item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        <div className={`absolute inset-0 ${isAccepted ? "bg-green-500/15" : "bg-amber-500/20"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-cream truncate">{item.name}</p>
                        <p className={`text-xs mt-0.5 truncate ${isAccepted ? "text-green-400/70" : "text-amber-400/70"}`}>
                          {item.lockedNote ?? (isAccepted ? "Deal accepted · Awaiting fulfillment" : "Pending trade offer")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {item.estimatedValue != null && (
                          <span className="text-xs font-bold text-primary">{formatValue(item.estimatedValue)}</span>
                        )}
                        {isAccepted ? (
                          <span className="text-[9px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded font-bold">
                            ACCEPTED
                          </span>
                        ) : (
                          <span className="text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded font-bold">
                            PENDING
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ── Normal DnD grid ──────────────────────────────── */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredItems.map((i) => i.id)} strategy={rectSortingStrategy}>
                <div className="px-5 grid grid-cols-3 gap-3 pb-6">
                  {filteredItems.map((item) => (
                    <SortableItem key={item.id} item={item} onTap={() => handleViewItem(item)} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {filteredItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
                  <Package className="w-7 h-7 text-white/20" />
                </div>
                <h3 className="text-sm font-semibold text-cream/60 mb-1">Your vault is empty</h3>
                <p className="text-xs text-white/30 mb-5 max-w-[200px] leading-relaxed">Curate your first piece to start building your vault.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-primary text-charcoal-dark text-sm font-bold px-5 py-2.5 rounded-full shadow-[0_0_16px_rgba(45,212,191,0.35)] active:scale-95 transition-all"
                >
                  Curate First Piece
                </button>
              </div>
            )}
          </>
        ))}

        {/* ══════════════════════════════════════════════════════
            MY RADAR
        ══════════════════════════════════════════════════════ */}
        {profileTab === "radar" && (
          <div className="px-5 pb-8">

            {/* ── Header row ── */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-[#CAE6CE]" />
                <h2 className="text-sm font-bold text-cream/80">My Radar</h2>
                <span className="text-[10px] text-cream/25">active hunting targets</span>
              </div>
              <button
                onClick={() => setShowAddToRadar(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#CAE6CE]/10 border border-[#CAE6CE]/20 text-[#CAE6CE] text-xs font-bold hover:bg-[#CAE6CE]/20 transition-colors active:scale-95"
              >
                <Target className="w-3.5 h-3.5" />
                + Add to Radar
              </button>
            </div>

            {/* ── Empty state ── */}
            {radarItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-2 border-[#CAE6CE]/10 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full border border-[#CAE6CE]/15 flex items-center justify-center">
                      <Crosshair className="w-7 h-7 text-[#CAE6CE]/25" />
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-full bg-[#CAE6CE]/3 animate-ping opacity-30" />
                </div>
                <div>
                  <p className="text-cream/50 font-bold text-sm mb-1.5">Your Radar is clear.</p>
                  <p className="text-cream/25 text-xs leading-relaxed max-w-[240px] mx-auto">
                    Add highly sought-after grails to get notified the moment they hit the market.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddToRadar(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#CAE6CE]/10 border border-[#CAE6CE]/20 text-[#CAE6CE] text-sm font-bold hover:bg-[#CAE6CE]/20 transition-colors active:scale-95"
                >
                  <Target className="w-4 h-4" />
                  + Add to Radar
                </button>
              </div>
            ) : (
              /* ── Radar grid ── */
              <div className="flex flex-col gap-3">
                {radarItems.map((entry) => {
                  const hasMatches = entry.matchCount > 0;
                  return (
                    <div
                      key={entry.id}
                      className="rounded-2xl bg-background-light border transition-all"
                      style={{
                        borderColor: hasMatches ? "rgba(202,230,206,0.25)" : "rgba(255,255,255,0.06)",
                        boxShadow: hasMatches ? "0 0 16px rgba(202,230,206,0.07)" : "none",
                      }}
                    >
                      <div className="flex gap-3 p-3">
                        {/* Item image */}
                        <div className="relative flex-shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden bg-white/[0.04]">
                          <img
                            src={entry.imageUrl}
                            alt={entry.name}
                            className="w-full h-full object-contain p-1.5"
                            loading="lazy"
                          />
                          {/* Radar icon badge */}
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-md bg-black/50 flex items-center justify-center">
                            <Crosshair className="w-2.5 h-2.5 text-[#CAE6CE]/70" />
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-cream truncate leading-snug">{entry.name}</p>
                              <p className="text-[10px] text-cream/30 mt-0.5">{entry.category} · ~{entry.marketValue < 1000 ? `$${entry.marketValue}` : `$${(entry.marketValue / 1000).toFixed(1)}K`}</p>
                            </div>
                            {/* Match badge */}
                            {hasMatches ? (
                              <span className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/25 text-green-400 text-[10px] font-black whitespace-nowrap animate-pulse">
                                🔥 {entry.matchCount} Match{entry.matchCount !== 1 ? "es" : ""}
                              </span>
                            ) : (
                              <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-cream/20 text-[10px] font-semibold whitespace-nowrap">
                                Scanning…
                              </span>
                            )}
                          </div>

                          {/* Bounty row */}
                          <div className="mt-2 space-y-1.5">
                            {/* Badges row */}
                            {((entry.cashOffer != null && entry.cashOffer > 0) || entry.budget || (entry.tradingItemIds?.length ?? 0) > 0) && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {(entry.cashOffer != null && entry.cashOffer > 0) ? (
                                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#AA95C5]/10 border border-[#AA95C5]/20">
                                    <DollarSign className="w-2.5 h-2.5 text-[#AA95C5]" />
                                    <span className="text-[10px] font-semibold text-[#AA95C5]">{formatValue(entry.cashOffer)} cash</span>
                                  </div>
                                ) : entry.budget ? (
                                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#AA95C5]/10 border border-[#AA95C5]/20">
                                    <DollarSign className="w-2.5 h-2.5 text-[#AA95C5]" />
                                    <span className="text-[10px] font-semibold text-[#AA95C5]">{entry.budget}</span>
                                  </div>
                                ) : null}
                                {(entry.tradingItemIds?.length ?? 0) > 0 && (() => {
                                  const offerItems = entry.tradingItemIds!
                                    .map((id) => items.find((i) => i.id === id))
                                    .filter(Boolean) as typeof items;
                                  return (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-[#AA95C5]/10 border border-[#AA95C5]/20">
                                      <div className="flex -space-x-1.5">
                                        {offerItems.slice(0, 3).map((it) => (
                                          <div key={it.id} className="w-4 h-4 rounded-md border border-[#1A1818] bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                                            <img src={it.customImage || it.imageUrl} alt="" className="w-full h-full object-contain" />
                                          </div>
                                        ))}
                                        {entry.tradingItemIds!.length > 3 && (
                                          <div className="w-4 h-4 rounded-md border border-[#1A1818] bg-[#AA95C5]/20 flex items-center justify-center flex-shrink-0">
                                            <span className="text-[7px] font-bold text-cream/60">+{entry.tradingItemIds!.length - 3}</span>
                                          </div>
                                        )}
                                      </div>
                                      <span className="text-[10px] font-semibold text-[#AA95C5] ml-0.5">
                                        {offerItems.length > 0
                                          ? offerItems.length === 1 ? offerItems[0].name.split(" ").slice(0, 2).join(" ") : `${entry.tradingItemIds!.length} items`
                                          : `${entry.tradingItemIds!.length} items`}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                            {/* Note */}
                            {entry.note && (
                              <p className="text-[10px] text-cream/35 italic leading-snug truncate">
                                &ldquo;{entry.note}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions row */}
                      <div className="flex gap-2 px-3 pb-3">
                        <button
                          onClick={() => hasMatches && setRadarViewItem(entry)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                            hasMatches
                              ? "bg-green-500/15 border border-green-500/25 text-green-400 hover:bg-green-500/25"
                              : "bg-white/[0.04] border border-white/[0.06] text-cream/25 cursor-not-allowed"
                          }`}
                          disabled={!hasMatches}
                        >
                          <Target className="w-3.5 h-3.5" />
                          {hasMatches ? `View ${entry.matchCount} Match${entry.matchCount !== 1 ? "es" : ""}` : "No Matches Yet"}
                        </button>
                        <button
                          onClick={() => {
                            setEditingRadarEntry(entry);
                            setEditCash(entry.cashOffer ?? 0);
                            setEditSelectedIds(new Set(entry.tradingItemIds ?? []));
                            setEditNote(entry.note ?? "");
                            setEditShowEmoji(false);
                          }}
                          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06] text-cream/30 hover:bg-white/[0.08] hover:text-cream/70 transition-all active:scale-90"
                          title="Edit bounty"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setRadarItems((prev) => prev.filter((r) => r.id !== entry.id));
                            setRadarToast("Target dropped from Radar 🛸");
                            setTimeout(() => setRadarToast(""), 3000);
                          }}
                          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-red-500/10 border border-red-500/15 text-red-400/60 hover:bg-red-500/20 hover:text-red-400 transition-all active:scale-90"
                          title="Remove from Radar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        </>}
      </main>

      <button
        onClick={() => {
          if (isFree && items.length >= 10) {
            setShowLimitModal(true);
          } else {
            setShowAddModal(true);
          }
        }}
        className={`fixed bottom-24 right-5 w-14 h-14 rounded-full bg-primary shadow-soft-lg shadow-primary/20 flex items-center justify-center hover:bg-primary-dark active:scale-90 transition-all z-40 animate-bounce-soft ${profileTab === "radar" ? "opacity-0 pointer-events-none" : ""}`}
      >
        <Plus className="w-7 h-7 text-charcoal-dark" strokeWidth={2.5} />
      </button>

      {/* ── Radar toast ─────────────────────────────────────── */}
      {radarToast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 max-w-[320px] w-full px-4 animate-slide-up pointer-events-none">
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-[#2C2929] border border-[#CAE6CE]/20 shadow-2xl shadow-black/40">
            <Crosshair className="w-4 h-4 text-[#CAE6CE] flex-shrink-0 mt-0.5" />
            <span className="text-xs font-semibold text-cream/80 leading-relaxed">{radarToast}</span>
          </div>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────── */}
      {showLimitModal && (
        <LimitReachedModal
          onClose={() => setShowLimitModal(false)}
          onUpgrade={() => { setShowLimitModal(false); router.push("/upgrade"); }}
        />
      )}
      <AddItemModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onAdd={handleAddItem} />
      <EditProfileModal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        profile={profile}
        onSave={(updated) => {
          setProfile(updated);
          // Persist to DB (non-demo users); localStorage is updated by the existing effect
          if (!isDemoUser(session?.user?.email)) {
            fetch("/api/profile", {
              method:  "PUT",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({
                name:                updated.name,
                bio:                 updated.bio,
                avatar:              updated.avatar,
                paymentMethods:      updated.paymentMethods      ?? [],
                shippingPreferences: updated.shippingPreferences ?? [],
              }),
            }).catch((err) => console.error("[profile save]", err));
          }
        }}
        isPro={!isFree}
      />
      <GrailsPickerModal isOpen={showGrailsPicker} onClose={() => setShowGrailsPicker(false)} items={items} pinnedIds={pinnedGrailIds} onSave={setPinnedGrailIds} userTier={isFree ? "free" : "pro"} />
      <ReviewsListModal isOpen={showReviews} onClose={() => setShowReviews(false)} userName={profile.name} trustScore={isDemo ? 4.8 : 0} isDemo={isDemo} />

      {/* ── Item Detail Modal ───────────────────────────────── */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-fade-in" onClick={() => setEditingItem(null)} />
          <div className="relative w-full max-w-md bg-charcoal-dark rounded-3xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up">
            <button onClick={() => setEditingItem(null)} className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors">
              <X className="w-4.5 h-4.5 text-white/80" />
            </button>

            {viewMode ? (
              <>
                <div className="flex-1 overflow-y-auto overscroll-contain">
                  <div className="relative flex items-center justify-center px-6 pt-6 pb-3">
                    <img src={editingItem.customImage || editingItem.imageUrl} alt={editingItem.name} className="relative max-h-[42vh] w-auto max-w-full object-contain drop-shadow-2xl" />
                  </div>
                  <div className="px-5 pb-5 pt-2 space-y-3.5">
                    <div>
                      <h2 className="text-lg font-bold text-cream leading-snug">{editingItem.name}</h2>
                      <p className="text-sm text-cream/40 mt-0.5">{editingItem.category}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editingItem.isLocked && editingItem.lockedType === "accepted" && (
                        <div className="flex items-start gap-1.5 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/25 w-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-bold text-green-400">Deal Accepted · Awaiting Fulfillment</span>
                            {editingItem.lockedNote && (
                              <p className="text-[11px] text-green-400/60 mt-0.5 leading-snug">{editingItem.lockedNote}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {editingItem.isLocked && editingItem.lockedType !== "accepted" && (
                        <div className="flex items-start gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 w-full">
                          <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-bold text-amber-400">Offer Sent · Pending Response</span>
                            {editingItem.lockedNote && (
                              <p className="text-[11px] text-amber-400/70 mt-0.5 leading-snug">{editingItem.lockedNote}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {editingItem.graded && editingItem.gradeNum ? (
                         <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                           <Award className="w-3.5 h-3.5 text-purple-400" />
                           <span className="text-xs font-bold text-purple-400">{editingItem.grader} {editingItem.gradeNum}</span>
                         </div>
                      ) : editingItem.condition && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface/10 border border-surface/20">
                          <Shield className="w-3.5 h-3.5 text-surface-light" />
                          <span className="text-xs font-bold text-surface-light">{editingItem.condition}</span>
                        </div>
                      )}
                      {editingItem.status && (
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${editingItem.status === "For Trade" ? "bg-primary/10 border-primary/25" : "bg-white/5 border-white/10"}`}>
                          <Tag className={`w-3.5 h-3.5 ${editingItem.status === "For Trade" ? "text-primary" : "text-cream/35"}`} />
                          <span className={`text-xs font-bold ${editingItem.status === "For Trade" ? "text-primary" : "text-cream/45"}`}>{editingItem.status}</span>
                        </div>
                      )}
                    </div>
                    {editingItem.estimatedValue && editingItem.estimatedValue > 0 && (
                      <div className="rounded-2xl bg-green-500/8 border border-green-500/20 p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <DollarSign className="w-4 h-4 text-green-400" />
                          <span className="text-[11px] text-cream/35 font-semibold uppercase tracking-wider">Asking Price</span>
                        </div>
                        <p className="text-3xl font-bold text-green-400">{formatValue(editingItem.estimatedValue)}</p>
                      </div>
                    )}
                    {editingItem.notes && (
                      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
                        <p className="text-[11px] text-cream/30 font-semibold uppercase tracking-wider mb-2">Notes</p>
                        <p className="text-sm text-cream/60 leading-relaxed">{editingItem.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 px-5 pb-5 pt-3 border-t border-white/[0.06] flex-shrink-0">
                  {/* Delete is hidden for locked items — they're tied to active trades */}
                  {!editingItem.isLocked && (
                    <button onClick={handleDeleteItem} className="flex items-center justify-center px-3.5 py-3 rounded-2xl bg-red-500/10 text-red-400 font-bold text-sm hover:bg-red-500/20 active:scale-[0.97] transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {editingItem.isLocked && editingItem.lockedType === "accepted" ? (
                    // Accepted deal — show Cancel Deal + Mark as Completed
                    <>
                      <button
                        onClick={handleCancelDeal}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-2xl bg-white/[0.06] text-cream/40 font-bold text-sm hover:bg-white/10 active:scale-[0.97] transition-all"
                      >
                        <Unlock className="w-4 h-4" />
                        Cancel Deal
                      </button>
                      <button
                        onClick={handleMarkCompleted}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-500/20 text-green-400 font-bold text-sm hover:bg-green-500/30 active:scale-[0.97] transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Mark as Completed
                      </button>
                    </>
                  ) : editingItem.isLocked ? (
                    // Sent offer — route to the specific trade card in History
                    <button
                      onClick={() => {
                        // Find the pending trade containing this item (by id or name)
                        const hasItem = (t: { fromItems: Array<{ id: string; name: string }>; toItems: Array<{ id: string; name: string }> }) =>
                          [...t.fromItems, ...t.toItems].some(
                            (i) => i.id === editingItem.id || i.name === editingItem.name
                          );
                        const match =
                          tradeHistoryEntries.find((t) => t.status === "pending" && hasItem(t)) ??
                          tradeOffers.find(hasItem);
                        setEditingItem(null);
                        router.push(match ? `/history#trade-${match.id}` : "/history");
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-500/15 text-amber-400 font-bold text-sm hover:bg-amber-500/25 active:scale-[0.97] transition-all"
                    >
                      <HistoryIcon className="w-4 h-4" />
                      Manage in History
                      <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  ) : (
                    <>
                      <button onClick={() => setShowMarketplace(true)} className="flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-2xl bg-surface/10 text-surface-light/60 font-bold text-sm hover:bg-surface/20 active:scale-[0.97] transition-all">
                        <BarChart3 className="w-4 h-4" />
                        Market
                      </button>
                      <button onClick={handleStartEdit} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/20 text-primary font-bold text-sm hover:bg-primary/30 active:scale-[0.97] transition-all">
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
                  <button onClick={() => setViewMode(true)} className="p-1.5 rounded-xl hover:bg-charcoal-light/50 transition-colors">
                    <ChevronLeft className="w-5 h-5 text-cream/50" />
                  </button>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <img src={editingItem.customImage || editingItem.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-cream truncate">Edit Item</p>
                      <p className="text-xs text-cream/35 truncate">{editingItem.name}</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain p-5">
                  <ItemConfigForm config={editConfig} onChange={setEditConfig} category={editingItem.category} />
                </div>
                <div className="flex gap-3 px-5 pb-5 pt-3 border-t border-white/[0.06] flex-shrink-0">
                  <button onClick={() => setViewMode(true)} className="px-5 py-3 rounded-2xl bg-background-light text-cream/40 font-bold text-sm hover:bg-charcoal-light/50 active:scale-[0.97] transition-all">Back</button>
                  <button onClick={handleSaveEdit} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/20 text-primary font-bold text-sm hover:bg-primary/30 active:scale-[0.97] transition-all">
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Marketplace Modal — collection item */}
      <MarketplaceModal
        isOpen={showMarketplace}
        onClose={() => setShowMarketplace(false)}
        item={editingItem ? {
          name: editingItem.name,
          imageUrl: editingItem.customImage || editingItem.imageUrl,
          marketPrice: editingItem.estimatedValue || 0,
          category: editingItem.category,
        } : null}
      />

      {/* Marketplace Modal — Radar "View Matches" */}
      <MarketplaceModal
        isOpen={!!radarViewItem}
        onClose={() => setRadarViewItem(null)}
        item={radarViewItem ? {
          name: radarViewItem.name,
          imageUrl: radarViewItem.imageUrl,
          marketPrice: radarViewItem.marketValue,
          category: radarViewItem.category,
        } : null}
      />

      {/* AddToRadarModal — dedicated radar catalog search */}
      <AddToRadarModal
        isOpen={showAddToRadar}
        onClose={() => setShowAddToRadar(false)}
        onAdd={(item) => {
          const newEntry: RadarEntry = {
            id: `radar-${Date.now()}`,
            name: item.name,
            imageUrl: item.imageUrl,
            category: item.category,
            marketValue: item.marketValue,
            matchCount: 0,
          };
          setRadarItems((prev) => [newEntry, ...prev]);
          // Open edit immediately so user can set bounty terms
          setEditingRadarEntry(newEntry);
          setEditCash(0);
          setEditSelectedIds(new Set());
          setEditNote("");
          setEditShowEmoji(false);
        }}
      />

      {/* ── Radar Bounty Builder — full Trade Builder UI ── */}
      {editingRadarEntry && (() => {
        const selectedItemObjs = items.filter((i) => editSelectedIds.has(i.id));
        const selectedValue    = selectedItemObjs.reduce((s, i) => s + (i.estimatedValue ?? 0), 0);
        const offeredTotal     = selectedValue + editCash;
        const targetValue      = editingRadarEntry.marketValue;
        const QUICK_EMOJIS     = ["🔥", "🤝", "👀", "💯", "📈", "😎", "💎", "✨"];

        const toggleEditItem = (id: string) =>
          setEditSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
          });

        return (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-fade-in" onClick={() => setEditingRadarEntry(null)} />
            <div
              className="relative w-full max-w-md bg-charcoal-dark rounded-3xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up border border-white/10 shadow-2xl"
            >
              {/* ── Header ── */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-cream">Bounty Builder</h2>
                </div>
                <button
                  onClick={() => setEditingRadarEntry(null)}
                  className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-cream/60" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain">

                {/* ── YOU'RE HUNTING section ── */}
                <div className="px-5 pt-5 pb-4 border-b border-white/[0.05]">
                  <p className="text-[10px] text-cream/30 font-bold uppercase tracking-wider mb-2.5">
                    You&apos;re hunting
                  </p>
                  <div className="relative flex items-start gap-3 p-3 rounded-2xl bg-background-light border border-primary/20">
                    <div className={`w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden ${
                      editingRadarEntry.category === "Lego" ? "bg-white p-1" : "bg-white/[0.05] p-1"
                    }`}>
                      <img src={editingRadarEntry.imageUrl} alt={editingRadarEntry.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-cream leading-snug">{editingRadarEntry.name}</p>
                      <p className="text-xs text-cream/40 mt-0.5">{editingRadarEntry.category}</p>
                      <p className="text-sm font-bold text-primary mt-1.5">{formatValue(targetValue)}</p>
                    </div>
                    <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Crosshair className="w-3.5 h-3.5 text-primary/60" />
                    </div>
                  </div>
                </div>

                {/* ── Live offer summary + equity bar ── */}
                {(editSelectedIds.size > 0 || editCash > 0) && (
                  <div className="px-5 pt-3 pb-1 space-y-2">
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-2xl bg-surface/10 border border-surface/20">
                      <div className="flex items-center gap-2 flex-wrap">
                        {editSelectedIds.size > 0 && (
                          <div className="flex -space-x-2">
                            {selectedItemObjs.slice(0, 3).map((item) => (
                              <div key={item.id} className={`w-7 h-7 rounded-lg border-2 border-charcoal-dark flex items-center justify-center overflow-hidden ${
                                item.category === "Lego" || item.category === "Funko Pop" ? "bg-white" : "bg-white/10"
                              }`}>
                                <img src={item.customImage ?? item.imageUrl} alt="" className="w-full h-full object-contain" />
                              </div>
                            ))}
                            {editSelectedIds.size > 3 && (
                              <div className="w-7 h-7 rounded-lg border-2 border-charcoal-dark bg-surface/20 flex items-center justify-center">
                                <span className="text-[9px] text-cream/60 font-bold">+{editSelectedIds.size - 3}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {editCash > 0 && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-green-500/15 border border-green-500/20 text-[10px] font-bold text-green-400">
                            <DollarSign className="w-2.5 h-2.5" />
                            +{formatValue(editCash)}
                          </span>
                        )}
                        {editSelectedIds.size > 0 && (
                          <span className="text-xs text-cream/60 font-medium">
                            {editSelectedIds.size} item{editSelectedIds.size !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-bold text-surface-light">{formatValue(offeredTotal)}</span>
                    </div>
                    <EquityBar offered={offeredTotal} asking={targetValue} />
                  </div>
                )}

                {/* ── YOUR OFFER section — PowerPicker ── */}
                <div className="px-5 pt-4 pb-3">
                  <p className="text-[10px] text-cream/30 font-bold uppercase tracking-wider mb-3">
                    Your offer · select pieces to trade
                  </p>
                  {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center gap-1.5">
                      <Package className="w-5 h-5 text-cream/15" />
                      <p className="text-cream/30 text-sm font-medium">Your vault is empty</p>
                      <p className="text-cream/20 text-xs max-w-[200px] leading-relaxed">
                        Curate pieces to your vault to include them in a bounty.
                      </p>
                    </div>
                  ) : (
                    <PowerPicker
                      items={items as PowerPickerItem[]}
                      mode="multi"
                      selectedIds={editSelectedIds}
                      onToggle={toggleEditItem}
                    />
                  )}

                  {/* ── Add cash to bounty ── */}
                  <div className="mt-4">
                    <p className="text-[9px] text-cream/20 font-bold uppercase tracking-wider mb-1.5">
                      + Add cash to bounty
                    </p>
                    <div className="relative">
                      <DollarSign className="absolute top-1/2 -translate-y-1/2 left-3 w-3.5 h-3.5 text-green-400/40 pointer-events-none" />
                      <input
                        type="number"
                        min={0}
                        step={5}
                        value={editCash || ""}
                        onChange={(e) => setEditCash(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                        placeholder="0"
                        className="w-full pl-8 pr-24 py-2 rounded-xl bg-green-400/[0.04] border border-green-400/[0.12] text-sm text-cream/80 placeholder:text-cream/20 focus:outline-none focus:border-green-400/30 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      {editCash > 0 ? (
                        <span className="absolute top-1/2 -translate-y-1/2 right-3 text-xs font-bold text-green-400">
                          {formatValue(editCash)}
                        </span>
                      ) : (
                        <span className="absolute top-1/2 -translate-y-1/2 right-3 text-[10px] text-cream/20 font-medium">
                          optional
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Footer — note + actions ── */}
              <div className="px-5 pb-6 pt-3 border-t border-white/[0.06] flex-shrink-0 space-y-3">
                {/* Collector's Note — matches ProposeTradeModal message field */}
                <div className="relative">
                  <MessageSquare className="absolute top-2.5 left-3 w-3.5 h-3.5 text-cream/25 pointer-events-none" />
                  <textarea
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Collector's note… e.g. Willing to add $50 · PSA 9+ only 🔥"
                    maxLength={200}
                    rows={2}
                    className="w-full pl-8 pr-3 pb-7 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs text-cream/80 placeholder:text-cream/25 resize-none focus:outline-none focus:border-primary/30 transition-colors"
                  />
                  {/* Quick emoji popover */}
                  {editShowEmoji && (
                    <div className="absolute bottom-[calc(100%-4px)] right-0 mb-1 flex gap-1 p-1.5 rounded-2xl bg-charcoal-dark/95 border border-white/[0.10] shadow-lg backdrop-blur-sm animate-slide-up z-10">
                      {QUICK_EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => { setEditNote((n) => n + e); setEditShowEmoji(false); }}
                          className="w-8 h-8 text-lg rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors active:scale-90"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditShowEmoji((v) => !v)}
                    className={`absolute bottom-2 right-2.5 w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                      editShowEmoji ? "bg-primary/20 text-primary" : "text-cream/25 hover:text-cream/50 hover:bg-white/[0.06]"
                    }`}
                  >
                    <Smile className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingRadarEntry(null)}
                    className="px-5 py-3 rounded-2xl bg-white/[0.06] text-cream/40 font-bold text-sm hover:bg-white/10 active:scale-[0.97] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const ids = Array.from(editSelectedIds);
                      setRadarItems((prev) =>
                        prev.map((r) =>
                          r.id === editingRadarEntry.id
                            ? {
                                ...r,
                                cashOffer:      editCash > 0 ? editCash : undefined,
                                tradingItemIds: ids.length > 0 ? ids : undefined,
                                note:           editNote.trim() || undefined,
                              }
                            : r
                        )
                      );
                      setEditingRadarEntry(null);
                      setRadarToast("Bounty updated ✓");
                      setTimeout(() => setRadarToast(""), 2500);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/20 text-primary font-bold text-sm hover:bg-primary/30 active:scale-[0.97] transition-all"
                  >
                    <Send className="w-4 h-4" />
                    Save Bounty{editSelectedIds.size > 0 ? ` (${editSelectedIds.size})` : ""}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Achievement Detail Modal ───────────────────────── */}
      {selectedAchievement && (
        <AchievementModal
          achievement={selectedAchievement}
          onClose={() => setSelectedAchievement(null)}
          isPinned={pinnedAchievementIds.has(selectedAchievement.id)}
          onPin={() => togglePin(selectedAchievement.id)}
        />
      )}

      <BottomNav />
    </div>
  );
}