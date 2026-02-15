"use client";

import { useState } from "react";
import { X, Plus, Sparkles, Layers, BookOpen, DollarSign } from "lucide-react";
import { MasterItem } from "@/lib/catalog/types";
import { formatValue } from "@/lib/format";

interface CardDetailModalProps {
  item: MasterItem | null;
  onClose: () => void;
  onAddToInventory?: (item: MasterItem) => void;
}

export default function CardDetailModal({ item, onClose, onAddToInventory }: CardDetailModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/80 animate-fade-in" onClick={onClose} />

      <div className="relative w-full max-w-lg mx-4 mb-0 sm:mb-0 bg-charcoal-dark rounded-t-3xl sm:rounded-3xl shadow-soft-xl animate-slide-up overflow-hidden max-h-[92vh] flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-black/40 hover:bg-black/60 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-cream/70" />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Image section */}
          <div className="relative bg-gradient-to-b from-charcoal-light/20 to-transparent flex items-center justify-center px-8 pt-8 pb-4">
            {/* Blur placeholder from imageSmall */}
            {!imageLoaded && (
              <img
                src={item.imageSmall}
                alt=""
                className="absolute inset-0 w-full h-full object-contain blur-md scale-105 opacity-50"
                aria-hidden="true"
              />
            )}
            <img
              src={item.imageLarge}
              alt={item.name}
              className={`relative max-h-[45vh] w-auto max-w-full object-contain rounded-xl transition-opacity duration-300 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImageLoaded(true)}
            />
          </div>

          {/* Details section */}
          <div className="px-6 pb-6 pt-2 space-y-4">
            {/* Name */}
            <div>
              <h2 className="text-xl font-bold text-cream leading-tight">{item.name}</h2>
              {item.set && (
                <p className="text-sm text-surface-light/60 mt-1">{item.set}</p>
              )}
            </div>

            {/* Info chips */}
            <div className="flex flex-wrap gap-2">
              {item.rarity && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-400/10 border border-yellow-400/20">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-xs text-yellow-400 font-semibold">{item.rarity}</span>
                </div>
              )}
              {item.series && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface/10 border border-surface/20">
                  <BookOpen className="w-3.5 h-3.5 text-surface-light/60" />
                  <span className="text-xs text-surface-light/60 font-semibold">{item.series}</span>
                </div>
              )}
              {item.category && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cream/5 border border-cream/10">
                  <Layers className="w-3.5 h-3.5 text-cream/40" />
                  <span className="text-xs text-cream/40 font-semibold">{item.category}</span>
                </div>
              )}
            </div>

            {/* Market Price */}
            {item.marketPrice > 0 && (
              <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="text-xs text-cream/40 font-semibold">Market Price</span>
                </div>
                <p className="text-2xl font-extrabold text-primary">
                  {formatValue(item.marketPrice)}
                </p>
                {item.lastUpdated && (
                  <p className="text-[10px] text-cream/20 mt-1">
                    Last updated: {new Date(item.lastUpdated).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom action bar */}
        <div className="flex gap-3 px-6 pb-6 pt-3 border-t border-charcoal-light/20 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-2xl bg-background-light text-cream/40 font-bold text-sm hover:bg-charcoal-light/50 active:scale-[0.97] transition-all"
          >
            Close
          </button>
          <button
            onClick={() => onAddToInventory?.(item)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/20 text-primary font-bold text-sm hover:bg-primary/30 active:scale-[0.97] transition-all"
          >
            <Plus className="w-4 h-4" />
            Add to Inventory
          </button>
        </div>
      </div>
    </div>
  );
}
