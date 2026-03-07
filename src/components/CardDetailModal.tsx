"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { X, Plus, Sparkles, BookOpen, DollarSign, ArrowLeftRight, Bell, TrendingUp, TrendingDown, Lock } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { MasterItem } from "@/lib/catalog/types";
import { mapCatalogCategory } from "@/lib/constants";
import { formatValue } from "@/lib/format";
import MarketplaceModal, { MarketplaceItem } from "./MarketplaceModal";
import { useNotifications } from "@/lib/NotificationContext";
import { useInventory } from "@/lib/InventoryContext";

interface CardDetailModalProps {
  item: MasterItem | null;
  onClose: () => void;
  onAdd: () => void;
  autoOpenTrade?: boolean;
}

// ── Rarity tier mapping ──────────────────────────────────────────────────

type RarityTier = "common" | "uncommon" | "rare" | "ultra" | "secret";

function getRarityTier(rarity?: string): RarityTier {
  if (!rarity) return "common";
  const r = rarity.toLowerCase();
  if (r.includes("secret") || r.includes("hyper") || r.includes("rainbow") || r.includes("gold"))
    return "secret";
  if (
    r.includes("ultra") ||
    r.includes("vmax") ||
    r.includes("vstar") ||
    r.includes("ex") ||
    r.includes("gx") ||
    r.includes("v ") ||
    r === "v" ||
    r.includes("illustration") ||
    r.includes("special art") ||
    r.includes("full art") ||
    r.includes("amazing")
  )
    return "ultra";
  if (r.includes("rare") && !r.includes("common")) return "rare";
  if (r.includes("uncommon")) return "uncommon";
  return "common";
}

const RARITY_STYLES: Record<RarityTier, { chip: string; icon: string; glow: string }> = {
  common: {
    chip: "bg-slate-500/10 border-slate-500/20",
    icon: "text-slate-400",
    glow: "",
  },
  uncommon: {
    chip: "bg-emerald-500/10 border-emerald-500/20",
    icon: "text-emerald-400",
    glow: "",
  },
  rare: {
    chip: "bg-blue-500/15 border-blue-400/30",
    icon: "text-blue-400",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.15)]",
  },
  ultra: {
    chip: "bg-purple-500/15 border-purple-400/30",
    icon: "text-purple-400",
    glow: "shadow-[0_0_30px_rgba(168,85,247,0.2)]",
  },
  secret: {
    chip: "bg-yellow-400/15 border-yellow-400/30",
    icon: "text-yellow-400",
    glow: "shadow-[0_0_40px_rgba(250,204,21,0.2)]",
  },
};

const RARITY_TEXT: Record<RarityTier, string> = {
  common: "text-slate-400",
  uncommon: "text-emerald-400",
  rare: "text-blue-400",
  ultra: "text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400",
  secret: "text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300",
};

// ── Market analytics helpers ──────────────────────────────────────────────

function generatePriceHistory(basePrice: number) {
  const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  // Start 15–30% lower than current, trend upward with volatility
  let price = basePrice * (0.72 + Math.random() * 0.13);
  return months.map((date, i) => {
    // Each month: drift upward ~3–5%, plus ±8% noise
    const drift = 1 + 0.03 + Math.random() * 0.025;
    const noise = 1 + (Math.random() - 0.46) * 0.16;
    // Last point should land near the actual market price
    if (i === months.length - 1) {
      price = basePrice;
    } else {
      price = price * drift * noise;
    }
    return { date, price: Math.round(price * 100) / 100 };
  });
}

// Custom tooltip for the chart
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-charcoal-dark/95 border border-white/[0.08] rounded-xl px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="text-[10px] text-cream/35 font-medium mb-0.5">{label}</p>
      <p className="text-sm font-bold text-cream">${payload[0].value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    </div>
  );
}

// ── Market tab content (extracted to avoid deeply-nested JSX closure issues) ──

type MarketTabProps = {
  isFree: boolean;
  onUpgrade: () => void;
  priceHistory: { date: string; price: number }[];
  firstPrice: number;
  lastPrice: number;
  isUp: boolean;
  chartColor: string;
  monthChange: number;
  monthChangePct: number;
  allTimeHigh: number;
  listedMedian: number;
};

