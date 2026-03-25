"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  X, Search, Loader2, ChevronLeft, Save, ScanLine, AlertCircle, DollarSign, CheckCircle2, Barcode, Tag, Sparkles, ImagePlus
} from "lucide-react";
import { CATEGORIES, Category, mapCatalogCategory } from "@/lib/constants";
import { MasterItem } from "@/lib/catalog/types";
import { identifyCard } from "@/lib/ximilarService";
import { identifyItemWithGemini } from "@/lib/gemini"; 
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
    year?: string;
    pieces?: string;
    graded?: boolean;
    grader?: string;
    gradeNum?: string;
  }) => void;
}

export default function AddItemModal({ isOpen, onClose, onAdd }: AddItemModalProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const isFree = !session?.user?.tier || session.user.tier === "free";
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [step, setStep] = useState<"search" | "configure">("search");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [catalogImage, setCatalogImage] = useState<string | null>(null);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [masterId, setMasterId] = useState<string | undefined>();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MasterItem[]>([]);
  const [, setIsSearching] = useState(false);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [suggestionPage, setSuggestionPage] = useState(1);
  const [suggestionCategory, setSuggestionCategory] = useState("");
  const [suggestionHasMore, setSuggestionHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isBarcodeLoading, setIsBarcodeLoading] = useState(false);
  const [conditionError, setConditionError] = useState(false);

  // 🔥 הוספתי את המצב 'manual' לטיפוסים כאן
  const [priceStatus, setPriceStatus] = useState<{ msg: string; type: 'success' | 'loading' | 'error' | 'warning' | 'manual' } | null>(null);

  const [config, setConfig] = useState<ItemConfig>({
    askingPrice: undefined,
    condition: "",
    status: "For Trade",
    notes: "",
    year: "",
    pieces: "",
    graded: false,
    grader: "PSA",
    gradeNum: "10"
  });
  
  const scanInputRef       = useRef<HTMLInputElement>(null);
  const photoInputRef      = useRef<HTMLInputElement>(null);
  const debounceRef        = useRef<ReturnType<typeof setTimeout>>();
  const searchWrapperRef   = useRef<HTMLDivElement>(null);

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── מנוע מחירים (Sniper) ──
  const fetchMarketPrice = async (query: string, cat: Category, setCode?: string, cardNum?: string) => {
      setPriceStatus({ msg: "Checking market data...", type: 'loading' });
      
      const lowerQuery = query.toLowerCase();
      // המגן לקופסאות סגורות (שלא נשלח בטעות למנוע של קלפים בודדים)
      const isSealedProduct = lowerQuery.includes("box") || lowerQuery.includes("etb") || lowerQuery.includes("booster") || lowerQuery.includes("pack") || lowerQuery.includes("tin");

      // 1. פוקימון: עדיפות ל-TCGDex (רק קלפים בודדים)
      if (cat === "Pokémon TCG" && !isSealedProduct) {
          try {
            let targetId = null;
            if (setCode && cardNum) {
                const exactId = `${setCode.toLowerCase()}-${cardNum}`;
                const res = await fetch(`https://api.tcgdex.net/v2/en/cards/${exactId}`);
                if (res.ok) {
                   const data = await res.json();
                   if (data.id === exactId || data.name) targetId = exactId;
                }
            }
            if (!targetId) {
                const cleanName = query.replace(/\s(Star|Lv\.X|V|VMAX|GX|EX|Gold Star)$/i, "").trim();
                const searchRes = await fetch(`https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(cleanName)}`);
                const searchResults = await searchRes.json();
                if (searchResults && searchResults.length > 0) targetId = searchResults[0].id;
            }

            if (targetId) {
                const details = await (await fetch(`https://api.tcgdex.net/v2/en/cards/${targetId}`)).json();
                const tcg = details.pricing?.tcgplayer;
                if (tcg) {
                  const price = tcg.normal?.marketPrice || tcg.unlimited?.marketPrice || tcg.holo?.marketPrice;
                  if (price) {
                    setPriceStatus({ msg: `TCG Market Price: $${price}`, type: 'success' });
                    setConfig(prev => ({ ...prev, askingPrice: price }));
                    return;
                  }
                }
            }
          } catch (e) { console.error("TCG Error", e); }
      }

      // 2. איביי (ברירת מחדל לכל השאר)
      try {
          let cleanQuery = query;
          if (cat === "Lego") {
             const legoNum = query.match(/\d{4,7}/)?.[0] || "";
             if (legoNum) cleanQuery = `Lego ${legoNum} set`;
             else cleanQuery = `Lego ${query}`;
          } else {
             cleanQuery = query.replace("Funko Pop", "").trim() + ` ${cat === 'Funko Pop' ? 'Funko Pop' : ''}`;
          }
          
          const res = await fetch(`/api/ebay/pricing?q=${encodeURIComponent(cleanQuery)}`);
          const data = await res.json();
          
          if (data.price) {
              setPriceStatus({ msg: `eBay Avg Price: $${data.price}`, type: 'success' });
              setConfig(prev => ({ ...prev, askingPrice: data.price }));
          } else {
              // 🔥 התיקון: הודעה ידידותית במקום שגיאה
              setPriceStatus({ msg: "Market data unavailable. Set your price!", type: 'manual' });
          }
      } catch {
          // גם בקריסה - אנחנו נחמדים
          setPriceStatus({ msg: "Market data unavailable. Set your price!", type: 'manual' });
      }
  };

  // ── מנוע לגו ──
  const fetchLegoDetails = async (text: string) => {
      const match = text.match(/\b\d{4,7}\b/);
      if (match) {
          const setNum = match[0];
          try {
              setPriceStatus({ msg: `Fetching Lego Data (${setNum})...`, type: 'loading' });
              const res = await fetch(`/api/lego?set=${setNum}`);
              const data = await res.json();
              
              if (data.found) {
                  setName(data.name);
                  if (data.image) setConfig(prev => ({ ...prev, customImage: data.image }));
                  
                  setConfig(prev => ({ 
                      ...prev, 
                      year: data.year?.toString(), 
                      pieces: data.num_parts?.toString(),
                      notes: ""
                  }));
                  
                  fetchMarketPrice(data.name, "Lego");
                  return true;
              }
          } catch (e) { console.error("Lego Fetch Error", e); }
      }
      return false;
  };

  // ── מנוע ברקוד ──
  const runBarcodeLogic = async (code: string): Promise<boolean> => {
    setIsBarcodeLoading(true);
    setPriceStatus({ msg: "Found Barcode! Searching DB...", type: 'loading' });
    setScanError(null);

    try {
        const res = await fetch(`/api/barcode?code=${code}`);
        const data = await res.json();

        if (data.found) {
            const finalName = data.title;
            let detectedCategory: Category = "Other"; 
            const rawText = (data.title + " " + data.category).toLowerCase();

            if (rawText.includes("funko")) detectedCategory = "Funko Pop";
            else if (rawText.includes("lego")) detectedCategory = "Lego";
            else if (rawText.includes("pokemon") || rawText.includes("pkmn")) detectedCategory = "Pokémon TCG";
            else if (rawText.includes("magic") || rawText.includes("mtg")) detectedCategory = "Other TCG";
            else if (rawText.includes("sneaker")) detectedCategory = "Sneakers";
            
            setCategory(detectedCategory);
            
            if (detectedCategory === "Lego") {
                await fetchLegoDetails(finalName); 
            } else {
                setName(finalName);
                if (data.image) setConfig(prev => ({ ...prev, customImage: data.image }));
                fetchMarketPrice(finalName, detectedCategory);
            }
            
            setIsBarcodeLoading(false);
            return true;
        } 
        setIsBarcodeLoading(false);
        return false;
    } catch {
        setIsBarcodeLoading(false);
        return false;
    }
  };

  const handleBarcodeSearch = () => {
      if (barcodeInput.length >= 3) runBarcodeLogic(barcodeInput);
  };

  useEffect(() => {
    if (isOpen && catalogTotal === 0) {
      fetch("/api/catalog/search?pageSize=1").then((r) => r.json()).then((data) => setCatalogTotal(data.total || 0)).catch(() => {});
    }
  }, [isOpen, catalogTotal]);

  // Auto-dismiss condition error toast after 3 s
  useEffect(() => {
    if (!conditionError) return;
    const t = setTimeout(() => setConditionError(false), 3000);
    return () => clearTimeout(t);
  }, [conditionError]);

  // cat="" means global search; passing a category filters results to that category
  const searchCatalog = useCallback((query: string, cat = "") => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) {
      setSuggestions([]);
      setSuggestionQuery("");
      setSuggestionPage(1);
      setSuggestionCategory("");
      setSuggestionHasMore(false);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const catParam = cat ? `&category=${encodeURIComponent(cat)}` : "";
        const res = await fetch(`/api/catalog/search?q=${encodeURIComponent(query)}&pageSize=5&page=1${catParam}`);
        const data = await res.json();
        const items: MasterItem[] = data.items || [];
        setSuggestions(items);
        setSuggestionQuery(query);
        setSuggestionCategory(cat);
        setSuggestionPage(2);
        setSuggestionHasMore((data.total || 0) > items.length);
        if (items.length > 0) setShowSuggestions(true);
      } catch { setSuggestions([]); setSuggestionHasMore(false); } finally { setIsSearching(false); }
    }, 250);
  }, []);

  const loadMoreSuggestions = useCallback(async () => {
    if (!suggestionQuery || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const catParam = suggestionCategory ? `&category=${encodeURIComponent(suggestionCategory)}` : "";
      const res = await fetch(`/api/catalog/search?q=${encodeURIComponent(suggestionQuery)}&pageSize=5&page=${suggestionPage}${catParam}`);
      const data = await res.json();
      const newItems: MasterItem[] = data.items || [];
      setSuggestions((prev) => [...prev, ...newItems]);
      setSuggestionPage((prev) => prev + 1);
      const totalLoaded = suggestions.length + newItems.length;
      setSuggestionHasMore(totalLoaded < (data.total || 0));
    } catch {} finally { setIsLoadingMore(false); }
  }, [suggestionQuery, suggestionPage, suggestionCategory, isLoadingMore, suggestions.length]);

  const handleSelectSuggestion = (item: MasterItem) => {
    setName(item.name);
    setMasterId(item.id);
    setConfig((prev) => ({ ...prev, askingPrice: item.marketPrice || undefined }));
    setCatalogImage(item.imageLarge || item.imageSmall);
    setShowSuggestions(false);
    setSuggestionHasMore(false);
    setSuggestionPage(1);
    setCategory(mapCatalogCategory(item.category));
  };

  // ── Plain photo attach (no AI) — available to all users ──────────────────
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 800;
        const scale = img.width > MAX ? MAX / img.width : 1;
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const b64 = canvas.toDataURL("image/jpeg", 0.75);
        setScannedImage(b64);
        setConfig((prev) => ({ ...prev, customImage: b64 }));
      };
    };
    reader.readAsDataURL(file);
    // reset so same file can be re-selected
    e.target.value = "";
  };

  // ── מנוע סריקה ראשי ──
  const handleScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setName(""); setCategory(""); setScanError(null); setPriceStatus(null);
    setBarcodeInput("");
    setConfig(prev => ({ 
        ...prev, 
        customImage: undefined, askingPrice: undefined, notes: "", 
        year: "", pieces: "", graded: false, gradeNum: "10" 
    }));

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setScannedImage(base64);
      setIsScanning(true);
      setPriceStatus({ msg: "AI Analyzing...", type: 'loading' });
      setConfig(prev => ({ ...prev, customImage: base64 }));

      try {
        const geminiResult = await identifyItemWithGemini(base64);
        
        if (!geminiResult) {
            setScanError("AI limit reached. Try again.");
            setPriceStatus(null);
            setIsScanning(false);
            return;
        }

        if (geminiResult.barcode) {
            setBarcodeInput(geminiResult.barcode);
            const success = await runBarcodeLogic(geminiResult.barcode);
            if (success) {
                setIsScanning(false);
                return;
            }
        }

        if (geminiResult.visual) {
            const visual = geminiResult.visual;
            const lowerName = visual.name.toLowerCase();

            // לוגיקת קטגוריות
            let detectedCategory: Category = "Other";
            
            const isYugioh = lowerName.includes("yu-gi-oh") || lowerName.includes("yugioh") || lowerName.includes("magic") || lowerName.includes("mtg") || lowerName.includes("digimon") || lowerName.includes("lorcana");
            const isSports = lowerName.includes("baseball") || lowerName.includes("basketball") || lowerName.includes("football") || lowerName.includes("soccer") || lowerName.includes("nba") || lowerName.includes("nfl") || lowerName.includes("fleer") || lowerName.includes("upper deck") || lowerName.includes("jordan") || lowerName.includes("lebron");
            const isPokemon = lowerName.includes("pokemon") || lowerName.includes("charizard") || lowerName.includes("pikachu");

            if (isSports) detectedCategory = "Sports Cards";
            else if (isYugioh) detectedCategory = "Other TCG";
            else if (isPokemon) detectedCategory = "Pokémon TCG";
            else if (lowerName.includes("funko")) detectedCategory = "Funko Pop";
            else if (lowerName.includes("lego")) detectedCategory = "Lego";
            else if (lowerName.includes("sneaker")) detectedCategory = "Sneakers";
            else if (lowerName.includes("coin") || lowerName.includes("dollar") || lowerName.includes("cent")) detectedCategory = "Coins";
            else if (lowerName.includes("watch") || lowerName.includes("rolex")) detectedCategory = "Watches";
            else if (visual.category === "Pokémon TCG") detectedCategory = "Pokémon TCG";
            else detectedCategory = mapCatalogCategory(visual.category);

            setCategory(detectedCategory);
            setName(visual.name);

            // לוגיקת קופסאות
            const isSealed = lowerName.includes("box") || lowerName.includes("etb") || lowerName.includes("booster") || lowerName.includes("pack") || lowerName.includes("tin") || lowerName.includes("collection");

            if (detectedCategory === "Pokémon TCG" && visual.isCard && !isSealed) {
                setPriceStatus({ msg: "Identifying Pokemon Card...", type: 'loading' });
                const cardResult = await identifyCard(base64);
                if (cardResult.success && cardResult.cardName) {
                    setName(cardResult.cardName);
                    const rawRecord = (cardResult.raw as unknown as Record<string, unknown[]>)?.records?.[0] as Record<string, unknown[]> | undefined;
                    const obj = (rawRecord?._objects?.[0] as Record<string, Record<string, unknown>> | undefined);
                    const bestMatch = obj?._identification?.best_match as Record<string, string> | undefined;
                    fetchMarketPrice(cardResult.cardName, "Pokémon TCG", bestMatch?.set_series_code, bestMatch?.card_number);
                } else {
                    fetchMarketPrice(visual.name, "Pokémon TCG");
                }
            } 
            else if (detectedCategory === "Lego") {
                const legoSuccess = await fetchLegoDetails(visual.name);
                if (!legoSuccess) fetchMarketPrice(visual.name, "Lego");
            }
            else {
                setPriceStatus({ msg: "Fetching eBay Price...", type: 'loading' });
                fetchMarketPrice(visual.name, detectedCategory);
            }
        } else {
             setScanError("Could not identify item.");
        }
      } catch {
        setScanError("Scan failed.");
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleNextStep = () => setStep("configure");

  const handleSave = () => {
    if (!name.trim()) return;
    // Condition is mandatory unless the item is graded (grade replaces condition)
    if (!config.graded && !config.condition) {
      setConditionError(true);
      return;
    }
    const finalCategory = (category || "Other") as Category;
    onAdd({
      name: name.trim(),
      category: finalCategory,
      upForTrade: config.status === "For Trade",
      imagePreview: catalogImage,
      customImage: config.customImage || scannedImage || undefined,
      estimatedValue: config.askingPrice,
      masterId,
      condition: config.condition,
      status: config.status,
      notes: config.notes || undefined,
      year: config.year,
      pieces: config.pieces,
      graded: config.graded,
      grader: config.graded ? config.grader : undefined,
      gradeNum: config.graded ? config.gradeNum : undefined
    });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setStep("search"); setName(""); setCategory(""); setCatalogImage(null); setScannedImage(null);
    setMasterId(undefined); setSuggestions([]); setIsScanning(false); setScanError(null); setPriceStatus(null);
    setBarcodeInput(""); setConditionError(false);
    setConfig({ askingPrice: undefined, condition: "", status: "For Trade", notes: "", year: "", pieces: "", graded: false, gradeNum: "10" });
  };

  // Wrapper so selecting a condition clears the error immediately
  const handleConfigChange = (next: typeof config) => {
    setConfig(next);
    if (next.condition || next.graded) setConditionError(false);
  };

  const handleClose = () => { resetForm(); onClose(); };
  // Category is mandatory — user must pick one (even "Other") before proceeding.
  const isStepOneValid = !!name.trim() && !!category;

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add item to vault"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onKeyDown={(e) => e.key === "Escape" && handleClose()}
    >
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={handleClose} />

      {/* Floating condition-error toast */}
      {conditionError && (
        <div className="absolute bottom-8 inset-x-0 flex justify-center z-10 pointer-events-none px-6">
          <div className="animate-slide-up flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-red-500/90 backdrop-blur-sm shadow-2xl border border-red-400/30">
            <AlertCircle className="w-4 h-4 text-white flex-shrink-0" />
            <span className="text-sm font-semibold text-white whitespace-nowrap">Please select a condition to continue</span>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-md bg-charcoal-dark rounded-3xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up">
        <button onClick={handleClose} className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors">
          <X className="w-4.5 h-4.5 text-white/80" />
        </button>

        {step === "search" && (
          <>
            <div className="px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
              <h2 className="text-lg font-bold text-cream">Curate a Piece</h2>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-none p-5 space-y-4">
              {/* Two action buttons: upload (free) + AI scan (pro) */}
              <div className="grid grid-cols-2 gap-3">
                {/* ── Upload Photo — everyone ── */}
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 px-3 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/20 transition-all active:scale-95"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center">
                    <ImagePlus className="w-5 h-5 text-cream/50" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-cream/70">Upload Photo</p>
                    <p className="text-[9px] text-cream/30 mt-0.5">Free · Any image</p>
                  </div>
                </button>

                {/* ── Magic AI Scan — pro only (premium styling) ── */}
                <div className="relative group">
                  {/* Animated glow border — always visible for free to entice, brighter for pro */}
                  <div className={`absolute -inset-[1.5px] rounded-2xl bg-gradient-to-br from-purple-500 via-violet-400 to-fuchsia-500 transition-opacity duration-300 ${
                    isFree ? "opacity-40 animate-pulse" : "opacity-70 group-hover:opacity-100"
                  }`} />
                  <button
                    type="button"
                    disabled={isScanning}
                    onClick={() => {
                      if (isFree) { setShowUpgradePrompt(true); }
                      else { scanInputRef.current?.click(); }
                    }}
                    className="relative w-full flex flex-col items-center gap-2 px-3 py-4 rounded-2xl bg-[#1a1520] transition-all active:scale-[0.97]"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isFree ? "bg-purple-500/10" : "bg-purple-500/25"}`}>
                      {isScanning
                        ? <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                        : <Sparkles className="w-5 h-5 text-purple-400" />
                      }
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <p className="text-xs font-extrabold text-purple-300">
                          {isScanning ? "Scanning…" : "Magic AI Scan"}
                        </p>
                        {isFree && (
                          <span className="text-[8px] font-black text-primary bg-primary/20 border border-primary/40 px-1.5 py-0.5 rounded-md leading-none tracking-wide">PRO</span>
                        )}
                      </div>
                      <p className="text-[9px] text-purple-400/60 mt-0.5">
                        {isFree ? "Tap to unlock" : "Auto-identify & price"}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Hidden file inputs */}
              <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <input ref={scanInputRef}  type="file" accept="image/*" capture="environment" onChange={handleScanUpload} className="hidden" />

              <div className="flex gap-2">
                 <div className="relative flex-1">
                    <input type="text" placeholder="Enter Barcode / UPC..." value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)}
                       className="w-full pl-10 pr-4 py-3 rounded-2xl bg-background-light text-cream placeholder:text-cream/25 focus:outline-none focus:ring-2 focus:ring-surface/30 transition-all" />
                    <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cream/30" />
                 </div>
                 <button onClick={handleBarcodeSearch} disabled={isBarcodeLoading || !barcodeInput} className="px-4 rounded-2xl bg-charcoal-light border border-white/5 hover:bg-white/5 text-cream disabled:opacity-50">
                    {isBarcodeLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                 </button>
              </div>

              {(priceStatus || scanError) && (
                <div className={`px-3 py-2.5 rounded-xl border flex items-center gap-2.5 ${
                  scanError ? 'bg-red-500/10 border-red-500/20 text-red-300' :
                  priceStatus?.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-300' :
                  priceStatus?.type === 'error' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' :
                  priceStatus?.type === 'manual' ? 'bg-primary/10 border-primary/20 text-primary' :
                  'bg-primary/10 border-primary/20 text-primary'
                }`}>
                  {scanError ? <AlertCircle className="w-4 h-4" /> : 
                   priceStatus?.type === 'success' ? <DollarSign className="w-4 h-4" /> : 
                   priceStatus?.type === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                   priceStatus?.type === 'manual' ? <Tag className="w-4 h-4" /> : // 🔥 אייקון תגית חדש
                   <AlertCircle className="w-4 h-4" />}
                  <span className="text-xs font-semibold tracking-wide">{scanError || priceStatus?.msg}</span>
                </div>
              )}

              {scannedImage && !isScanning && !scanError && name && !priceStatus && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <p className="text-xs text-green-300/80">Identified: <span className="font-bold">{name}</span></p>
                </div>
              )}

              <div className="relative" ref={searchWrapperRef}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); searchCatalog(e.target.value, category as string); }}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); setShowSuggestions(false); } }}
                  placeholder="Search the catalog…"
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-background-light text-cream placeholder:text-cream/25 focus:outline-none focus:ring-2 focus:ring-surface/30 transition-all"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cream/30" />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-charcoal-light rounded-2xl border border-white/10 overflow-hidden shadow-2xl max-h-60 overflow-y-auto">
                    {suggestions.map((s) => (
                      <button key={s.id} onClick={() => handleSelectSuggestion(s)} className="w-full p-3 flex items-center gap-3 hover:bg-white/5 text-left border-b border-white/5 transition-colors">
                        <img src={s.imageSmall} alt={s.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-cream font-bold truncate">{s.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-[10px] text-cream/40">{s.category}</p>
                            {s.marketPrice > 0 && (
                              <p className="text-[10px] text-primary/70 font-semibold">
                                · ${s.marketPrice.toFixed(2)} <span className="text-cream/30 font-normal">eBay Avg</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                    {suggestionHasMore && (
                      <button
                        onClick={(e) => { e.stopPropagation(); loadMoreSuggestions(); }}
                        disabled={isLoadingMore}
                        className="w-full p-3 flex items-center justify-center gap-2 text-primary/70 hover:text-primary hover:bg-white/5 transition-colors text-xs font-semibold"
                      >
                        {isLoadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        {isLoadingMore ? "Loading…" : `See more results for "${suggestionQuery}"`}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <select
                  value={category}
                  onChange={(e) => {
                    const newCat = e.target.value as Category;
                    setCategory(newCat);
                    if (name.trim()) {
                      // Re-run search filtered by the new category
                      searchCatalog(name.trim(), newCat);
                    } else {
                      // No query yet — browse eBay for this category
                      setIsSearching(true);
                      setSuggestions([]);
                      fetch(`/api/catalog/search?category=${encodeURIComponent(newCat)}&pageSize=8`)
                        .then((r) => r.json())
                        .then((data) => { setSuggestions(data.items || []); setShowSuggestions(true); })
                        .catch(() => setSuggestions([]))
                        .finally(() => setIsSearching(false));
                    }
                  }}
                  className="w-full px-4 py-3 rounded-2xl bg-background-light text-cream appearance-none focus:outline-none"
                >
                  <option value="" disabled>Select a category</option>
                  {CATEGORIES.map((cat) => <option key={cat} value={cat} className="bg-charcoal-dark text-cream">{cat}</option>)}
                </select>
                <p className="mt-1.5 px-1 text-[10px] text-cream/25">💡 Tip: Select a category to narrow down your search results.</p>
              </div>
            </div>

            <div className="flex gap-3 px-5 pb-5 pt-3 border-t border-white/[0.06] flex-shrink-0">
              <button onClick={handleClose} className="px-5 py-3 rounded-2xl bg-background-light text-cream/40 font-bold text-sm hover:bg-charcoal-light/50 active:scale-[0.97] transition-all">Close</button>
              <button onClick={handleNextStep} disabled={!isStepOneValid} className={`flex-1 py-3 rounded-2xl font-bold text-sm active:scale-[0.97] transition-all ${isStepOneValid ? "bg-primary/20 text-primary hover:bg-primary/30" : "bg-background-light text-cream/20 cursor-not-allowed"}`}>Next</button>
            </div>
          </>
        )}

        {step === "configure" && (
          <>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
              <button onClick={() => setStep("search")} className="p-1.5 rounded-xl hover:bg-charcoal-light/50 transition-colors">
                <ChevronLeft className="w-5 h-5 text-cream/50" />
              </button>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <img src={config.customImage || scannedImage || catalogImage || ""} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                <div className="min-w-0"><p className="text-sm font-bold text-cream truncate">Details</p><p className="text-xs text-cream/35 truncate">{name}</p></div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-none p-5">
              <ItemConfigForm config={config} onChange={handleConfigChange} category={category as string} isManualEntry={!masterId} />
            </div>
            <div className="px-5 pb-5 pt-3 border-t border-white/[0.06] flex-shrink-0">
              <div className="flex gap-3">
                <button onClick={() => { setStep("search"); setConditionError(false); }} className="px-5 py-3 rounded-2xl bg-background-light text-cream/40 font-bold text-sm hover:bg-charcoal-light/50 active:scale-[0.97] transition-all">Back</button>
                {(() => {
                  const needsPrice = (config.status === "For Trade" || config.status === "For Sale") && !(config.askingPrice && config.askingPrice > 0);
                  return (
                    <button
                      onClick={handleSave}
                      disabled={needsPrice}
                      title={needsPrice ? "Set an asking price to continue" : undefined}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm active:scale-[0.97] transition-all ${needsPrice ? "bg-background-light text-cream/20 cursor-not-allowed" : "bg-primary/20 text-primary hover:bg-primary/30"}`}
                    >
                      <Save className="w-4 h-4" />
                      {needsPrice ? "Set a Price First" : "Add to Vault"}
                    </button>
                  );
                })()}
              </div>
            </div>
          </>
        )}

        {/* ── Upgrade Prompt Overlay ── */}
        {showUpgradePrompt && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-3xl bg-charcoal-dark/95 backdrop-blur-md p-6">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/10 via-transparent to-fuchsia-500/10 pointer-events-none" />

            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 via-violet-400 to-fuchsia-500 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>

            <h2 className="relative text-xl font-extrabold text-cream mb-2">Magic AI Scan</h2>
            <p className="relative text-sm text-cream/40 text-center mb-3 max-w-[260px] leading-relaxed">
              Instantly identify any collectible — cards, sneakers, LEGO, watches — and auto-fill market price data.
            </p>
            <div className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 mb-6">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-xs font-bold text-primary">Uniques Pro · $4.99/mo</span>
            </div>

            <button
              onClick={() => window.open("/upgrade", "_blank")}
              className="relative w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-extrabold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-purple-500/20 mb-3 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                See Pro Plans
              </span>
            </button>

            <button
              onClick={() => setShowUpgradePrompt(false)}
              className="relative w-full py-3 rounded-2xl bg-white/[0.05] text-cream/50 font-semibold text-sm hover:bg-white/[0.08] hover:text-cream/70 transition-all"
            >
              Maybe later
            </button>
          </div>
        )}

      </div>
    </div>
  );
}