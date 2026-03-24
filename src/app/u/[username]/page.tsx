"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useRef, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { isDemoUser } from "@/lib/demo";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ProposeTradeModal from "@/components/ProposeTradeModal";
import ReviewsListModal from "@/components/ReviewsListModal";
import AddItemModal from "@/components/AddItemModal";
import { socialUsers } from "@/lib/data";
import { CollectibleItem } from "@/lib/types";
import { formatValue } from "@/lib/format";
import { useInventory } from "@/lib/InventoryContext";
import { type Achievement, ACHIEVEMENTS } from "@/lib/achievements";
import AchievementModal from "@/components/AchievementModal";
import {
  ArrowLeft,
  ArrowLeftRight,
  Award,
  Bell,
  Calendar,
  Crosshair,
  Target,
  CreditCard,
  Crown,
  Database,
  Lock,
  Mail,
  Package,
  Plus,
  RefreshCw,

  Star,
  TrendingUp,
  Truck,
  UserCheck,
  UserPlus,
  Zap,
} from "lucide-react";

// ── Radar types + per-user seed data ─────────────────────────────────────────

type RadarEntry = {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  marketValue: number;
  budget?: string;
  trading?: string;
};

const RADAR_BY_HANDLE: Record<string, RadarEntry[]> = {
  drew: [
    { id: "dr-r1", name: "Pikachu Illustrator (PSA 9)", imageUrl: "https://images.pokemontcg.io/swsh12pt5/67.png", category: "Pokémon TCG", marketValue: 350000, budget: "$400K+" },
    { id: "dr-r2", name: "Charizard (Base Set) PSA 10", imageUrl: "https://images.pokemontcg.io/base1/4.png",       category: "Pokémon TCG", marketValue: 12000,  trading: "Lugia Neo Genesis BGS 9 + cash" },
    { id: "dr-r3", name: "Blastoise (Base Set) PSA 10", imageUrl: "https://images.pokemontcg.io/base1/2.png",       category: "Pokémon TCG", marketValue: 8500,   budget: "$9,000" },
  ],
  ethan: [
    { id: "et-r1", name: "Honus Wagner T206 (VG)", imageUrl: "https://images.unsplash.com/photo-1612404819070-1b5e6791e6ad?w=400&h=400&fit=crop", category: "Sports Cards", marketValue: 12000, budget: "$15,000" },
    { id: "et-r2", name: "Freddy Funko Ghost Rider Metallic (SDCC 2013)", imageUrl: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&h=400&fit=crop&auto=format&q=80&seed=5", category: "Funko Pop", marketValue: 33500, trading: "Freddy Batman SDCC 2016 + cash" },
  ],
  alex: [
    { id: "al-r1", name: "LEGO Star Wars Millennium Falcon #75192", imageUrl: "https://cdn.rebrickable.com/media/sets/75192-1.jpg", category: "Lego", marketValue: 890, budget: "$1,000" },
    { id: "al-r2", name: "Mew ex Special Art Rare",   imageUrl: "https://images.pokemontcg.io/sv3pt5/205.png", category: "Pokémon TCG", marketValue: 420, trading: "Umbreon VMAX Alt Art" },
  ],
};

// ── Per-user achievements (subset of global ACHIEVEMENTS with personal dates) ─

/** IDs of achievements unlocked by each user, with their own unlock date + catalyst */
const USER_ACHIEVEMENTS: Record<string, Achievement[]> = {
  drew: [
    {
      ...ACHIEVEMENTS.find((a) => a.id === "heavyweight")!,
      unlockedAt:   "Mar 2, 2026",
      catalystItem: { name: "Charizard Base Set PSA 10", imageUrl: "https://images.pokemontcg.io/base1/4_hires.png" },
    },
    {
      ...ACHIEVEMENTS.find((a) => a.id === "dealmaker")!,
      unlockedAt:   "Nov 18, 2025",
      catalystItem: { name: "Pikachu Illustrator PSA 9", imageUrl: "https://images.pokemontcg.io/swsh12pt5/67.png" },
    },
    { ...ACHIEVEMENTS.find((a) => a.id === "first-blood")!,   unlockedAt: "Apr 5, 2023" },
    { ...ACHIEVEMENTS.find((a) => a.id === "early-adopter")!, unlockedAt: "Aug 1, 2024" },
  ],
  ethan: [
    {
      ...ACHIEVEMENTS.find((a) => a.id === "heavyweight")!,
      unlockedAt:   "Jan 10, 2026",
      catalystItem: { name: "Honus Wagner T206", imageUrl: "https://images.unsplash.com/photo-1612404819070-1b5e6791e6ad?w=200&q=80" },
    },
    {
      ...ACHIEVEMENTS.find((a) => a.id === "high-roller")!,
      unlockedAt:   "Oct 22, 2025",
      catalystItem: { name: "Freddy Funko SDCC Metallic", imageUrl: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=200&q=80" },
    },
    { ...ACHIEVEMENTS.find((a) => a.id === "first-blood")!, unlockedAt: "Jun 3, 2023" },
  ],
  alex: [
    { ...ACHIEVEMENTS.find((a) => a.id === "first-blood")!,   unlockedAt: "Dec 1, 2024" },
    { ...ACHIEVEMENTS.find((a) => a.id === "early-adopter")!, unlockedAt: "Aug 1, 2024" },
    {
      ...ACHIEVEMENTS.find((a) => a.id === "dealmaker")!,
      unlockedAt:   "Feb 7, 2026",
      catalystItem: { name: "Mew ex Special Art Rare", imageUrl: "https://images.pokemontcg.io/sv3pt5/205_hires.png" },
    },
  ],
  sam: [
    { ...ACHIEVEMENTS.find((a) => a.id === "first-blood")!,   unlockedAt: "Jan 14, 2025" },
    { ...ACHIEVEMENTS.find((a) => a.id === "early-adopter")!, unlockedAt: "Aug 1, 2024" },
  ],
  jordan: [
    { ...ACHIEVEMENTS.find((a) => a.id === "early-adopter")!, unlockedAt: "Sep 12, 2024" },
    { ...ACHIEVEMENTS.find((a) => a.id === "first-blood")!,   unlockedAt: "Mar 3, 2025" },
  ],
};

// ── Trust Stars ──────────────────────────────────────────────────────────────
function TrustStars({ score, reviewCount, onClick }: { score: number; reviewCount?: number; onClick?: () => void }) {
  const full = Math.floor(score);
  const half = score - full >= 0.5;
  return (
    <button onClick={onClick} className="flex items-center gap-0.5 rounded-lg transition-opacity hover:opacity-75">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < full
              ? "text-yellow-400 fill-yellow-400"
              : i === full && half
              ? "text-yellow-400 fill-yellow-400/50"
              : "text-cream/15"
          }`}
        />
      ))}
      <span className="text-xs text-cream/50 ml-1 font-semibold">{score.toFixed(1)}</span>
      {reviewCount != null && (
        <span className="text-[10px] text-cream/30 ml-0.5 font-medium">({reviewCount})</span>
      )}
    </button>
  );
}

// ── Item Card (read-only) ────────────────────────────────────────────────────
function ItemCard({ item, index, onTap }: { item: CollectibleItem; index: number; onTap: () => void }) {
  const whiteBg = item.category === "Lego" || item.category === "Funko Pop";
  return (
    <button
      onClick={onTap}
      className="relative rounded-2xl overflow-hidden bg-background-light shadow-soft group cursor-pointer text-left w-full animate-scale-in"
      style={{ animationDelay: `${Math.min(index, 15) * 0.04}s`, animationFillMode: "both" }}
    >
      <div className={`aspect-square flex items-center justify-center ${whiteBg ? "bg-white p-2" : "bg-white/[0.05] p-3"}`}>
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>
      <div className="px-2 py-1.5">
        <p className="text-[10px] text-cream/80 truncate leading-tight font-medium">{item.name}</p>
        {item.estimatedValue != null && (
          <p className="text-[9px] text-primary/70 font-semibold mt-0.5">{formatValue(item.estimatedValue)}</p>
        )}
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ██  PUBLIC PROFILE PAGE  ████████████████████████████████████████████████████
// ═══════════════════════════════════════════════════════════════════════════════

export default function PublicProfilePage() {
  const params  = useParams();
  const router  = useRouter();
  const handle  = (params.username as string)?.toLowerCase();

  const socialUser = useMemo(
    () => socialUsers.find((u) => u.user.handle?.toLowerCase() === handle),
    [handle],
  );

  const { data: session } = useSession();
  const isDemo = isDemoUser(session?.user?.email);

  const { items: myItems } = useInventory();

  const [targetItem, setTargetItem]   = useState<CollectibleItem | null>(null);
  const [msgToast, setMsgToast]       = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [following, setFollowing]     = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Load follow status from DB for real users
  useEffect(() => {
    if (isDemo || !session?.user?.id || !handle) return;
    fetch(`/api/follow?userId=${encodeURIComponent(handle)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { isFollowing?: boolean } | null) => {
        if (data?.isFollowing != null) setFollowing(data.isFollowing);
      })
      .catch(() => {});
  }, [isDemo, session?.user?.id, handle]);
  const [profileTab, setProfileTab]   = useState<"collection" | "radar">("collection");
  const [showAddModal, setShowAddModal] = useState(false);
  const [tradePrefill, setTradePrefill] = useState<{ selectedIds: Set<string> } | undefined>(undefined);
  const [lockedToast,  setLockedToast]  = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const userRadar = RADAR_BY_HANDLE[handle] ?? [];

  // Returns the first matching inventory item for a radar entry (or null)
  const getMatchForEntry = useMemo(() => {
    return (entryName: string): CollectibleItem | null => {
      const key = entryName.toLowerCase().split(" ")[0];
      return (
        myItems.find(
          (item) =>
            item.name.toLowerCase().includes(key) ||
            entryName.toLowerCase().includes(item.name.toLowerCase().split(" ")[0])
        ) ?? null
      );
    };
  }, [myItems]);

  const handleMessage = () => {
    router.push(`/inbox/${handle}`);
  };

  // Null-safe destructure — hooks must run unconditionally on every render,
  // so we extract with fallbacks here and guard with the early return below.
  const user      = socialUser?.user;
  const inventory = socialUser?.inventory ?? [];
  const grailIds  = socialUser?.grailIds  ?? [];

  const grails = useMemo(() => {
    if (!user) return [];
    // Free users: always auto Top 3 by value, ignore manual grailIds
    if (user.tier !== 'pro') {
      return [...inventory]
        .sort((a, b) => (b.estimatedValue ?? 0) - (a.estimatedValue ?? 0))
        .slice(0, 3);
    }
    const pinned = grailIds
      .map((id) => inventory.find((i) => i.id === id))
      .filter((i): i is CollectibleItem => !!i);
    if (pinned.length >= 3) return pinned.slice(0, 3);
    const set = new Set(grailIds);
    const rest = [...inventory]
      .filter((i) => !set.has(i.id))
      .sort((a, b) => (b.estimatedValue ?? 0) - (a.estimatedValue ?? 0));
    return [...pinned, ...rest].slice(0, 3);
  }, [inventory, grailIds, user?.tier]);

  const totalValue = useMemo(
    () => inventory.reduce((s, i) => s + (i.estimatedValue ?? 0), 0),
    [inventory],
  );

  const [activeFilter, setActiveFilter] = useState("All");

  const categoryCounts = useMemo(() =>
    inventory.reduce((acc: Record<string, number>, item) => {
      if (item.category) acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {}), [inventory]);

  const filters = useMemo(() =>
    ["All", "In Trade", ...Object.keys(categoryCounts)],
    [categoryCounts]);

  const forTradeCount = useMemo(() => inventory.filter((i) => i.upForTrade).length, [inventory]);

  const filteredInventory = useMemo(() => {
    if (activeFilter === "All")      return inventory;
    if (activeFilter === "In Trade") return inventory.filter((i) => i.upForTrade);
    return inventory.filter((i) => i.category === activeFilter);
  }, [inventory, activeFilter]);

  // ── Not found — MUST come after all hooks ────────────────────────────────
  if (!socialUser || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-8">
        <p className="text-5xl">🔍</p>
        <p className="text-lg font-bold text-cream">Profile not found</p>
        <p className="text-sm text-cream/40">
          No collector with the handle <span className="text-cream/60 font-mono">@{handle}</span> exists.
        </p>
        <button
          onClick={() => router.back()}
          className="mt-2 px-6 py-2.5 rounded-2xl bg-background-light text-cream/60 text-sm font-semibold hover:bg-charcoal-light/50 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const memberYear = new Date(user.memberSince).getFullYear().toString().slice(-2);
  const memberDateFull = new Date(user.memberSince).toLocaleDateString("en-US", {
    month: "short", year: "numeric",
  });

  // Gold / Silver / Bronze theme lookup (same as private profile)
  const grailThemes = [
    { badge: "bg-[#D4AF37] text-[#713F12] border border-[#FDE047]/80", wrapper: "shadow-[0_0_15px_rgba(212,175,55,0.15)] ring-1 ring-[#D4AF37]/50", price: "text-[#FDE047]" },
    { badge: "bg-[#C0C0C0] text-[#374151] border border-white/80",      wrapper: "shadow-[0_0_15px_rgba(156,163,175,0.15)] ring-1 ring-[#9CA3AF]/50", price: "text-[#E5E7EB]" },
    { badge: "bg-[#CD7F32] text-[#451A03] border border-[#FDBA74]/80",  wrapper: "shadow-[0_0_15px_rgba(180,83,9,0.15)] ring-1 ring-[#B45309]/50",   price: "text-[#FDBA74]" },
  ];

  return (
    <div className="min-h-screen pb-20">
      <Header />

      <main className="max-w-lg mx-auto">

        {/* ── Back ──────────────────────────────────────────────── */}
        <div className="px-5 pt-4 pb-1">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-cream/35 hover:text-cream/70 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>

        {/* ── Profile Header ─────────────────────────────────────── */}
        <div className="px-5 pt-4 pb-5">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 border-2 border-primary/30 overflow-hidden flex-shrink-0">
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              {/* Name row */}
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-cream truncate">{user.name}</h1>
                {user.handle && (
                  <span className="text-xs text-cream/30 font-medium font-mono shrink-0">@{user.handle}</span>
                )}
                {/* Pro badge — shown only if this user is Pro */}
                {user.tier === 'pro' && (
                  <span className="inline-flex items-center text-[10px] font-bold tracking-wider uppercase bg-[#CAE6CE] text-[#1A1818] px-2 py-0.5 rounded-full shrink-0">
                    PRO
                  </span>
                )}
              </div>
              <TrustStars score={user.trustScore} reviewCount={6} onClick={() => setReviewsOpen(true)} />
              {user.bio && (
                <p className="text-xs text-cream/40 mt-1.5 leading-relaxed line-clamp-2">{user.bio}</p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-4 mb-1">
            <button
              onClick={handleMessage}
              className="flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl bg-[#2C2929] border border-white/[0.05] text-[#FCF9D5] text-sm font-semibold hover:bg-white/[0.05] transition-colors"
            >
              <Mail className="w-4 h-4" />
              Message
            </button>
            <button
              disabled={followLoading}
              onClick={async () => {
                if (isDemo) { setFollowing((f) => !f); return; }
                setFollowLoading(true);
                try {
                  if (following) {
                    await fetch(`/api/follow?userId=${encodeURIComponent(handle)}`, { method: "DELETE" });
                    setFollowing(false);
                  } else {
                    await fetch("/api/follow", {
                      method:  "POST",
                      headers: { "Content-Type": "application/json" },
                      body:    JSON.stringify({ followingId: handle }),
                    });
                    setFollowing(true);
                  }
                } catch { /* ignore */ }
                setFollowLoading(false);
              }}
              className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors active:scale-[0.98] ${
                following
                  ? "bg-[#CAE6CE]/20 border border-[#CAE6CE]/30 text-[#CAE6CE] hover:bg-[#CAE6CE]/30"
                  : "bg-[#CAE6CE]/10 border border-[#CAE6CE]/20 text-[#CAE6CE] hover:bg-[#CAE6CE]/20"
              }`}
            >
              {following ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {following ? "Following" : "Follow"}
            </button>
          </div>
        </div>

        {/* Coming Soon toast */}
        {msgToast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-charcoal-light border border-white/10 shadow-2xl">
              <Mail className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-cream">Direct messaging — coming soon!</span>
            </div>
          </div>
        )}

        {/* ── Total Inventory Value Card ───────────────────────────── */}
        {(() => {
          const payments = ["PayPal", "Venmo"];
          const shipping = ["Worldwide Shipping", "Local Pickup"];
          return (
            <div className="mx-5 mb-5 rounded-2xl bg-background-light shadow-soft overflow-visible">
              {/* Top: value + stats pills */}
              <div className="px-4 pt-4 pb-3.5 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    <p className="text-[10px] text-cream/40 font-bold uppercase tracking-wider">Total Inventory Value</p>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <p className="text-2xl font-extrabold text-primary value-display">{formatValue(totalValue)}</p>
                    {/* Locked trend pill */}
                    <div className="relative group">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.05] text-[#787569] text-[11px] font-semibold tracking-wide cursor-default select-none">
                        <Lock className="w-3 h-3 text-[#AA95C5]" />
                        <span className="blur-[3px] opacity-70 select-none">+$4.2K (8.5%)</span>
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2.5 bg-[#221F1F] border border-white/[0.08] rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50">
                        <div className="flex flex-col items-center text-center gap-1.5 w-[200px]">
                          <Lock className="w-4 h-4 text-[#AA95C5] mb-0.5" />
                          <span className="text-[11px] font-bold text-[#FCF9D5]">Pro Feature Locked</span>
                          <span className="text-[9px] text-[#787569] leading-tight"><b className="text-cream/60">{user.name}</b> hasn&apos;t unlocked Portfolio Tracking. Pro members get exclusive access to historical value trends.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Stats pills — Trades + Joined only */}
                <div className="flex flex-col gap-2 items-end">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2C2929] border border-white/[0.08] text-[#FCF9D5] text-[10px] font-semibold shadow-sm">
                    <RefreshCw className="w-3 h-3 text-[#CAE6CE]" />
                    {user.totalTrades} Trades
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2C2929] border border-white/[0.08] text-[#FCF9D5] text-[10px] font-semibold shadow-sm">
                    <Calendar className="w-3 h-3 text-[#AA95C5]" />
                    Joined &apos;{memberYear}
                  </div>
                </div>
              </div>

              {/* Preferences — two-row static layout */}
              <div className="px-4 pb-4">
                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/[0.1] to-transparent mb-3 mt-1" />
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <CreditCard className="w-4 h-4 shrink-0 text-[#CAE6CE] drop-shadow-[0_0_8px_rgba(202,230,206,0.3)]" />
                    {payments.map((m) => (
                      <div key={m} className="px-2.5 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.06] transition-colors border border-white/[0.05] text-[10px] font-medium text-[#FCF9D5] whitespace-nowrap backdrop-blur-sm">
                        {m}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Truck className="w-4 h-4 shrink-0 text-[#AA95C5] drop-shadow-[0_0_8px_rgba(170,149,197,0.3)]" />
                    {shipping.map((s) => (
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

        {/* ── Achievements Strip ───────────────────────────────────── */}
        {(() => {
          const userAchievements = USER_ACHIEVEMENTS[handle] ?? [];
          if (userAchievements.length === 0) return null;
          const pct = Math.round((userAchievements.length / ACHIEVEMENTS.length) * 100);
          return (
            <div className="mb-5">
              <div className="px-5 flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#D4AF37]" />
                  <h2 className="text-sm font-bold text-cream/80">
                    Achievements{" "}
                    <span className="text-cream/30 font-semibold">({userAchievements.length}/{ACHIEVEMENTS.length})</span>
                  </h2>
                </div>
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
              <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-pl-5 pb-2 pl-5">
                {userAchievements.map((achievement, i) => {
                  const Icon = achievement.icon;
                  return (
                    <button
                      key={achievement.id}
                      onClick={() => setSelectedAchievement(achievement)}
                      className="relative flex-shrink-0 w-32 h-36 snap-start rounded-2xl flex flex-col items-center justify-center gap-2 px-2.5 pt-4 pb-3 text-center active:scale-95 transition-all animate-scale-in overflow-hidden bg-[#1A1818]"
                      style={{
                        animationDelay:    `${i * 0.06}s`,
                        animationFillMode: "both",
                        border:    `1px solid ${achievement.glow.replace(/[\d.]+\)$/, "0.4)")}`,
                        boxShadow: `0 0 14px -4px ${achievement.glow}, inset 0 1px 0 rgba(255,255,255,0.04)`,
                      }}
                    >
                      {/* Icon */}
                      <div className="relative flex-shrink-0">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/[0.07]"
                          style={{ boxShadow: `0 0 12px -3px ${achievement.glow}` }}
                        >
                          <Icon className={`w-6 h-6 ${achievement.color}`} strokeWidth={2} />
                        </div>
                      </div>
                      {/* Text */}
                      <div className="flex flex-col items-center gap-0.5 w-full">
                        <p className="text-[11px] font-extrabold leading-tight text-center text-cream/90 w-full">
                          {achievement.title}
                        </p>
                        <p className="text-[9px] leading-snug line-clamp-2 text-center text-cream/40 w-full">
                          {achievement.description}
                        </p>
                      </div>
                      {/* Bottom glow strip */}
                      <div
                        className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full"
                        style={{ background: `linear-gradient(90deg, transparent, ${achievement.glow}, transparent)` }}
                      />
                    </button>
                  );
                })}
                <div className="w-5 flex-shrink-0" />
              </div>
            </div>
          );
        })()}

        {/* ── Top 3 Grails — Hero Layout ───────────────────────────── */}
        <div className="px-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-bold text-cream/80">Top 3 Grails</h2>
          </div>
          {grails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Crown className="w-8 h-8 text-white/10 mb-3" />
              <p className="text-sm text-cream/30 font-medium">No Grails to display yet.</p>
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-3 w-full">
            {grails.map((item, i) => {
              const isHero = i === 0;
              const theme = grailThemes[i];
              return (
                <div
                  key={item.id}
                  onClick={() => setTargetItem(item)}
                  className={`${isHero ? "col-span-2" : "col-span-1"} relative rounded-2xl p-[1px] bg-gradient-to-b from-white/10 via-transparent to-transparent cursor-pointer transition-transform active:scale-95 hover:opacity-90 animate-scale-in ${theme.wrapper}`}
                  style={{ animationDelay: `${i * 0.1}s`, animationFillMode: "both" }}
                >
                  <div className="h-full w-full bg-[#2C2929] rounded-2xl overflow-hidden">
                    <div className={`relative overflow-hidden ${isHero ? "h-[200px]" : "aspect-square"}`}>
                      <img
                        src={item.customImage || item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      {/* Metallic rank badge */}
                      <div className={`absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center text-sm font-black shadow-sm shadow-black/30 z-10 ${theme.badge}`}>
                        {i + 1}
                      </div>
                    </div>
                    <div className={isHero ? "px-3 py-3" : "px-2 py-1.5"}>
                      <p className={`text-cream/90 truncate font-semibold leading-tight ${isHero ? "text-sm" : "text-[10px]"}`}>
                        {item.name}
                      </p>
                      <p className={`font-bold mt-0.5 ${isHero ? "text-sm" : "text-[9px]"} ${theme.price}`}>
                        {formatValue(item.estimatedValue ?? 0)}
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

        {/* ── Section toggle ────────────────────────────────────────── */}
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
              Vault
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
              Radar
              {userRadar.length > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  profileTab === "radar"
                    ? "bg-[#CAE6CE]/20 text-[#CAE6CE]"
                    : "bg-white/[0.08] text-cream/40"
                }`}>
                  {userRadar.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Collection ───────────────────────────────────────────── */}
        {profileTab === "collection" && (
          <>
            <div className="px-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-cream/50" />
                <h2 className="text-sm font-bold text-cream/80">Vault</h2>
                <span className="text-[10px] text-cream/25 ml-1">tap any piece to make an offer</span>
              </div>
              {/* Filter pills */}
              <div className="flex flex-nowrap gap-2 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-none">
                {filters.map((f) => {
                  const isInTrade = f === "In Trade";
                  const isActive  = activeFilter === f;
                  return (
                    <button
                      key={f}
                      onClick={() => setActiveFilter(f)}
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
                      {f === "All" ? `All (${inventory.length})` : f === "In Trade" ? "In Trade" : `${f} (${categoryCounts[f] ?? 0})`}
                      {isInTrade && forTradeCount > 0 && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive ? "bg-amber-500/30 text-amber-300" : "bg-amber-500/20 text-amber-400"
                        }`}>
                          {forTradeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Item grid */}
            <div className="px-5 pb-6">
              {filteredInventory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center gap-2">
                  <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-1">
                    <Package className="w-6 h-6 text-white/20" />
                  </div>
                  <p className="text-sm font-semibold text-cream/30">Vault is empty</p>
                  <p className="text-xs text-cream/20 max-w-[180px] leading-relaxed">This Collector hasn&apos;t curated any pieces yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {filteredInventory.map((item, i) => (
                    <ItemCard key={item.id} item={item} index={i} onTap={() => setTargetItem(item)} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Public Radar ─────────────────────────────────────────── */}
        {profileTab === "radar" && (
          <div className="px-5 pb-8">
            <div className="flex items-center gap-2 mb-4">
              <Crosshair className="w-4 h-4 text-[#CAE6CE]" />
              <h2 className="text-sm font-bold text-cream/80">{user.name}&apos;s Radar</h2>
              <span className="text-[10px] text-cream/25">actively hunting</span>
            </div>

            {userRadar.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
                <Crosshair className="w-8 h-8 text-cream/15" />
                <p className="text-cream/30 text-sm font-medium">Nothing on Radar yet</p>
                <p className="text-cream/20 text-xs max-w-[200px] leading-relaxed">
                  {user.name} hasn&apos;t added any hunting targets yet.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {userRadar.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl bg-background-light border border-white/[0.06] overflow-hidden"
                  >
                    <div className="flex gap-3 p-3">
                      {/* Image */}
                      <div className="relative flex-shrink-0 w-[68px] h-[68px] rounded-xl overflow-hidden bg-white/[0.04]">
                        <img src={entry.imageUrl} alt={entry.name} className="w-full h-full object-contain p-1.5" loading="lazy" />
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-md bg-black/50 flex items-center justify-center">
                          <Crosshair className="w-2.5 h-2.5 text-[#CAE6CE]/60" />
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-cream truncate leading-snug">{entry.name}</p>
                        <p className="text-[10px] text-cream/30 mt-0.5 mb-2">
                          {entry.category} · ~{entry.marketValue >= 1000 ? `$${(entry.marketValue / 1000).toFixed(1)}K` : `$${entry.marketValue}`}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {entry.budget && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#AA95C5]/10 border border-[#AA95C5]/20">
                              <Bell className="w-2.5 h-2.5 text-[#AA95C5]" />
                              <span className="text-[10px] font-semibold text-[#AA95C5]">Budget: {entry.budget}</span>
                            </div>
                          )}
                          {entry.trading && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                              <ArrowLeftRight className="w-2.5 h-2.5 text-yellow-400/80" />
                              <span className="text-[10px] font-semibold text-yellow-400/80 truncate max-w-[160px]">Trading: {entry.trading}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* CTA — 3-state smart match */}
                    {(() => {
                      const match = getMatchForEntry(entry.name);
                      const radarItem: CollectibleItem = {
                        id: entry.id, name: entry.name, imageUrl: entry.imageUrl,
                        category: entry.category as CollectibleItem["category"],
                        upForTrade: false, estimatedValue: entry.marketValue,
                      };

                      // State 1: match found but item is locked in an active trade
                      if (match?.isLocked) {
                        return (
                          <div className="px-3 pb-3">
                            <button
                              onClick={() => {
                                setLockedToast(true);
                                setTimeout(() => setLockedToast(false), 3500);
                              }}
                              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-colors active:scale-95"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              Locked in another trade
                            </button>
                          </div>
                        );
                      }

                      // State 2: match found and item is free — pre-select it
                      if (match) {
                        return (
                          <div className="px-3 pb-3">
                            <button
                              onClick={() => {
                                setTradePrefill({ selectedIds: new Set([match.id]) });
                                setTargetItem(radarItem);
                              }}
                              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-500/25 transition-colors active:scale-95"
                            >
                              <span>🔥</span>
                              You have this! Propose Trade
                            </button>
                          </div>
                        );
                      }

                      // State 3: no match — invite user to add item first
                      return (
                        <div className="px-3 pb-3">
                          <button
                            onClick={() => setShowAddModal(true)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.09] text-cream/40 text-xs font-semibold hover:bg-white/[0.07] hover:text-cream/60 transition-colors active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Not in inventory · Add to Trade
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Reviews Modal ────────────────────────────────────────── */}
      <ReviewsListModal
        isOpen={reviewsOpen}
        onClose={() => setReviewsOpen(false)}
        userName={user.name}
        trustScore={user.trustScore}
      />

      {/* ── Propose Trade Modal ──────────────────────────────────── */}
      <ProposeTradeModal
        isOpen={!!targetItem}
        targetItem={targetItem}
        targetUser={user}
        prefill={tradePrefill}
        onClose={() => { setTargetItem(null); setTradePrefill(undefined); }}
      />

      {/* AddItemModal — lets user add the item to their inventory to propose a trade */}
      <AddItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={() => setShowAddModal(false)}
      />

      {/* Locked item toast */}
      {lockedToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 max-w-[320px] w-full px-4 animate-slide-up pointer-events-none">
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-[#2C2929] border border-amber-500/20 shadow-2xl shadow-black/40">
            <Lock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <span className="text-xs font-semibold text-cream/80 leading-relaxed">
              This item is currently locked in an active offer. Manage your Trade History to free it up.
            </span>
          </div>
        </div>
      )}

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <AchievementModal
          achievement={selectedAchievement}
          onClose={() => setSelectedAchievement(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}
