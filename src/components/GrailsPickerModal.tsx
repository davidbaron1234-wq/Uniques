"use client";

import { useState, useEffect } from "react";
import { X, Crown, Check, Save } from "lucide-react";
import { CollectibleItem } from "@/lib/types";
import { formatValue } from "@/lib/format";

interface GrailsPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CollectibleItem[];
  pinnedIds: string[];
  onSave: (pinnedIds: string[]) => void;
  userTier?: "free" | "pro";
}

export default function GrailsPickerModal({
  isOpen,
  onClose,
  items,
  pinnedIds,
  onSave,
  userTier = "free",
}: GrailsPickerModalProps) {
  const [selected, setSelected] = useState<string[]>(pinnedIds);

  const maxGrails = 3;

  // Re-sync selected state when modal opens with (potentially new) pinnedIds
  useEffect(() => {
    if (isOpen) {
      setSelected(pinnedIds);
    }
  }, [isOpen, pinnedIds]);

  if (!isOpen) return null;

  const toggleItem = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxGrails) return prev;
      return [...prev, id];
    });
  };

  const handleSave = () => {
    onSave(selected);
    onClose();
  };

  const handleClear = () => {
    setSelected([]);
  };

  // Split into selected and unselected, each sorted by value
  const selectedItems = selected
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is CollectibleItem => !!i);

  const unselectedItems = items
    .filter((i) => !selected.includes(i.id))
    .sort((a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0));

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 animate-fade-in" onClick={onClose} />

      <div className="relative w-full max-w-md mx-4 mb-0 sm:mb-0 bg-charcoal-dark rounded-t-3xl sm:rounded-3xl shadow-soft-xl animate-slide-up overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-charcoal-light/20 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-cream flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              Pick Your Grails
            </h2>
            <p className="text-[10px] text-cream/30 mt-0.5">
              Select up to 3 items to showcase — {selected.length}/3 chosen
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-charcoal-light/50 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-cream/60" />
          </button>
        </div>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto scrollbar-none p-4 space-y-2">
          {/* Selected section */}
          {selectedItems.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-1 pb-1">
                <Crown className="w-3 h-3 text-yellow-400" />
                <span className="text-[10px] text-yellow-400/70 font-bold uppercase tracking-wider">
                  Selected ({selectedItems.length}/{maxGrails})
                </span>
              </div>
              {selectedItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  isPinned
                  isDisabled={false}
                  rank={selected.indexOf(item.id) + 1}
                  onToggle={() => toggleItem(item.id)}
                />
              ))}
            </>
          )}

          {/* Divider between sections */}
          {selectedItems.length > 0 && unselectedItems.length > 0 && (
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-charcoal-light/20" />
              <span className="text-[10px] text-cream/20 font-medium">Your Vault</span>
              <div className="flex-1 h-px bg-charcoal-light/20" />
            </div>
          )}

          {/* Unselected section */}

          {unselectedItems.map((item) => {
            const isDisabled = selected.length >= maxGrails;
            return (
              <ItemRow
                key={item.id}
                item={item}
                isPinned={false}
                isDisabled={isDisabled}
                rank={0}
                onToggle={() => !isDisabled && toggleItem(item.id)}
              />
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-5 pt-3 border-t border-charcoal-light/20 flex-shrink-0">
          <button
            onClick={handleClear}
            className="px-4 py-3 rounded-2xl bg-background-light text-cream/40 font-bold text-sm hover:bg-charcoal-light/50 active:scale-[0.97] transition-all"
          >
            Clear
          </button>
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/20 text-primary font-bold text-sm hover:bg-primary/30 active:scale-[0.97] transition-all"
          >
            <Save className="w-4 h-4" />
            Save Grails
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemRow({
  item,
  isPinned,
  isDisabled,
  rank,
  onToggle,
}: {
  item: CollectibleItem;
  isPinned: boolean;
  isDisabled: boolean;
  rank: number;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all text-left ${
        isPinned
          ? "bg-yellow-400/10 ring-1 ring-yellow-400/30"
          : isDisabled
          ? "bg-background-light/50 opacity-40 cursor-not-allowed"
          : "bg-background-light hover:bg-charcoal-light/40"
      }`}
    >
      {/* Selection indicator */}
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
          isPinned
            ? "bg-yellow-400/90"
            : "bg-charcoal-light/30"
        }`}
      >
        {isPinned ? (
          <Check className="w-4 h-4 text-charcoal-dark" strokeWidth={3} />
        ) : (
          <Crown className="w-3.5 h-3.5 text-cream/20" />
        )}
      </div>

      {/* Thumbnail */}
      <div className="w-11 h-11 rounded-xl overflow-hidden bg-charcoal-light/20 flex-shrink-0">
        <img
          src={item.customImage || item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-cream/90 font-medium truncate">
          {item.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-cream/30">
            {item.category}
          </span>
          {item.estimatedValue && (
            <span className="text-[10px] text-primary font-semibold">
              {formatValue(item.estimatedValue)}
            </span>
          )}
        </div>
      </div>

      {/* Rank badge if pinned */}
      {isPinned && (
        <div className="w-6 h-6 rounded-full bg-yellow-400/90 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-extrabold text-charcoal-dark">
            {rank}
          </span>
        </div>
      )}
    </button>
  );
}
