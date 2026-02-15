"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Plus, ImagePlus, Camera, ChevronDown, Search, Sparkles, Database, Loader2, Trash2, DollarSign } from "lucide-react";
import { Category } from "@/lib/types";
import { categories } from "@/lib/data";
import { formatValue } from "@/lib/format";
import { MasterItem } from "@/lib/catalog/types";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: {
    name: string;
    category: Category;
    upForTrade: boolean;
    imagePreview: string | null;
    customImage?: string;
    estimatedValue?: number;
    masterId?: string;
  }) => void;
}

export default function AddItemModal({ isOpen, onClose, onAdd }: AddItemModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [upForTrade, setUpForTrade] = useState<boolean | "">("");
  const [catalogImage, setCatalogImage] = useState<string | null>(null);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [estimatedValue, setEstimatedValue] = useState<number | undefined>();
  const [masterId, setMasterId] = useState<string | undefined>();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MasterItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch catalog count on mount
  useEffect(() => {
    if (isOpen && catalogTotal === 0) {
      fetch("/api/catalog/search?pageSize=1")
        .then((r) => r.json())
        .then((data) => setCatalogTotal(data.total || 0))
        .catch(() => {});
    }
  }, [isOpen, catalogTotal]);

  // Debounced search against the server-side catalog API
  const searchCatalog = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query || query.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/catalog/search?q=${encodeURIComponent(query)}&pageSize=8`
        );
        const data = await res.json();
        setSuggestions(data.items || []);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);
  }, []);

  if (!isOpen) return null;

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    // Cap at 5 MB to keep localStorage viable
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setCustomImage(reader.result as string);
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

  const handleSelectSuggestion = (item: MasterItem) => {
    setName(item.name);
    setMasterId(item.id);
    setEstimatedValue(item.marketPrice);
    setCatalogImage(item.imageLarge || item.imageSmall);
    setShowSuggestions(false);

    // Map catalog categories to app categories
    if (item.category === "Trading Cards") setCategory("Trading Cards");
    else if (item.category === "Sneakers") setCategory("Shoes");
    else if (item.category === "Coins") setCategory("Coins");
  };

  const handleSubmit = () => {
    if (!name.trim() || !category) return;
    onAdd({
      name: name.trim(),
      category: category as Category,
      upForTrade: upForTrade === true,
      imagePreview: catalogImage,
      customImage: customImage || undefined,
      estimatedValue,
      masterId,
    });
    // Reset form
    setName("");
    setCategory("");
    setUpForTrade("");
    setCatalogImage(null);
    setCustomImage(null);
    setEstimatedValue(undefined);
    setMasterId(undefined);
    setSuggestions([]);
    onClose();
  };

  const isValid = name.trim() && category;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 animate-fade-in" onClick={onClose} />

      <div className="relative w-full max-w-md mx-4 mb-0 sm:mb-0 bg-charcoal-dark rounded-t-3xl sm:rounded-3xl shadow-soft-xl animate-slide-up overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-charcoal-light/20">
          <div>
            <h2 className="text-lg font-bold text-cream">Add New Item</h2>
            {catalogTotal > 0 && (
              <p className="text-[10px] text-surface-light/50 flex items-center gap-1 mt-0.5">
                <Database className="w-3 h-3" />
                {catalogTotal.toLocaleString()} items in Master Catalog
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-charcoal-light/50 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-cream/60" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* ── Smart Search against Master Catalog ─────────────── */}
          <div className="relative">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-cream/70 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-surface-light" />
              Search Master Catalog
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cream/30" />
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setMasterId(undefined);
                  setShowSuggestions(true);
                  searchCatalog(e.target.value);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search cards, sneakers, coins..."
                className="w-full pl-10 pr-10 py-3 rounded-2xl bg-background-light text-cream placeholder:text-cream/25 focus:outline-none focus:ring-2 focus:ring-surface/30 transition-all"
              />
              {isSearching && (
                <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-light/50 animate-spin" />
              )}
            </div>

            {/* Linked badge */}
            {masterId && (
              <div className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 w-fit">
                <Database className="w-3 h-3 text-primary" />
                <span className="text-[10px] text-primary font-semibold">
                  Linked to Master Catalog
                </span>
                <span className="text-[9px] text-primary/50 font-mono">{masterId}</span>
              </div>
            )}

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-20 w-full mt-1.5 rounded-2xl bg-charcoal-dark border border-charcoal-light/20 shadow-soft-xl overflow-hidden max-h-72 overflow-y-auto">
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-background-light transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-charcoal-light/30 flex-shrink-0">
                      <img src={item.imageSmall} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-cream/90 font-medium truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.set && (
                          <span className="text-[10px] text-cream/30">{item.set}</span>
                        )}
                        {item.rarity && (
                          <span className="text-[10px] text-surface-light/60">{item.rarity}</span>
                        )}
                        <span className="text-[10px] text-primary font-semibold">
                          {formatValue(item.marketPrice)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Custom Photo Upload ────────────────────────────── */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-cream/70 mb-2">
              <Camera className="w-3.5 h-3.5 text-surface-light" />
              Upload Your Photo
              <span className="text-[10px] text-cream/30 font-normal ml-1">optional</span>
            </label>

            {customImage ? (
              <div className="relative w-full rounded-2xl overflow-hidden bg-background-light">
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={customImage} alt="Custom upload" className="w-full h-full object-contain bg-charcoal-dark" />
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
                    onClick={() => setCustomImage(null)}
                    className="w-8 h-8 rounded-xl bg-red-500/70 hover:bg-red-500/90 flex items-center justify-center transition-colors"
                    aria-label="Remove photo"
                  >
                    <Trash2 className="w-4 h-4 text-white/80" />
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/60">
                  <span className="text-[10px] text-green-300 font-semibold">Custom photo attached</span>
                </div>
              </div>
            ) : (
              <div
                className="relative w-full rounded-2xl border-2 border-dashed border-charcoal-light/30 hover:border-surface/40 bg-background-light/50 hover:bg-background-light transition-all cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={handleDrop}
              >
                <div className="flex items-center gap-3 px-4 py-4">
                  <div className="w-11 h-11 rounded-xl bg-charcoal-light/30 flex items-center justify-center flex-shrink-0">
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

          {/* ── Image Preview (catalog fallback) ───────────────── */}
          {catalogImage && !customImage && (
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-charcoal-dark">
              <img src={catalogImage} alt="Catalog preview" className="w-full h-full object-contain" />
              <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/60 flex items-center gap-1.5">
                <Database className="w-3 h-3 text-surface-light/70" />
                <span className="text-[10px] text-cream/60 font-medium">Catalog image</span>
              </div>
            </div>
          )}

          {/* Asking Price (pre-filled from catalog, user-editable) */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-cream/70 mb-2">
              <DollarSign className="w-3.5 h-3.5 text-surface-light" />
              Asking Price
              {masterId && (
                <span className="text-[10px] text-cream/30 font-normal ml-1">
                  pre-filled from catalog
                </span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cream/30 text-sm font-semibold">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={estimatedValue ?? ""}
                onChange={(e) => setEstimatedValue(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 rounded-2xl bg-background-light text-cream placeholder:text-cream/25 focus:outline-none focus:ring-2 focus:ring-surface/30 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
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
            Add to Inventory
          </button>
        </div>
      </div>
    </div>
  );
}
