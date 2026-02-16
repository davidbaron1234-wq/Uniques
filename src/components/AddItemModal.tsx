"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X, ChevronDown, Search, Sparkles, Database, Loader2,
  ChevronLeft, Save, Camera, ScanLine, AlertCircle,
} from "lucide-react";
import { CATEGORIES, Category, mapCatalogCategory } from "@/lib/constants";
import { formatValue } from "@/lib/format";
import { MasterItem } from "@/lib/catalog/types";
import { identifyCard } from "@/lib/ximilarService";
import ItemConfigForm, { ItemConfig } from "./ItemConfigForm";

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
    condition?: string;
    status?: string;
    notes?: string;
  }) => void;
}

export default function AddItemModal({ isOpen, onClose, onAdd }: AddItemModalProps) {
  const [step, setStep] = useState<"search" | "configure">("search");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [catalogImage, setCatalogImage] = useState<string | null>(null);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [masterId, setMasterId] = useState<string | undefined>();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MasterItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [config, setConfig] = useState<ItemConfig>({
    askingPrice: undefined,
    condition: "Near Mint",
    status: "For Trade",
    notes: "",
  });
  const scanInputRef = useRef<HTMLInputElement>(null);
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

  // Debounced search
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
        const res = await fetch(`/api/catalog/search?q=${encodeURIComponent(query)}&pageSize=8`);
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

  // ── Ximilar AI Scan ─────────────────────────────────────────────────
  const handleScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5 MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setScannedImage(base64);
      setIsScanning(true);
      setScanError(null);

      try {
        const result = await identifyCard(base64);
        if (result.success && result.cardName) {
          setName(result.cardName);
          setCategory((result.category as Category) || "Pokémon TCG");
          setConfig((prev) => ({ ...prev, customImage: base64 }));

          // Try catalog match for pricing
          try {
            const res = await fetch(`/api/catalog/search?q=${encodeURIComponent(result.cardName)}&pageSize=1`);
            const data = await res.json();
            if (data.items?.length > 0) {
              const match = data.items[0];
              setMasterId(match.id);
              setCatalogImage(match.imageLarge || match.imageSmall);
              setConfig((prev) => ({
                ...prev,
                askingPrice: match.marketPrice || undefined,
                customImage: base64,
              }));
            }
          } catch { /* catalog search optional */ }
        } else {
          setScanError("Could not identify this card. Try manual search below.");
        }
      } catch {
        setScanError("Scan failed. Please try again or search manually.");
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSuggestion = (item: MasterItem) => {
    setName(item.name);
    setMasterId(item.id);
    setConfig((prev) => ({ ...prev, askingPrice: item.marketPrice || undefined }));
    setCatalogImage(item.imageLarge || item.imageSmall);
    setShowSuggestions(false);
    setCategory(mapCatalogCategory(item.category));
  };

  const handleNextStep = () => setStep("configure");

  const handleSave = () => {
    if (!name.trim() || !category) return;
    onAdd({
      name: name.trim(),
      category: category as Category,
      upForTrade: config.status === "For Trade",
      imagePreview: catalogImage,
      customImage: config.customImage || scannedImage || undefined,
      estimatedValue: config.askingPrice,
      masterId,
      condition: config.condition,
      status: config.status,
      notes: config.notes || undefined,
    });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setStep("search");
    setName("");
    setCategory("");
    setCatalogImage(null);
    setScannedImage(null);
    setMasterId(undefined);
    setSuggestions([]);
    setIsScanning(false);
    setScanError(null);
    setConfig({ askingPrice: undefined, condition: "Near Mint", status: "For Trade", notes: "" });
  };

  const handleClose = () => { resetForm(); onClose(); };
  const isStepOneValid = name.trim() && category;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-fade-in" onClick={handleClose} />

      <div className="relative w-full max-w-md bg-charcoal-dark rounded-3xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up">
        <button onClick={handleClose} className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors" aria-label="Close">
          <X className="w-4.5 h-4.5 text-white/80" />
        </button>

        {/* ── STEP 1: Scan / Search ──────────────────────────────── */}
        {step === "search" && (
          <>
            <div className="px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
              <h2 className="text-lg font-bold text-cream">Add New Item</h2>
              {catalogTotal > 0 && (
                <p className="text-[10px] text-surface-light/50 flex items-center gap-1 mt-0.5">
                  <Database className="w-3 h-3" />
                  {catalogTotal.toLocaleString()} items in Master Catalog
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4">
              {/* AI Scanner */}
              <div>
                <button
                  type="button"
                  onClick={() => scanInputRef.current?.click()}
                  disabled={isScanning}
                  className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-gradient-to-r from-purple-500/15 via-blue-500/10 to-purple-500/15 border border-purple-500/20 hover:border-purple-400/40 transition-all group"
                >
                  {isScanning ? (
                    <div className="w-11 h-11 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/30 transition-colors">
                      <ScanLine className="w-5 h-5 text-purple-400" />
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-sm text-cream font-bold">{isScanning ? "Scanning..." : "Scan Card with AI"}</p>
                    <p className="text-[10px] text-cream/30 mt-0.5">{isScanning ? "Identifying your card..." : "Snap a photo — AI auto-fills the details"}</p>
                  </div>
                </button>
                <input ref={scanInputRef} type="file" accept="image/*" capture="environment" onChange={handleScanUpload} className="hidden" />

                {scanError && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <p className="text-xs text-amber-300/80">{scanError}</p>
                  </div>
                )}

                {scannedImage && !isScanning && !scanError && name && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
                    <Camera className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <p className="text-xs text-green-300/80">Identified: <span className="font-bold">{name}</span></p>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[10px] text-cream/20 font-semibold uppercase tracking-wider">or search manually</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              {/* Manual Search */}
              <div className="relative">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-cream/50 mb-2 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
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
                  {isSearching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-light/50 animate-spin" />}
                </div>

                {masterId && (
                  <div className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 w-fit">
                    <Database className="w-3 h-3 text-primary" />
                    <span className="text-[10px] text-primary font-semibold">Linked to Master Catalog</span>
                  </div>
                )}

                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-20 w-full mt-1.5 rounded-2xl bg-charcoal-dark border border-white/[0.08] shadow-soft-xl overflow-hidden max-h-72 overflow-y-auto">
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
                            {item.set && <span className="text-[10px] text-cream/30">{item.set}</span>}
                            {item.rarity && <span className="text-[10px] text-surface-light/60">{item.rarity}</span>}
                            <span className="text-[10px] text-primary font-semibold">{formatValue(item.marketPrice)}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-cream/50 mb-2 uppercase tracking-wider">Category</label>
                <div className="relative">
                  <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="w-full px-4 py-3 rounded-2xl bg-background-light text-cream appearance-none focus:outline-none focus:ring-2 focus:ring-surface/30 transition-all">
                    <option value="" disabled>Select a category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-charcoal-dark text-cream">{cat}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cream/30 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-5 pb-5 pt-3 border-t border-white/[0.06] flex-shrink-0">
              <button onClick={handleClose} className="px-5 py-3 rounded-2xl bg-background-light text-cream/40 font-bold text-sm hover:bg-charcoal-light/50 active:scale-[0.97] transition-all">Cancel</button>
              <button
                onClick={handleNextStep}
                disabled={!isStepOneValid}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm active:scale-[0.97] transition-all ${isStepOneValid ? "bg-primary/20 text-primary hover:bg-primary/30" : "bg-background-light text-cream/20 cursor-not-allowed"}`}
              >
                Next
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: Configure ──────────────────────────────────── */}
        {step === "configure" && (
          <>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
              <button onClick={() => setStep("search")} className="p-1.5 rounded-xl hover:bg-charcoal-light/50 transition-colors">
                <ChevronLeft className="w-5 h-5 text-cream/50" />
              </button>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {(config.customImage || scannedImage || catalogImage) && (
                  <img src={config.customImage || scannedImage || catalogImage || ""} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-cream truncate">Configure</p>
                  <p className="text-xs text-cream/35 truncate">{name}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain p-5">
              <ItemConfigForm config={config} onChange={setConfig} />
            </div>
            <div className="flex gap-3 px-5 pb-5 pt-3 border-t border-white/[0.06] flex-shrink-0">
              <button onClick={() => setStep("search")} className="px-5 py-3 rounded-2xl bg-background-light text-cream/40 font-bold text-sm hover:bg-charcoal-light/50 active:scale-[0.97] transition-all">Back</button>
              <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/20 text-primary font-bold text-sm hover:bg-primary/30 active:scale-[0.97] transition-all">
                <Save className="w-4 h-4" />
                Save to Collection
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
