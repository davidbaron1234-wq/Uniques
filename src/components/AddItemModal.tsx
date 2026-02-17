"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X, ChevronDown, Search, Sparkles, Database, Loader2,
  ChevronLeft, Save, Camera, ScanLine, AlertCircle, DollarSign, CheckCircle2, Box
} from "lucide-react";
import { CATEGORIES, Category, mapCatalogCategory } from "@/lib/constants";
import { formatValue } from "@/lib/format";
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
  
  const [priceStatus, setPriceStatus] = useState<{ msg: string; type: 'success' | 'loading' | 'error' | 'warning' } | null>(null);

  const [config, setConfig] = useState<ItemConfig>({
    askingPrice: undefined,
    condition: "Near Mint",
    status: "For Trade",
    notes: "",
  });
  const scanInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ── מנוע מחירים חכם (Sniper Mode + 1stEdition Fix) ──────────────────
  // פונקציה זו קריטית למציאת מחירים מדויקים של קלפים
  const fetchLivePrice = async (cardName: string, setCode?: string, cardNumber?: string) => {
    try {
      setPriceStatus({ msg: "Checking market data...", type: 'loading' });
      let targetId = null;

      // 1. נסיון ישיר לפי ID (הכי מדויק)
      if (setCode && cardNumber) {
        const exactId = `${setCode.toLowerCase()}-${cardNumber}`;
        const res = await fetch(`https://api.tcgdex.net/v2/en/cards/${exactId}`);
        if (res.ok) {
           const data = await res.json();
           if (data.id === exactId || data.name) targetId = exactId;
        }
      }

      // 2. חיפוש חכם (התעלמות מתוספות כמו Star/Lv.X כדי למצוא התאמה רחבה יותר אם צריך)
      if (!targetId) {
        const cleanName = cardName.replace(/\s(Star|Lv\.X|V|VMAX|GX|EX|Gold Star)$/i, "").trim();
        const searchRes = await fetch(`https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(cleanName)}`);
        const searchResults = await searchRes.json();
        
        if (searchResults && searchResults.length > 0) {
          if (cardNumber) {
             const exactMatch = searchResults.find((c: any) => {
                return c.localId === cardNumber || c.id.endsWith(`-${cardNumber}`);
             });
             if (exactMatch) targetId = exactMatch.id;
             else targetId = searchResults[0].id;
          } else {
             targetId = searchResults[0].id;
          }
        }
      }

      // 3. שליפת המחיר הסופי מה-API
      if (targetId) {
        const detailsRes = await fetch(`https://api.tcgdex.net/v2/en/cards/${targetId}`);
        const details = await detailsRes.json();
        const tcg = details.pricing?.tcgplayer;
        
        // בדיקת כל סוגי המחירים האפשריים (כולל מהדורה ראשונה)
        if (tcg) {
          const price = tcg.normal?.marketPrice || 
                        tcg["1stEdition"]?.marketPrice || 
                        tcg.unlimited?.marketPrice ||
                        tcg.holo?.marketPrice || 
                        tcg.reverse?.marketPrice || 
                        tcg.normal?.midPrice ||      
                        tcg.holo?.midPrice;

          if (price) {
            setPriceStatus({ msg: `Market Price Found: $${price}`, type: 'success' });
            return price;
          }
        }
        
        // גיבוי: מחירים מאירופה (Cardmarket)
        const cm = details.pricing?.cardmarket;
        const euPrice = cm?.trendPrice || cm?.avg30 || cm?.avg1;
        if (euPrice) {
           const finalPrice = Number((euPrice * 1.1).toFixed(2)); // המרה משוערת ליורו->דולר
           setPriceStatus({ msg: `Est. Value (Trend): ~$${finalPrice}`, type: 'success' });
           return finalPrice;
        }
      }

      setPriceStatus({ msg: "⚠️ Rare / Out of Stock - Enter Price", type: 'warning' });
      return null;
    } catch (err) {
      console.error(err);
      setPriceStatus({ msg: "Connection error", type: 'error' });
      return null;
    }
  };

  // ── טעינת הקטלוג וההצעות (Suggestions Logic) ────────────────────────
  useEffect(() => {
    if (isOpen && catalogTotal === 0) {
      fetch("/api/catalog/search?pageSize=1")
        .then((r) => r.json())
        .then((data) => setCatalogTotal(data.total || 0))
        .catch(() => {});
    }
  }, [isOpen, catalogTotal]);

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

  const handleSelectSuggestion = (item: MasterItem) => {
    setName(item.name);
    setMasterId(item.id);
    setConfig((prev) => ({ ...prev, askingPrice: item.marketPrice || undefined }));
    setCatalogImage(item.imageLarge || item.imageSmall);
    setShowSuggestions(false);
    setCategory(mapCatalogCategory(item.category));
  };

  // ── מנגנון הסריקה המתוקן (Gemini 2.0 Logic) ─────────────────────────
  const handleScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setScannedImage(base64);
      setIsScanning(true);
      setScanError(null);
      setPriceStatus({ msg: "AI Analyzing...", type: 'loading' });

      try {
        console.log("🚀 Starting Gemini Analysis...");
        // 1. שולחים לג'מיני (דרך השרת המתוקן שלנו)
        const geminiResult = await identifyItemWithGemini(base64);
        console.log("🤖 Gemini Raw Result:", geminiResult);

        // לוגיקה קשיחה: אם ג'מיני אומר שזה לא קלף, זה לא קלף!
        let isCard = true; // ברירת מחדל ליתר ביטחון

        if (geminiResult) {
            if (geminiResult.isCard === false) {
                isCard = false;
            }
            // הגנה כפולה: אם השם מכיל "Funko" או "Lego", זה בטוח לא קלף
            else if (geminiResult.name && (
                geminiResult.name.toLowerCase().includes("funko") ||
                geminiResult.name.toLowerCase().includes("lego") ||
                geminiResult.name.toLowerCase().includes("figure")
            )) {
                isCard = false;
            }
        }

        if (isCard) {
            console.log("🃏 Identified as CARD -> Switching to Ximilar");
            setPriceStatus({ msg: "Card detected! Pricing...", type: 'loading' });
            
            const cardResult = await identifyCard(base64);
            
            if (cardResult.success && cardResult.cardName && !cardResult.cardName.includes("thread")) {
                setName(cardResult.cardName);
                setCategory("Pokémon TCG");
                
                const match = (cardResult.raw as any)?.records?.[0]?._objects?.[0]?._identification?.best_match;
                const livePrice = await fetchLivePrice(cardResult.cardName, match?.set_series_code, match?.card_number);
                
                setConfig((prev) => ({ ...prev, askingPrice: livePrice || undefined, customImage: base64 }));
            } else {
                // במקרה ש-Ximilar נכשל, נשתמש בתוצאה הכללית של ג'מיני אם יש
                setName(geminiResult?.name || "Unknown Card");
                setCategory("Pokémon TCG");
                setPriceStatus({ msg: "Identified via Vision AI", type: 'success' });
            }
        } 
        else if (geminiResult && geminiResult.name) {
            console.log("🧸 Identified as COLLECTIBLE:", geminiResult.name);
            // זה פאנקו! מציגים את השם מג'מיני
            setName(geminiResult.name);
            
            // מנגנון זיהוי קטגוריות חכם
            let detectedCategory: Category = "Other"; // ברירת מחדל
            const lowerName = geminiResult.name.toLowerCase();
            const lowerCat = (geminiResult.category || "").toLowerCase();

            // סינכרון מלא עם רשימת הקטגוריות בתמונה ששלחת
            if (lowerName.includes("funko") || lowerCat.includes("funko")) {
                detectedCategory = "Funko Pop";
            } else if (lowerName.includes("lego") || lowerCat.includes("lego")) {
                detectedCategory = "Lego";
            } else if (lowerName.includes("sneaker") || lowerCat.includes("sneaker")) {
                detectedCategory = "Sneakers";
            } else if (lowerName.includes("comic") || lowerCat.includes("comic")) {
                detectedCategory = "Comics";
            } else if (lowerName.includes("coin") || lowerCat.includes("coin")) {
                detectedCategory = "Coins";
            } else if (lowerName.includes("watch") || lowerCat.includes("watch")) {
                detectedCategory = "Watches";
            } else if (lowerName.includes("game") || lowerCat.includes("video game")) {
                detectedCategory = "Video Games";
            } else if (lowerName.includes("sport") || lowerCat.includes("sport")) {
                detectedCategory = "Sports Cards";
            }

            setCategory(detectedCategory);
            setPriceStatus({ msg: "Item Identified! (eBay price soon)", type: 'success' });
            setConfig((prev) => ({ ...prev, customImage: base64 }));
        } 
        else {
            setScanError("Could not identify item.");
            setPriceStatus(null);
        }

      } catch (err) {
        console.error("Scan Error:", err);
        setScanError("Scan failed.");
        setPriceStatus(null);
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
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
    setPriceStatus(null);
    setConfig({ askingPrice: undefined, condition: "Near Mint", status: "For Trade", notes: "" });
  };

  const handleClose = () => { resetForm(); onClose(); };
  const isStepOneValid = name.trim() && category;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-md bg-charcoal-dark rounded-3xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up">
        <button onClick={handleClose} className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors">
          <X className="w-4.5 h-4.5 text-white/80" />
        </button>

        {step === "search" && (
          <>
            <div className="px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
              <h2 className="text-lg font-bold text-cream">Add New Item</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => scanInputRef.current?.click()}
                  disabled={isScanning}
                  className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-gradient-to-r from-purple-500/15 to-purple-500/15 border border-purple-500/20 hover:border-purple-400 transition-all group"
                >
                  <div className="w-11 h-11 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    {isScanning ? <Loader2 className="w-5 h-5 text-purple-400 animate-spin" /> : 
                     <ScanLine className="w-5 h-5 text-purple-400" />}
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-cream font-bold">{isScanning ? "Scanning..." : "Scan with AI Vision"}</p>
                    <p className="text-[10px] text-cream/30 mt-0.5">{isScanning ? "Identifying Item..." : "Cards, Funko Pops, Figures & More"}</p>
                  </div>
                </button>
                <input ref={scanInputRef} type="file" accept="image/*" capture="environment" onChange={handleScanUpload} className="hidden" />

                {/* Status Message Area - כולל הצגת שגיאות ברורה */}
                {(priceStatus || scanError) && (
                  <div className={`mt-2 px-3 py-2.5 rounded-xl border flex items-center gap-2.5 ${
                    scanError ? 'bg-red-500/10 border-red-500/20 text-red-300' :
                    priceStatus?.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-300' :
                    priceStatus?.type === 'error' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' :
                    'bg-blue-500/10 border-blue-500/20 text-blue-300'
                  }`}>
                    {scanError ? <AlertCircle className="w-4 h-4" /> :
                     priceStatus?.type === 'success' ? <DollarSign className="w-4 h-4" /> :
                     priceStatus?.type === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                     <AlertCircle className="w-4 h-4" />}
                    <span className="text-xs font-semibold tracking-wide">{scanError || priceStatus?.msg}</span>
                  </div>
                )}

                {scannedImage && !isScanning && !scanError && name && !priceStatus && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <p className="text-xs text-green-300/80">
                      Identified: <span className="font-bold">{name}</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[10px] text-cream/20 font-semibold uppercase tracking-wider">or search manually</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              <div className="relative">
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
                  placeholder="Search Master Catalog..."
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-background-light text-cream placeholder:text-cream/25 focus:outline-none focus:ring-2 focus:ring-surface/30 transition-all"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cream/30" />
                
                {/* ── Suggestions Dropdown (הוחזר למקומו!) ──────────────── */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-charcoal-light rounded-2xl border border-white/10 overflow-hidden shadow-2xl max-h-60 overflow-y-auto">
                    {suggestions.map((s) => (
                      <button key={s.id} onClick={() => handleSelectSuggestion(s)} className="w-full p-3 flex items-center gap-3 hover:bg-white/5 text-left border-b border-white/5 transition-colors">
                        <img src={s.imageSmall} className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <p className="text-sm text-cream font-bold">{s.name}</p>
                          <p className="text-[10px] text-cream/40">{s.category}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="w-full px-4 py-3 rounded-2xl bg-background-light text-cream appearance-none focus:outline-none">
                  <option value="" disabled>Select a category</option>
                  {CATEGORIES.map((cat) => <option key={cat} value={cat} className="bg-charcoal-dark text-cream">{cat}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 px-5 pb-5 pt-3 border-t border-white/[0.06] flex-shrink-0">
              <button onClick={handleClose} className="px-5 py-3 rounded-2xl bg-background-light text-cream/40 font-bold text-sm hover:bg-charcoal-light/50 active:scale-[0.97] transition-all">Cancel</button>
              <button
                onClick={handleNextStep}
                disabled={!isStepOneValid}
                className={`flex-1 py-3 rounded-2xl font-bold text-sm active:scale-[0.97] transition-all ${isStepOneValid ? "bg-primary/20 text-primary hover:bg-primary/30" : "bg-background-light text-cream/20 cursor-not-allowed"}`}
              >
                Next
              </button>
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
                <div className="min-w-0">
                  <p className="text-sm font-bold text-cream truncate">Configure</p>
                  <p className="text-xs text-cream/35 truncate">{name}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
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