"use client";

import { formatValue } from "@/lib/format";

interface EquityBarProps {
  offered: number;
  asking: number;
}

/**
 * Gradient slider showing trade fairness.
 *   Red (left)  = short on value
 *   Green (mid) = fair trade (±5 %)
 *   Amber (right) = overpaying
 */
export default function EquityBar({ offered, asking }: EquityBarProps) {
  if (asking <= 0) return null;

  const diff      = offered - asking;
  const pct       = diff / asking;                        // negative = short, positive = over
  const clamped   = Math.max(-0.6, Math.min(0.6, pct));
  const markerPos = ((clamped + 0.6) / 1.2) * 100;       // maps [-0.6, +0.6] → [0, 100] %

  const isFair   = Math.abs(pct) <= 0.05;
  const isOver   = !isFair && diff > 0;
  const label    = isFair ? "Fair Trade"
    : isOver ? `+${formatValue(Math.abs(diff))} over`
    :          `-${formatValue(Math.abs(diff))} short`;
  const labelCls = isFair ? "text-green-400" : isOver ? "text-amber-400" : "text-red-400";

  return (
    <div className="px-3 py-2.5 rounded-2xl bg-surface/10 border border-surface/20 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-cream/30 font-bold uppercase tracking-wider">Trade Equity</span>
        <span className={`text-[10px] font-bold ${labelCls}`}>{label}</span>
      </div>

      {/* Gradient track */}
      <div
        className="relative h-2 rounded-full"
        style={{ background: "linear-gradient(to right, #ef4444 0%, #22c55e 50%, #f59e0b 100%)" }}
      >
        {/* Moving marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow-lg border-2 border-charcoal-dark transition-[left] duration-300"
          style={{ left: `${markerPos}%` }}
        />
      </div>

      {/* Axis labels */}
      <div className="flex justify-between text-[9px] font-semibold">
        <span className="text-red-400/50">Short</span>
        <span className="text-green-400/50">Fair</span>
        <span className="text-amber-400/50">Over</span>
      </div>
    </div>
  );
}
