"use client";

/**
 * MarketTicker — Phase 22 (Market Ticker UI Polish & Real Data Integration)
 *
 * Fix: the CSS maskImage on the parent was clipping the "LIVE" badge too,
 * causing scrolling text to bleed through it. Replaced with a solid left-cover
 * overlay div (same bg colour as the bar) that sits above the scrolling strip,
 * plus explicit gradient-fade divs on each edge.
 *
 * Data: /api/market/ticker now compares real catalog snapshot prices
 * (type="catalog" via MarketItem) between the last 24 h and the prior 6 days.
 */

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface TickerItem {
  label:     string;
  pct:       number;
  direction: "up" | "down";
  value:     number;
  itemCount: number;
}

export default function MarketTicker() {
  const [items, setItems]     = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/market/ticker")
      .then((r) => r.ok ? r.json() : null)
      .then((data: { items: TickerItem[] } | null) => {
        if (data?.items?.length) setItems(data.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="relative h-8 overflow-hidden border-y border-white/[0.04] bg-[#141212]">
        <div className="h-full flex items-center gap-6 pl-24 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 flex-shrink-0">
              <div className="w-20 h-2.5 bg-white/[0.06] rounded-full" />
              <div className="w-12 h-2.5 bg-white/[0.04] rounded-full" />
            </div>
          ))}
        </div>
        {/* LIVE badge overlay even during skeleton */}
        <div className="absolute left-0 top-0 h-full w-24 bg-[#141212] z-10 flex items-center pl-3 gap-1.5 pointer-events-none">
          <Activity className="w-2.5 h-2.5 text-[#CAE6CE]/60 flex-shrink-0" />
          <span className="text-[9px] font-bold tracking-widest uppercase text-cream/20 select-none">LIVE</span>
          <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse ml-0.5 flex-shrink-0" />
          {/* Fade transition from solid to transparent on the right edge of this cover */}
          <div className="absolute right-0 top-0 h-full w-6 bg-gradient-to-r from-[#141212] to-transparent" />
        </div>
      </div>
    );
  }

  if (!items.length) return null;

  // Double the items so the CSS loop is seamless
  const doubled = [...items, ...items];

  return (
    <div className="relative h-8 overflow-hidden border-y border-white/[0.04] bg-[#141212]">

      {/* ── Scrolling strip ─────────────────────────────────────────────────── */}
      {/* pl-24 keeps content clear of the LIVE badge; the badge cover clips the rest */}
      <div
        className="flex items-center h-full pl-24 whitespace-nowrap animate-ticker-scroll hover:[animation-play-state:paused]"
      >
        {doubled.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 mr-8 flex-shrink-0 select-none">
            {i > 0 && (
              <span className="text-cream/[0.12] text-xs mr-5 -ml-1 font-bold">·</span>
            )}
            <span className="text-[11px] font-semibold text-cream/60 tracking-wide">
              {item.label}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${
                item.direction === "up" ? "text-green-400" : "text-red-400"
              }`}
            >
              {item.direction === "up"
                ? <TrendingUp  className="w-2.5 h-2.5" />
                : <TrendingDown className="w-2.5 h-2.5" />
              }
              {item.direction === "up" ? "+" : "-"}{item.pct.toFixed(1)}%
            </span>
          </span>
        ))}
      </div>

      {/* ── Left solid cover — LIVE badge sits on top of scrolling text ──────── */}
      {/*    Same bg as the bar so text slides invisibly underneath.             */}
      <div className="absolute left-0 top-0 h-full w-24 bg-[#141212] z-10 flex items-center pl-3 gap-1.5 pointer-events-none">
        <Activity className="w-2.5 h-2.5 text-[#CAE6CE]/60 flex-shrink-0" />
        <span className="text-[9px] font-bold tracking-widest uppercase text-cream/20 select-none">LIVE</span>
        <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse ml-0.5 flex-shrink-0" />
        {/* Soft gradient fade from solid to transparent — bridges cover to content */}
        <div className="absolute right-0 top-0 h-full w-6 bg-gradient-to-r from-[#141212] to-transparent" />
      </div>

      {/* ── Right fade overlay ────────────────────────────────────────────────── */}
      <div className="absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-[#141212] to-transparent z-10 pointer-events-none" />

      {/* Keyframes */}
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker-scroll {
          animation: ticker-scroll 40s linear infinite;
        }
      `}</style>
    </div>
  );
}
