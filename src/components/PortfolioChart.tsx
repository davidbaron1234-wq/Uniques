"use client";

/**
 * PortfolioChart — Phase 6.1 Authoritative Portfolio Graph
 *
 * Reads from /api/market/snapshots?type=user&refId=userId to render a
 * sleek Robinhood/crypto-style AreaChart.
 *
 * Official value: fetched from /api/market/official-value?userId=xxx.
 *   This reflects catalog market prices, NOT user asking prices.
 *   Shown as the headline number; the graph history also ends at this value.
 *
 * Cold-Start Logic (Day Zero):
 *   If the DB has < 2 user portfolio snapshots, generate a synthetic 7-day
 *   trailing series ending EXACTLY at the official portfolio value.
 *   The series uses a deterministic LCG seeded by userId so it's stable
 *   across page loads. An "est." label signals synthetic data.
 *
 * Color:
 *   Neon green (#22c55e) = trending up relative to the series start.
 *   Red (#ef4444) = trending down.
 */

import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { formatValue } from "@/lib/format";

interface SnapshotPoint {
  date:  string;
  value: number;
}

interface PortfolioChartProps {
  userId:          string;
  askingPriceSum:  number; // fallback displayed while official value loads
  className?:      string;
}

// ── Custom tooltip ──────────────────────────────────────────────────────────
function ChartTooltip({
  active, payload, label,
}: {
  active?:  boolean;
  payload?: Array<{ value: number }>;
  label?:   string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1818]/95 border border-white/[0.08] rounded-xl px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="text-[10px] text-cream/35 font-medium mb-0.5">{label}</p>
      <p className="text-sm font-bold text-cream">{formatValue(payload[0].value)}</p>
    </div>
  );
}

// ── Synthetic cold-start series ─────────────────────────────────────────────
function generateColdStartSeries(endValue: number, userId: string): SnapshotPoint[] {
  const DAYS = 7;
  let seed = userId.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) | 0;
    return (seed >>> 0) / 0xffffffff;
  };

  const startMultiplier = 0.88 + rand() * 0.08;
  let v = endValue > 0 ? endValue * startMultiplier : 100;
  const now = new Date();
  const points: SnapshotPoint[] = [];

  for (let i = 0; i < DAYS; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (DAYS - 1 - i));
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (i === DAYS - 1) {
      points.push({ date: label, value: Math.round(endValue * 100) / 100 });
    } else {
      const drift = 1 + 0.005 + rand() * 0.012;
      const noise = 1 + (rand() - 0.45) * 0.04;
      v = Math.max(v * drift * noise, 1);
      points.push({ date: label, value: Math.round(v * 100) / 100 });
    }
  }
  return points;
}

// ── Main component ───────────────────────────────────────────────────────────
export default function PortfolioChart({ userId, askingPriceSum, className = "" }: PortfolioChartProps) {
  const [data, setData]               = useState<SnapshotPoint[]>([]);
  const [officialValue, setOfficial]  = useState<number | null>(null);
  const [loading, setLoading]         = useState(true);
  const [isSynthetic, setIsSynthetic] = useState(false);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      // Parallel-fetch official value + snapshot history
      const [officialRes, snapshotRes] = await Promise.allSettled([
        fetch(`/api/market/official-value?userId=${encodeURIComponent(userId)}`),
        fetch(`/api/market/snapshots?type=user&refId=${encodeURIComponent(userId)}&days=90`),
      ]);

      if (cancelled) return;

      // Official live value
      let liveValue = askingPriceSum;
      if (officialRes.status === "fulfilled" && officialRes.value.ok) {
        const d = await officialRes.value.json() as { total: number };
        if (d.total != null) liveValue = d.total;
      }
      setOfficial(liveValue);

      // Snapshot history
      let raw: Array<{ bucket: string; value: number }> = [];
      if (snapshotRes.status === "fulfilled" && snapshotRes.value.ok) {
        const d = await snapshotRes.value.json() as { snapshots: Array<{ bucket: string; value: number }> };
        raw = d.snapshots ?? [];
      }

      if (raw.length >= 2) {
        const dayMap = new Map<string, number>();
        for (const s of raw) {
          const key = new Date(s.bucket).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          dayMap.set(key, s.value);
        }
        const points: SnapshotPoint[] = Array.from(dayMap.entries()).map(([date, value]) => ({ date, value }));
        // Pin last point to official value so graph is never stale
        points[points.length - 1] = {
          date:  new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          value: liveValue,
        };
        setData(points);
        setIsSynthetic(false);
      } else {
        setData(generateColdStartSeries(liveValue, userId));
        setIsSynthetic(true);
      }

      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId, askingPriceSum]);

  const displayValue = officialValue ?? askingPriceSum;

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-[120px] ${className}`}>
        <Loader2 className="w-4 h-4 text-cream/20 animate-spin" />
      </div>
    );
  }

  if (data.length === 0) return null;

  const firstVal   = data[0]?.value ?? 0;
  const lastVal    = data[data.length - 1]?.value ?? 0;
  const isUp       = lastVal >= firstVal;
  const chartColor = isUp ? "#22c55e" : "#ef4444";
  const pctChange  = firstVal > 0 ? ((lastVal - firstVal) / firstVal) * 100 : 0;
  const absChange  = lastVal - firstVal;

  return (
    <div className={className}>
      {/* Official value headline */}
      <div className="flex items-baseline gap-3 mb-1.5 px-0.5">
        <p className="text-2xl font-extrabold text-primary">{formatValue(displayValue)}</p>
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold ${
          isUp ? "bg-green-500/12 text-green-400" : "bg-red-500/12 text-red-400"
        }`}>
          {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isUp ? "+" : ""}{formatValue(Math.abs(absChange))}
          &nbsp;({isUp ? "+" : ""}{pctChange.toFixed(1)}%)
        </div>
        {isSynthetic && (
          <span className="text-[9px] text-cream/20 font-medium italic">est.</span>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={88}>
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`portfolioGrad-${isUp ? "up" : "dn"}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={chartColor} stopOpacity={0.28} />
              <stop offset="95%" stopColor={chartColor} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: "rgba(252,249,213,0.2)", fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis domain={["auto", "auto"]} hide />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }}
          />
          <ReferenceLine y={firstVal} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="value"
            stroke={chartColor}
            strokeWidth={2}
            fill={`url(#portfolioGrad-${isUp ? "up" : "dn"})`}
            dot={false}
            activeDot={{ r: 4, fill: chartColor, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
