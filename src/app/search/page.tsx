"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import CardDetailModal from "@/components/CardDetailModal";
import { formatValue } from "@/lib/format";
import { MasterItem } from "@/lib/catalog/types";
import { useInventory } from "@/lib/InventoryContext";
import { CATEGORIES } from "@/lib/constants";
import { Search, X, Loader2, Check } from "lucide-react";

const PAGE_SIZE = 50;

const SEARCH_FILTERS = ["All", ...CATEGORIES] as const;
type SearchFilter = (typeof SEARCH_FILTERS)[number];

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
  const [selectedItem, setSelectedItem] = useState<MasterItem | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast, clearToast } = useInventory();

  // Fetch results from the catalog API
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
        // On error, keep existing results
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setInitialLoad(false);
      }
    },
    []
  );

  // Debounced search on query or category change
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

  const hasMore = page < totalPages;

  return (
    <div className="min-h-screen pb-20">
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
          {/* Results count */}
          {!initialLoad && (
            <p className="text-xs text-cream/30 mb-3 font-medium">
              {total.toLocaleString()} result{total !== 1 ? "s" : ""}
              {query.length >= 2 && <span className="text-cream/20"> for &ldquo;{query}&rdquo;</span>}
            </p>
          )}

          {/* Loading spinner for initial/filter changes */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-surface-light/50 animate-spin" />
            </div>
          )}

          {/* Results grid */}
          {!loading && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {results.map((item, i) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
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
                      {item.set && (
                        <p className="text-[10px] text-surface-light/50 mt-0.5 truncate">{item.set}</p>
                      )}
                      {item.rarity && (
                        <p className="text-[9px] text-cream/25 mt-0.5">{item.rarity}</p>
                      )}
                      {item.marketPrice > 0 && (
                        <p className="text-[10px] text-primary/70 font-semibold mt-0.5">
                          {formatValue(item.marketPrice)}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Load More button */}
              {hasMore && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-6 py-3 rounded-2xl bg-surface/15 text-surface-light text-sm font-semibold hover:bg-surface/25 active:scale-[0.97] transition-all disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      `Load More (${results.length} of ${total.toLocaleString()})`
                    )}
                  </button>
                </div>
              )}

              {/* Empty state */}
              {results.length === 0 && !initialLoad && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-background-light flex items-center justify-center mb-4 shadow-soft">
                    <Search className="w-8 h-8 text-cream/20" />
                  </div>
                  <p className="text-cream/40 font-medium">No items found</p>
                  <p className="text-cream/25 text-sm mt-1">Try adjusting your search or filters</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Card Detail Modal */}
      <CardDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] animate-slide-up">
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-green-500/15 border border-green-500/25 backdrop-blur-md shadow-lg cursor-pointer"
            onClick={clearToast}
          >
            <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
            <span className="text-sm text-green-300 font-semibold">{toast}</span>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