function MarketTabContent({
  isFree, onUpgrade, priceHistory, firstPrice, lastPrice,
  isUp, chartColor, monthChange, monthChangePct, allTimeHigh, listedMedian,
}: MarketTabProps) {
  return (
    <div className="relative space-y-3">
      {/* Pro lock overlay */}
      {isFree && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl backdrop-blur-[6px] bg-charcoal-dark/60">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <div className="text-center px-4">
            <p className="text-sm font-bold text-cream mb-1">Pro Analytics</p>
            <p className="text-xs text-cream/40 leading-relaxed">
              Unlock Wall-Street style price charts &amp; market data with Uniques Pro.
            </p>
          </div>
          <button
            onClick={onUpgrade}
            className="px-5 py-2.5 rounded-2xl bg-primary text-charcoal-dark text-xs font-bold hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/20"
          >
            Unlock Pro — $4.99/mo
          </button>
        </div>
      )}

      {/* Content — blurred for free users */}
      <div className={isFree ? "pointer-events-none select-none space-y-3" : "space-y-3"}>
        {/* Chart */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 pb-2">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <p className="text-[10px] text-cream/30 font-semibold uppercase tracking-wider mb-0.5">6-Month Price</p>
              <p className="text-2xl font-bold text-cream">{formatValue(lastPrice)}</p>
            </div>
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
              isUp ? "bg-green-500/12 text-green-400" : "bg-red-500/12 text-red-400"
            }`}>
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {isUp ? "+" : ""}{((lastPrice - firstPrice) / firstPrice * 100).toFixed(1)}%
            </div>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={priceHistory} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={chartColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis domain={["auto", "auto"]} hide />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="price"
                stroke={chartColor}
                strokeWidth={2}
                fill="url(#priceGrad)"
                dot={false}
                activeDot={{ r: 4, fill: chartColor, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-between px-0.5 mt-1">
            {priceHistory.map((d) => (
              <span key={d.date} className="text-[9px] text-cream/20 font-medium">{d.date}</span>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3">
            <p className="text-[9px] text-cream/25 font-semibold uppercase tracking-wider mb-1.5">1M Change</p>
            <p className={`text-sm font-bold leading-tight ${monthChange >= 0 ? "text-green-400" : "text-red-400"}`}>
              {monthChange >= 0 ? "+" : ""}{formatValue(Math.abs(monthChange))}
            </p>
            <p className={`text-[10px] font-semibold mt-0.5 ${monthChange >= 0 ? "text-green-400/60" : "text-red-400/60"}`}>
              {monthChange >= 0 ? "+" : ""}{monthChangePct.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3">
            <p className="text-[9px] text-cream/25 font-semibold uppercase tracking-wider mb-1.5">Listed Median</p>
            <p className="text-sm font-bold text-cream leading-tight">{formatValue(listedMedian)}</p>
            <p className="text-[10px] text-cream/25 font-medium mt-0.5">active listings</p>
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3">
            <p className="text-[9px] text-cream/25 font-semibold uppercase tracking-wider mb-1.5">All-Time High</p>
            <p className="text-sm font-bold text-cream leading-tight">{formatValue(allTimeHigh)}</p>
            <p className="text-[10px] text-cream/25 font-medium mt-0.5">6-month peak</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mock collector avatars ───────────────────────────────────────────────

const MOCK_COLLECTORS = [
  { name: "Alex", seed: "Alex" },
  { name: "Sam", seed: "Sam" },
  { name: "Jordan", seed: "Jordan" },
  { name: "Riley", seed: "Riley" },
];

export default function CardDetailModal({ item, onClose, onAdd, autoOpenTrade }: CardDetailModalProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const isFree = !session?.user?.tier || session.user.tier === "free";
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [activeTab, setActiveTab] = useState<"trade" | "market">("trade");

  // When the deep-link includes action=trade, skip the details view and go
  // straight to the marketplace/trade panel once an item is loaded.
  useEffect(() => {
    if (autoOpenTrade && item) setShowMarketplace(true);
  }, [autoOpenTrade, item]);
  const { addNotification } = useNotifications();
  const { showToast } = useInventory();

  if (!item) return null;

  // ── Market analytics data (always generated — fallback price if none set) ──
  const effectivePrice = item.marketPrice > 0 ? item.marketPrice : Math.floor(Math.random() * 100) + 10;
  const priceHistory   = generatePriceHistory(effectivePrice);
  const firstPrice     = priceHistory[0]?.price ?? 0;
  const lastPrice      = priceHistory[priceHistory.length - 1]?.price ?? 0;
  const prevMonthPrice = priceHistory[priceHistory.length - 2]?.price ?? lastPrice;
  const isUp           = lastPrice >= firstPrice;
  const chartColor     = isUp ? "#22c55e" : "#ef4444";
  const monthChange    = lastPrice - prevMonthPrice;
  const monthChangePct = prevMonthPrice > 0 ? (monthChange / prevMonthPrice) * 100 : 0;
  const allTimeHigh    = Math.max(...priceHistory.map((d) => d.price));
  const listedMedian   = Math.round(lastPrice * 1.07 * 100) / 100;

  const tier = getRarityTier(item.rarity);
  const styles = RARITY_STYLES[tier];

  const handleClose = () => {
    setImageLoaded(false);
    setShowMarketplace(false);
    onClose();
  };

  const marketplaceItem: MarketplaceItem | null = item
    ? {
        id: item.id,
        name: item.name,
        imageUrl: item.imageLarge || item.imageSmall,
        marketPrice: item.marketPrice,
        category: mapCatalogCategory(item.category),
      }
    : null;

  return (
    <>
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />

      {/* Modal container */}
      <div
        className={`relative w-full max-w-md bg-charcoal-dark rounded-3xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up ${styles.glow}`}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-4.5 h-4.5 text-white/80" />
        </button>

        {/* ── Card Detail View ─────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Image section */}
          <div className="relative flex items-center justify-center px-6 pt-6 pb-3">
            {tier !== "common" && (
              <div
                className={`absolute inset-0 opacity-30 blur-3xl ${
                  tier === "secret"
                    ? "bg-gradient-to-br from-yellow-400/40 to-amber-500/20"
                    : tier === "ultra"
                    ? "bg-gradient-to-br from-purple-500/40 to-pink-500/20"
                    : tier === "rare"
                    ? "bg-gradient-to-br from-blue-500/40 to-cyan-500/20"
                    : "bg-gradient-to-br from-emerald-500/30 to-teal-500/10"
                }`}
              />
            )}
            {!imageLoaded && (
              <img
                src={item.imageSmall}
                alt=""
                className="absolute inset-0 w-full h-full object-contain blur-lg scale-110 opacity-40"
                aria-hidden="true"
              />
            )}
            <img
              src={item.imageLarge || item.imageSmall}
              alt={item.name}
              className={`relative max-h-[42vh] w-auto max-w-full object-contain drop-shadow-2xl transition-opacity duration-300 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImageLoaded(true)}
            />
          </div>

          {/* Details section */}
          <div className="px-5 pb-5 pt-2 space-y-3.5">
            <div>
              <h2 className="text-lg font-bold text-cream leading-snug">{item.name}</h2>
              {item.set && <p className="text-sm text-cream/40 mt-0.5">{item.set}</p>}
            </div>

            <div className="flex flex-wrap gap-2">
              {item.rarity && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${styles.chip}`}>
                  <Sparkles className={`w-3.5 h-3.5 ${styles.icon}`} />
                  <span className={`text-xs font-bold ${RARITY_TEXT[tier]}`}>{item.rarity}</span>
                </div>
              )}
              {item.series && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                  <BookOpen className="w-3.5 h-3.5 text-cream/35" />
                  <span className="text-xs text-cream/45 font-semibold">{item.series}</span>
                </div>
              )}
            </div>

            {item.marketPrice > 0 && (
              <div className="rounded-2xl bg-green-500/8 border border-green-500/20 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-[11px] text-cream/35 font-semibold uppercase tracking-wider">Market Price</span>
                </div>
                <p className="text-3xl font-bold text-green-400">{formatValue(item.marketPrice)}</p>
                {item.lastUpdated && (
                  <p className="text-[10px] text-cream/20 mt-1.5">
                    Updated {new Date(item.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
            )}

            {/* ── Tab switcher ── */}
            <div className="flex rounded-2xl bg-white/[0.04] border border-white/[0.06] p-1 gap-1">
              {(["trade", "market"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    activeTab === tab
                      ? "bg-charcoal-dark text-cream shadow-sm"
                      : "text-cream/35 hover:text-cream/55"
                  }`}
                >
                  {tab === "trade" ? (
                    <><ArrowLeftRight className="w-3.5 h-3.5" />Trade</>
                  ) : (
                    <><TrendingUp className="w-3.5 h-3.5" />Market</>
                  )}
                </button>
              ))}
            </div>

            {/* ── Trade tab ── */}
            {activeTab === "trade" && (
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
                <p className="text-[11px] text-cream/30 font-semibold uppercase tracking-wider mb-3">Collectors who want this</p>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2.5">
                    {MOCK_COLLECTORS.map((c) => (
                      <img
                        key={c.seed}
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${c.seed}&backgroundColor=b6e3f4,c0aede,ffd5dc`}
                        alt={c.name}
                        className="w-9 h-9 rounded-full border-2 border-charcoal-dark bg-charcoal-light/30"
                      />
                    ))}
                    <div className="w-9 h-9 rounded-full border-2 border-charcoal-dark bg-charcoal-light/40 flex items-center justify-center">
                      <span className="text-[10px] text-cream/40 font-bold">+12</span>
                    </div>
                  </div>
                  <p className="text-xs text-cream/25">16 collectors interested</p>
                </div>
              </div>
            )}

            {/* ── Market tab ── */}
            {activeTab === "market" && <MarketTabContent
              isFree={isFree}
              onUpgrade={() => { handleClose(); router.push("/upgrade"); }}
              priceHistory={priceHistory}
              firstPrice={firstPrice}
              lastPrice={lastPrice}
              isUp={isUp}
              chartColor={chartColor}
              monthChange={monthChange}
              monthChangePct={monthChangePct}
              allTimeHigh={allTimeHigh}
              listedMedian={listedMedian}
            />}

          </div>
        </div>

        {/* Bottom action bar */}
        <div className="flex gap-2 px-5 pb-5 pt-3 border-t border-white/[0.06] flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMarketplace(true); }}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-surface/10 text-surface-light/60 font-bold text-sm hover:bg-surface/20 active:scale-[0.97] transition-all"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Trade
          </button>
          <button
            onClick={() => {
              addNotification({
                id: Date.now().toString(),
                type: "alert",
                message: `Radar Active: Now scanning market for ${item.name.substring(0, 30)}…`,
                time: "Just now",
                isRead: false,
                href: `/search?q=${encodeURIComponent(item.name)}`,
              });
              showToast(`Radar activated for ${item.name.substring(0, 25)}…`);
              // Simulate background processing: fire a match 4 seconds later
              setTimeout(() => {
                addNotification({
                  id: Date.now().toString(),
                  type: "match",
                  message: `🌟 Perfect Match! Drew just listed the ${item.name.substring(0, 25)}… you're looking for!`,
                  time: "Just now",
                  isRead: false,
                  href: `/search?q=${encodeURIComponent(item.name)}&autoOpen=true&action=trade`,
                });
              }, 4000);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl bg-blue-500/10 text-blue-400 font-bold text-sm hover:bg-blue-500/20 active:scale-[0.97] transition-all border border-blue-500/20"
          >
            <Bell className="w-4 h-4" />
            Radar
          </button>
          <button
            onClick={onAdd}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/20 text-primary font-bold text-sm hover:bg-primary/30 active:scale-[0.97] transition-all"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>
    </div>

    {/* Marketplace overlay — rendered OUTSIDE the z-[100] stacking context */}
    <MarketplaceModal
      isOpen={showMarketplace}
      onClose={() => setShowMarketplace(false)}
      item={marketplaceItem}
    />
    </>
  );
}
