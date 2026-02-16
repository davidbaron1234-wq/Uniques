"use client";

import { useRef } from "react";
import { DollarSign, FileText, Shield, Tag, Camera, ImagePlus, Trash2 } from "lucide-react";
import { ItemCondition, ItemStatus } from "@/lib/types";

export interface ItemConfig {
  askingPrice: number | undefined;
  condition: ItemCondition;
  status: ItemStatus;
  notes: string;
  customImage?: string;
}

interface ItemConfigFormProps {
  config: ItemConfig;
  onChange: (config: ItemConfig) => void;
}

const CONDITIONS: { value: ItemCondition; label: string }[] = [
  { value: "Mint", label: "Mint" },
  { value: "Near Mint", label: "Near Mint" },
  { value: "Excellent", label: "Excellent" },
  { value: "Played", label: "Played" },
  { value: "Damaged", label: "Damaged" },
];

const STATUSES: { value: ItemStatus; label: string; desc: string }[] = [
  { value: "Showcase", label: "Showcase", desc: "Not available" },
  { value: "For Trade", label: "For Trade", desc: "Open to offers" },
  { value: "For Sale", label: "For Sale", desc: "Accepting cash" },
];

export default function ItemConfigForm({ config, onChange }: ItemConfigFormProps) {
  const update = (partial: Partial<ItemConfig>) => onChange({ ...config, ...partial });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => update({ customImage: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  return (
    <div className="space-y-4">
      {/* Custom Photo Upload */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-cream/50 mb-2 uppercase tracking-wider">
          <Camera className="w-3.5 h-3.5" />
          Custom Photo
          <span className="text-[10px] text-cream/20 font-normal normal-case ml-1">optional</span>
        </label>

        {config.customImage ? (
          <div className="relative w-full rounded-2xl overflow-hidden bg-background-light">
            <div className="aspect-[4/3] overflow-hidden">
              <img src={config.customImage} alt="Custom upload" className="w-full h-full object-contain bg-charcoal-dark" />
            </div>
            <div className="absolute top-2 right-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 rounded-xl bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                aria-label="Replace photo"
              >
                <Camera className="w-4 h-4 text-white/80" />
              </button>
              <button
                type="button"
                onClick={() => update({ customImage: undefined })}
                className="w-8 h-8 rounded-xl bg-red-500/70 hover:bg-red-500/90 flex items-center justify-center transition-colors"
                aria-label="Remove photo"
              >
                <Trash2 className="w-4 h-4 text-white/80" />
              </button>
            </div>
          </div>
        ) : (
          <div
            className="relative w-full rounded-2xl border-2 border-dashed border-white/[0.08] hover:border-surface/40 bg-background-light/50 hover:bg-background-light transition-all cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={handleDrop}
          >
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-10 h-10 rounded-xl bg-charcoal-light/30 flex items-center justify-center flex-shrink-0">
                <ImagePlus className="w-5 h-5 text-cream/30" />
              </div>
              <div>
                <p className="text-xs text-cream/50 font-medium">Tap to upload or drag & drop</p>
                <p className="text-[10px] text-cream/25 mt-0.5">PNG, JPG up to 5 MB — overrides catalog image</p>
              </div>
            </div>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
      </div>

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
