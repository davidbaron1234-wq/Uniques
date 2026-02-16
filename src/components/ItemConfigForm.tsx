"use client";

import { DollarSign, FileText, Shield, Tag } from "lucide-react";
import { ItemCondition, ItemStatus } from "@/lib/types";

export interface ItemConfig {
  askingPrice: number | undefined;
  condition: ItemCondition;
  status: ItemStatus;
  notes: string;
}

interface ItemConfigFormProps {
  config: ItemConfig;
  onChange: (config: ItemConfig) => void;
}

const CONDITIONS: { value: ItemCondition; label: string; desc: string }[] = [
  { value: "Mint", label: "Mint", desc: "Perfect, factory fresh" },
  { value: "Near Mint", label: "Near Mint", desc: "Minor surface wear" },
  { value: "Excellent", label: "Excellent", desc: "Light signs of use" },
  { value: "Played", label: "Played", desc: "Visible wear and tear" },
  { value: "Damaged", label: "Damaged", desc: "Significant damage" },
];

const STATUSES: { value: ItemStatus; label: string; desc: string }[] = [
  { value: "Showcase", label: "Showcase", desc: "Not available" },
  { value: "For Trade", label: "For Trade", desc: "Open to offers" },
  { value: "For Sale", label: "For Sale", desc: "Accepting cash" },
];

export default function ItemConfigForm({ config, onChange }: ItemConfigFormProps) {
  const update = (partial: Partial<ItemConfig>) => onChange({ ...config, ...partial });

  return (
    <div className="space-y-4">
      {/* Asking Price */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-cream/50 mb-2 uppercase tracking-wider">
          <DollarSign className="w-3.5 h-3.5" />
          Asking Price
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cream/30 text-sm font-semibold">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={config.askingPrice ?? ""}
            onChange={(e) => update({ askingPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
            placeholder="0.00"
            className="w-full pl-8 pr-4 py-3 rounded-2xl bg-background-light text-cream placeholder:text-cream/25 focus:outline-none focus:ring-2 focus:ring-surface/30 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>

      {/* Condition */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-cream/50 mb-2 uppercase tracking-wider">
          <Shield className="w-3.5 h-3.5" />
          Condition
        </label>
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => update({ condition: c.value })}
              className={`py-2 px-3.5 rounded-xl border text-center transition-all ${
                config.condition === c.value
                  ? "bg-surface/20 border-surface/40 text-surface-light"
                  : "bg-background-light border-transparent text-cream/35 hover:text-cream/60"
              }`}
            >
              <span className="text-xs font-bold">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-cream/50 mb-2 uppercase tracking-wider">
          <Tag className="w-3.5 h-3.5" />
          Status
        </label>
        <div className="grid grid-cols-3 gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => update({ status: s.value })}
              className={`py-2.5 px-2 rounded-xl border text-center transition-all ${
                config.status === s.value
                  ? "bg-surface/20 border-surface/40 text-surface-light"
                  : "bg-background-light border-transparent text-cream/35 hover:text-cream/60"
              }`}
            >
              <span className="text-xs font-bold block">{s.label}</span>
              <span className="text-[9px] opacity-60 block mt-0.5">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-cream/50 mb-2 uppercase tracking-wider">
          <FileText className="w-3.5 h-3.5" />
          Notes
          <span className="text-[10px] text-cream/20 font-normal normal-case ml-1">optional</span>
        </label>
        <textarea
          value={config.notes}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Any details about the item..."
          rows={2}
          className="w-full px-4 py-3 rounded-2xl bg-background-light text-cream text-sm placeholder:text-cream/25 focus:outline-none focus:ring-2 focus:ring-surface/30 transition-all resize-none"
        />
      </div>
    </div>
  );
}
