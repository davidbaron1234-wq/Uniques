"use client";

import { useState } from "react";
import { X, Plus, Sparkles, BookOpen, DollarSign, ArrowLeftRight, Check } from "lucide-react";
import { MasterItem } from "@/lib/catalog/types";
import { formatValue } from "@/lib/format";
import { useInventory } from "@/lib/InventoryContext";

interface CardDetailModalProps {
  item: MasterItem | null;
  onClose: () => void;
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

// ── Mock collector avatars ───────────────────────────────────────────────

const MOCK_COLLECTORS = [
  { name: "Alex", seed: "Alex" },
  { name: "Sam", seed: "Sam" },
  { name: "Jordan", seed: "Jordan" },
  { name: "Riley", seed: "Riley" },
];

export default function CardDetailModal({ item, onClose }: CardDetailModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const { addFromCatalog, hasItem } = useInventory();

  if (!item) return null;

  const tier = getRarityTier(item.rarity);
  const styles = RARITY_STYLES[tier];
  const owned = hasItem(item.id);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal container — always centered dialog */}
      <div
        className={`relative w-full max-w-md bg-charcoal-dark rounded-3xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up ${styles.glow}`}
      >
        {/* Close button — high z-index, always visible */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-4.5 h-4.5 text-white/80" />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Image section */}
          <div className="relative flex items-center justify-center px-6 pt-6 pb-3">
            {/* Rarity-colored ambient glow behind card */}
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

            {/* Blur placeholder from imageSmall */}
            {!imageLoaded && (
              <img
                src={item.imageSmall}
                alt=""
                className="absolute inset-0 w-full h-full object-contain blur-lg scale-110 opacity-40"
                aria-hidden="true"
              />
            )}
            <img
              src={item.imageLarge}
              alt={item.name}
              className={`relative max-h-[42vh] w-auto max-w-full object-contain drop-shadow-2xl transition-opacity duration-300 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImageLoaded(true)}
            />
          </div>

          {/* Details section */}
          <div className="px-5 pb-5 pt-2 space-y-3.5">
            {/* Name & Set */}
            <div>
              <h2 className="text-lg font-bold text-cream leading-snug">{item.name}</h2>
              {item.set && (
                <p className="text-sm text-cream/40 mt-0.5">{item.set}</p>
              )}
            </div>

            {/* Rarity & metadata chips */}
            <div className="flex flex-wrap gap-2">
              {item.rarity && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${styles.chip}`}>
                  <Sparkles className={`w-3.5 h-3.5 ${styles.icon}`} />
                  <span className={`text-xs font-bold ${RARITY_TEXT[tier]}`}>
                    {item.rarity}
                  </span>
                </div>
              )}
              {item.series && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                  <BookOpen className="w-3.5 h-3.5 text-cream/35" />
                  <span className="text-xs text-cream/45 font-semibold">{item.series}</span>
                </div>
              )}
            </div>

            {/* Market Price — large and green */}
            {item.marketPrice > 0 && (
              <div className="rounded-2xl bg-green-500/8 border border-green-500/20 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-[11px] text-cream/35 font-semibold uppercase tracking-wider">Market Price</span>
                </div>
                <p className="text-3xl font-bold text-green-400">
                  {formatValue(item.marketPrice)}
                </p>
                {item.lastUpdated && (
                  <p className="text-[10px] text-cream/20 mt-1.5">
                    Updated {new Date(item.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
            )}

            {/* Social proof — Collectors */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
              <p className="text-[11px] text-cream/30 font-semibold uppercase tracking-wider mb-3">
                Collectors who want this
              </p>
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
          </div>
        </div>

        {/* Bottom action bar */}
        <div className="flex gap-3 px-5 pb-5 pt-3 border-t border-white/[0.06] flex-shrink-0">
          <button
            onClick={onClose}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-surface/10 text-surface-light/60 font-bold text-sm hover:bg-surface/20 active:scale-[0.97] transition-all"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Trade
          </button>
          {owned ? (
            <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 font-bold text-sm">
              <Check className="w-4 h-4" />
              In Inventory
            </div>
          ) : (
            <button
              onClick={() => addFromCatalog(item)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/20 text-primary font-bold text-sm hover:bg-primary/30 active:scale-[0.97] transition-all"
            >
              <Plus className="w-4 h-4" />
              Add to Inventory
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
