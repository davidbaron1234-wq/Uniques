"use client";

import { useState, useRef, useMemo } from "react";
import { X, Plus, ImagePlus, ChevronDown, Search, Sparkles } from "lucide-react";
import { Category } from "@/lib/types";
import { categories } from "@/lib/data";
import { searchCollectibles, DatabaseCollectible } from "@/services/mockDatabase";
import { formatValue } from "@/lib/format";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: {
    name: string;
    category: Category;
    upForTrade: boolean;
    imagePreview: string | null;
    estimatedValue?: number;
  }) => void;
}

export default function AddItemModal({ isOpen, onClose, onAdd }: AddItemModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [upForTrade, setUpForTrade] = useState<boolean | "">("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [estimatedValue, setEstimatedValue] = useState<number | undefined>();
  const [dragOver, setDragOver] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => searchCollectibles(name), [name]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSelectSuggestion = (item: DatabaseCollectible) => {
    setName(item.name);
    setCategory(item.category);
    setEstimatedValue(item.estimatedValue);
    setImagePreview(item.imageUrl);
    setShowSuggestions(false);
  };

  const handleSubmit = () => {
    if (!name.trim() || !category) return;
    onAdd({
      name: name.trim(),
      category: category as Category,
      upForTrade: upForTrade === true,
      imagePreview,
      estimatedValue,
    });
    setName("");
    setCategory("");
    setUpForTrade("");
    setImagePreview(null);
    setEstimatedValue(undefined);
    onClose();
  };

  const isValid = name.trim() && category;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 animate-fade-in" onClick={onClose} />

      <div className="relative w-full max-w-md mx-4 mb-0 sm:mb-0 bg-charcoal-dark rounded-t-3xl sm:rounded-3xl shadow-soft-xl animate-slide-up overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-charcoal-light/20">
          <h2 className="text-lg font-bold text-cream">Add New Item</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-charcoal-light/50 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-cream/60" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Smart Search */}
          <div className="relative">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-cream/70 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-surface-light" />
              Smart Search
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cream/30" />
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Type to search collectibles..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-background-light text-cream placeholder:text-cream/25 focus:outline-none focus:ring-2 focus:ring-surface/30 transition-all"
              />
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-20 w-full mt-1.5 rounded-2xl bg-charcoal-dark border border-charcoal-light/20 shadow-soft-xl overflow-hidden">
                {suggestions.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-background-light transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-charcoal-light/30 flex-shrink-0">
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-cream/90 font-medium truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-surface-light/60">{item.category}</span>
                        <span className="text-[10px] text-primary font-semibold">{formatValue(item.estimatedValue)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Image upload */}
          <div
            className={`relative w-full aspect-[4/3] rounded-2xl transition-colors flex flex-col items-center justify-center cursor-pointer overflow-hidden ${
              dragOver
                ? "ring-2 ring-primary bg-primary/10"
                : imagePreview
                ? ""
                : "bg-background-light hover:bg-charcoal-light/30"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-2xl">
                  <p className="text-cream text-sm font-medium">Change image</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-charcoal-light/30 flex items-center justify-center mb-3">
                  <ImagePlus className="w-7 h-7 text-cream/30" />
                </div>
                <p className="text-sm text-cream/40 font-medium">Tap to add photo</p>
                <p className="text-xs text-cream/20 mt-1">or drag and drop</p>
              </>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-cream/70 mb-2">Category</label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-4 py-3 rounded-2xl bg-background-light text-cream appearance-none focus:outline-none focus:ring-2 focus:ring-surface/30 transition-all"
              >
                <option value="" disabled>Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-charcoal-dark text-cream">{cat}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cream/30 pointer-events-none" />
            </div>
          </div>

          {/* Trade toggle */}
          <div>
            <label className="block text-sm font-semibold text-cream/70 mb-2">Up For Trade?</label>
            <div className="relative">
              <select
                value={upForTrade === "" ? "" : upForTrade ? "yes" : "no"}
                onChange={(e) => setUpForTrade(e.target.value === "yes")}
                className="w-full px-4 py-3 rounded-2xl bg-background-light text-cream appearance-none focus:outline-none focus:ring-2 focus:ring-surface/30 transition-all"
              >
                <option value="" disabled>Choose one</option>
                <option value="yes" className="bg-charcoal-dark text-cream">Yes - Available for trade</option>
                <option value="no" className="bg-charcoal-dark text-cream">No - Not for trade</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cream/30 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-5 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-background-light text-cream/60 font-bold text-sm hover:bg-charcoal-light/50 active:scale-[0.97] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm active:scale-[0.97] transition-all ${
              isValid
                ? "bg-primary/20 text-primary hover:bg-primary/30"
                : "bg-background-light text-cream/20 cursor-not-allowed"
            }`}
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
