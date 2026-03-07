"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ProposeTradeModal from "@/components/ProposeTradeModal";
import ReviewsListModal from "@/components/ReviewsListModal";
import { socialUsers } from "@/lib/data";
import { CollectibleItem } from "@/lib/types";
import { formatValue } from "@/lib/format";
import {
  ArrowLeft,
  ArrowLeftRight,
  Crown,
  Database,
  DollarSign,
  Mail,
  Package,
  Star,
  TrendingUp,
  UserCheck,
  UserPlus,
} from "lucide-react";

// ── Trust Stars ──────────────────────────────────────────────────────────────
function TrustStars({ score, reviewCount }: { score: number; reviewCount?: number }) {
  const full = Math.floor(score);
  const half = score - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
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
    </div>
  );
}

// ── Item Card (read-only) ────────────────────────────────────────────────────
function ItemCard({
  item,
  index,
  onTap,
}: {
  item: CollectibleItem;
  index: number;
  onTap: () => void;
}) {
  const whiteBg = item.category === "Lego" || item.category === "Funko Pop";
  return (
    <button
      onClick={onTap}
      className="relative rounded-2xl overflow-hidden bg-background-light shadow-soft group cursor-pointer text-left w-full animate-scale-in"
      style={{ animationDelay: `${Math.min(index, 15) * 0.04}s`, animationFillMode: "both" }}
    >
      <div
        className={`aspect-square flex items-center justify-center ${
          whiteBg ? "bg-white p-2" : "bg-white/[0.05] p-3"
        }`}
      >
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>

      {/* "For Trade" badge */}
      {item.upForTrade && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary/90 flex items-center justify-center shadow-soft">
          <ArrowLeftRight className="w-2.5 h-2.5 text-charcoal-dark" />
        </div>
      )}

      {/* Catalog-linked badge */}
      {item.masterId && (
        <div className="absolute bottom-[2.75rem] right-1.5 w-4 h-4 rounded-full bg-surface/80 flex items-center justify-center">
          <Database className="w-2.5 h-2.5 text-white" />
        </div>
      )}

      <div className="px-2 py-1.5">
        <p className="text-[10px] text-cream/80 truncate leading-tight font-medium">
          {item.name}
        </p>
        {item.estimatedValue != null ? (
          <p className="text-[9px] text-primary/70 font-semibold mt-0.5">
            {formatValue(item.estimatedValue)}
          </p>
        ) : null}
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

  const [targetItem, setTargetItem] = useState<CollectibleItem | null>(null);
  const [msgToast, setMsgToast] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [following, setFollowing] = useState(false);

  const handleMessage = () => {
    setMsgToast(true);
    setTimeout(() => setMsgToast(false), 3000);
  };

  // ── Drag-to-scroll for grails strip ─────────────────────────────────────
  const grailsRef  = useRef<HTMLDivElement>(null);
  const grailsDrag = useRef({ active: false, startX: 0, scrollLeft: 0 });
  const onGDown = (e: React.MouseEvent) => {
    grailsDrag.current = { active: true, startX: e.pageX, scrollLeft: grailsRef.current?.scrollLeft ?? 0 };
    if (grailsRef.current) grailsRef.current.style.cursor = "grabbing";
  };
  const onGMove = (e: React.MouseEvent) => {
    if (!grailsDrag.current.active || !grailsRef.current) return;
    e.preventDefault();
    grailsRef.current.scrollLeft = grailsDrag.current.scrollLeft - (e.pageX - grailsDrag.current.startX);
  };
  const onGEnd = () => {
    grailsDrag.current.active = false;
    if (grailsRef.current) grailsRef.current.style.cursor = "grab";
  };

  // ── Not found ────────────────────────────────────────────────────────────
  if (!socialUser) {
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

  const { user, inventory, grailIds } = socialUser;

  const grails = useMemo(() => {
    const pinned = grailIds
      .map((id) => inventory.find((i) => i.id === id))
      .filter((i): i is CollectibleItem => !!i);
    if (pinned.length >= 3) return pinned.slice(0, 3);
    const set = new Set(grailIds);
    const rest = [...inventory]
      .filter((i) => !set.has(i.id))
      .sort((a, b) => (b.estimatedValue ?? 0) - (a.estimatedValue ?? 0));
    return [...pinned, ...rest].slice(0, 3);
  }, [inventory, grailIds]);

  const totalValue = useMemo(
    () => inventory.reduce((s, i) => s + (i.estimatedValue ?? 0), 0),
    [inventory],
  );

  const forTradeCount = inventory.filter((i) => i.upForTrade).length;

  const memberDate = new Date(user.memberSince).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

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
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-cream">{user.name}</h1>
                {user.handle && (
                  <span className="text-xs text-cream/30 font-medium font-mono">@{user.handle}</span>
                )}
              </div>
              <button
                onClick={() => setReviewsOpen(true)}
                className="rounded-lg transition-opacity hover:opacity-75 active:opacity-50"
              >
                <TrustStars score={user.trustScore} reviewCount={6} />
              </button>
              {user.bio && (
                <p className="text-xs text-cream/40 mt-1.5 leading-relaxed line-clamp-2">{user.bio}</p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-2 mt-4">
            <div className="flex-1 px-3 py-2.5 rounded-2xl bg-background-light">
              <p className="text-[10px] text-cream/30 font-medium">Trades</p>
              <p className="text-sm text-cream font-bold">{user.totalTrades}</p>
            </div>
            <div className="flex-1 px-3 py-2.5 rounded-2xl bg-background-light">
              <p className="text-[10px] text-cream/30 font-medium">Items</p>
              <p className="text-sm text-cream font-bold">{inventory.length}</p>
            </div>
            <div className="flex-1 px-3 py-2.5 rounded-2xl bg-background-light">
              <p className="text-[10px] text-cream/30 font-medium">Member</p>
              <p className="text-sm text-cream font-bold">{memberDate}</p>
            </div>
          </div>

          {/* Action row */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleMessage}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-cream/60 font-semibold text-sm hover:bg-white/[0.09] hover:text-cream/80 active:scale-[0.98] transition-all"
            >
              <Mail className="w-4 h-4" />
              Message
            </button>
            <button
              onClick={() => setFollowing((f) => !f)}
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all ${
                following
                  ? "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/25"
                  : "bg-white/[0.05] border border-white/[0.08] text-cream/60 hover:bg-white/[0.09] hover:text-cream/80"
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

        {/* ── Collection Value ────────────────────────────────────── */}
        <div className="mx-5 mb-5 rounded-2xl bg-gradient-to-r from-primary/15 via-surface/10 to-primary/15 p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <p className="text-xs text-cream/50 font-semibold">Collection Value</p>
              </div>
              <p className="text-2xl font-extrabold text-primary value-display">
                {formatValue(totalValue)}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-cream/30 mb-1">
                <DollarSign className="w-3 h-3" />
                <span className="text-[10px] font-medium">{inventory.length} items</span>
              </div>
              <div className="flex items-center gap-1 text-primary/50">
                <ArrowLeftRight className="w-3 h-3" />
                <span className="text-[10px] font-medium">{forTradeCount} for trade</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Top 3 Grails ────────────────────────────────────────── */}
        <div className="px-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-bold text-cream/80">Top 3 Grails</h2>
          </div>
          <div
            ref={grailsRef}
            className="flex gap-3 overflow-x-auto pb-2 scrollbar-none cursor-grab select-none"
            onMouseDown={onGDown}
            onMouseMove={onGMove}
            onMouseUp={onGEnd}
            onMouseLeave={onGEnd}
          >
            {grails.map((item, i) => {
              const whiteBg = item.category === "Lego" || item.category === "Funko Pop";
              return (
                <button
                  key={item.id}
                  onClick={() => setTargetItem(item)}
                  className="flex-shrink-0 w-40 rounded-2xl overflow-hidden bg-background-light shadow-soft-lg animate-scale-in relative group text-left"
                  style={{ animationDelay: `${i * 0.1}s`, animationFillMode: "both" }}
                >
                  <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-yellow-400/90 flex items-center justify-center shadow-soft">
                    <span className="text-xs font-extrabold text-charcoal-dark">{i + 1}</span>
                  </div>
                  <div className={`aspect-[4/3] flex items-center justify-center ${
                    whiteBg ? "bg-white p-2" : "bg-white/[0.05] p-3"
                  }`}>
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs text-cream/90 font-semibold truncate">{item.name}</p>
                    <p className="text-xs text-primary font-bold mt-0.5">
                      {formatValue(item.estimatedValue ?? 0)}
                    </p>
                    <p className="text-[10px] text-surface-light/60 mt-0.5">{item.category}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Full Collection ──────────────────────────────────────── */}
        <div className="px-5 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-cream/50" />
            <h2 className="text-sm font-bold text-cream/80">Collection</h2>
            <span className="text-[10px] text-cream/25 ml-1">tap any item to make an offer</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {inventory.map((item, i) => (
              <ItemCard
                key={item.id}
                item={item}
                index={i}
                onTap={() => setTargetItem(item)}
              />
            ))}
          </div>
        </div>
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
        onClose={() => setTargetItem(null)}
      />

      <BottomNav />
    </div>
  );
}
