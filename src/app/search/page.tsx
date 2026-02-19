"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import CardDetailModal from "@/components/CardDetailModal"; 
import ItemConfigForm, { ItemConfig } from "@/components/ItemConfigForm"; 
import { formatValue } from "@/lib/format";
import { MasterItem } from "@/lib/catalog/types";
import { CollectibleItem } from "@/lib/types";
import { CATEGORIES, Category } from "@/lib/constants";
import { Search, X, Loader2, Check, Save, ArrowLeft, AlertCircle } from "lucide-react";

const PAGE_SIZE = 50;

const SEARCH_FILTERS = ["All", ...CATEGORIES] as const;
type SearchFilter = (typeof SEARCH_FILTERS)[number];

function mapCatalogCategory(apiCategory: string): Category {
  const lower = apiCategory.toLowerCase();
  if (lower.includes("pokemon") || lower.includes("pokémon")) return "Pokémon TCG";
  if (lower.includes("sport") || lower.includes("baseball") || lower.includes("basketball") || lower.includes("football")) return "Sports Cards";
  if (lower.includes("magic") || lower.includes("mtg") || lower.includes("yu-gi-oh")) return "Other TCG";
  if (lower.includes("funko")) return "Funko Pop";
  if (lower.includes("lego")) return "Lego";
  if (lower.includes("sneaker") || lower.includes("shoe")) return "Sneakers";
  if (lower.includes("coin") || lower.includes("currency")) return "Coins";
  if (lower.includes("watch")) return "Watches";
  if (lower.includes("comic")) return "Comics";
  if (lower.includes("game") || lower.includes("console")) return "Video Games";
  return "Other"; 
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<SearchFilter>("All");
  const [results, setResults] = useState<MasterItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  const [viewItem, setViewItem] = useState<MasterItem | null>(null);
  const [addItem, setAddItem] = useState<MasterItem | null>(null);

  const [config, setConfig] = useState<ItemConfig>({
    askingPrice: undefined,
    condition: "Near Mint",
    status: "For Trade",
    notes: "",
    graded: false,
    gradeNum: "10",
    grader: "PSA",
    customImage: undefined
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localToast, setLocalToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

  const fetchResults = useCallback(
    async (searchQuery: string, category: string, pageNum: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams();
        if (searchQuery.length >= 2) params.set("q", searchQuery);
        if (category !== "All") params.set("category", category);
        params.set("page", String(pageNum));
        params.set("pageSize", String(PAGE_SIZE));

        const res = await fetch(`/api/catalog/search?${params.toString()}`);
        if (!res.ok) throw new Error("Search failed");

        const data = await res.json();

        if (append) {
          setResults((prev) => [...prev, ...data.items]);
        } else {
          setResults(data.items);
        }
        setTotal(data.total);
        setPage(data.page);
        setTotalPages(data.totalPages);
      } catch {
        // error handling
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setInitialLoad(false);
      }
    },
    []
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(query, selectedCategory, 1, false);
    }, query.length === 0 ? 0 : 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selectedCategory, fetchResults]);

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      fetchResults(query, selectedCategory, page + 1, true);
    }
  };

  const handleStartAdd = (item: MasterItem) => {
    setViewItem(null);
    setAddItem(item);
    setConfig({
        askingPrice: item.marketPrice,
        condition: "Near Mint",
        status: "For Trade",
        notes: "",
        graded: false,
        gradeNum: "10",
        grader: "PSA",
        customImage: undefined // איפוס תמונה מהעלאה קודמת
    });
  };

  const handleSaveToInventory = () => {
    if (!addItem) return;
    
    try {
        const newItem: CollectibleItem = {
            id: `new-${Date.now()}`,
            masterId: addItem.id,
            name: addItem.name,
            category: mapCatalogCategory(addItem.category),
            imageUrl: addItem.imageLarge || addItem.imageSmall,
            
            // ✅ המחיר נשמר כאן מהטופס
            estimatedValue: config.askingPrice, 
            
            condition: config.condition,
            status: config.status,
            upForTrade: config.status === "For Trade",
            notes: config.notes,
            graded: config.graded,
            grader: config.graded ? config.grader : undefined,
            gradeNum: config.graded ? config.gradeNum : undefined,
            year: config.year,
            pieces: config.pieces,
            
            // ✅ כאן נכנסת התמונה המכווצת שבנינו בתיקון הקודם
            customImage: config.customImage 
        };

        const currentInventoryString = localStorage.getItem("uniques_inventory");
        const currentInventory = currentInventoryString ? JSON.parse(currentInventoryString) : [];
        
        // שמירה ל-LocalStorage
        localStorage.setItem("uniques_inventory", JSON.stringify([newItem, ...currentInventory]));

        setAddItem(null);
        setLocalToast({ msg: `${addItem.name} added successfully!`, type: 'success' });
        setTimeout(() => setLocalToast(null), 3000);

    } catch (e) {
        // ✅ אם הגענו לכאן, כנראה שגם הכיווץ לא הספיק (יותר מדי פריטים בזיכרון)
        console.error("LocalStorage Save error:", e);
        setLocalToast({ msg: "Memory full! Try removing old items or a smaller image.", type: 'error' });
        setTimeout(() => setLocalToast(null), 5000);
    }
  };

  const hasMore = page < totalPages;

  return (
    <div className="min-h-screen pb-20 bg-charcoal-dark">
      <Header />

      <main className="max-w-lg mx-auto">
        <div className="px-5 pt-6 pb-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cream/30" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 5,000+ collectibles..."
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-background-light text-cream placeholder:text-cream/25 focus:outline-none focus:ring-2 focus:ring-surface/30 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-charcoal-light/50"
              >
                <X className="w-4 h-4 text-cream/30" />
              </button>
            )}
          </div>
        </div>

        <div className="px-5 pb-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {SEARCH_FILTERS.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-surface/25 text-surface-light shadow-glow-surface"
                    : "bg-background-light text-cream/35 hover:text-cream/60"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pb-4">
          {!initialLoad && (
            <p className="text-xs text-cream/30 mb-3 font-medium">
              {total.toLocaleString()} result{total !== 1 ? "s" : ""}
            </p>
          )}

          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-surface-light/50 animate-spin" />
            </div>
          )}

          {!loading && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {results.map((item, i) => (
                  <button
                    key={item.id}
                    onClick={() => setViewItem(item)}
                    className="rounded-2xl overflow-hidden bg-background-light shadow-soft card-hover group animate-scale-in text-left"
                    style={{ animationDelay: `${Math.min(i, 20) * 0.03}s`, animationFillMode: "both" }}
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={item.imageSmall}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs text-cream/80 truncate font-medium">{item.name}</p>
                      {item.marketPrice > 0 && (
                        <p className="text-[10px] text-primary/70 font-semibold mt-0.5">
                          {formatValue(item.marketPrice)}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-6 py-3 rounded-2xl bg-surface/15 text-surface-light text-sm font-semibold hover:bg-surface/25 active:scale-[0.97] transition-all disabled:opacity-50"
                  >
                    {loadingMore ? "Loading..." : `Load More (${results.length} of ${total.toLocaleString()})`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <CardDetailModal
        item={viewItem}
        onClose={() => setViewItem(null)}
        onAdd={() => viewItem && handleStartAdd(viewItem)}
      />

      {addItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-fade-in" onClick={() => setAddItem(null)} />
            
            <div className="relative w-full max-w-md bg-charcoal-dark rounded-3xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up border border-white/10 shadow-2xl">
                <div className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.06] bg-charcoal-dark z-10">
                    <button onClick={() => setAddItem(null)} className="p-1.5 rounded-xl hover:bg-charcoal-light transition-colors">
                        <ArrowLeft className="w-5 h-5 text-cream/50" />
                    </button>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <img src={addItem.imageSmall} alt={addItem.name} className="w-9 h-9 rounded-lg object-cover" />
                        <div className="min-w-0">
                            <p className="text-[10px] text-cream/40 font-bold uppercase tracking-wider">Add Collection</p>
                            <h2 className="text-sm font-bold text-cream truncate">{addItem.name}</h2>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                    <ItemConfigForm 
                        config={config} 
                        onChange={setConfig} 
                        category={mapCatalogCategory(addItem.category)}
                    />
                </div>

                <div className="p-5 border-t border-white/[0.06] bg-charcoal-dark pb-8 sm:pb-5 flex gap-3">
                    <button onClick={() => setAddItem(null)} className="px-6 py-3 rounded-2xl bg-white/5 text-cream font-bold hover:bg-white/10 transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveToInventory}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/20 text-primary font-bold hover:bg-primary/30 active:scale-95 transition-all shadow-glow-primary"
                    >
                        <Save className="w-4 h-4" />
                        Save to Collection
                    </button>
                </div>
            </div>
        </div>
      )}

      {localToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] animate-slide-up">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border backdrop-blur-md shadow-lg ${localToast.type === 'error' ? 'bg-red-500/15 border-red-500/25 text-red-300' : 'bg-green-500/15 border-green-500/25 text-green-300'}`}>
            {localToast.type === 'error' ? <AlertCircle className="w-4 h-4"/> : <Check className="w-4 h-4"/>}
            <span className="text-sm font-semibold">{localToast.msg}</span>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}