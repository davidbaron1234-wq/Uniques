"use client";

import { useState, useMemo } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { inventoryItems, categories } from "@/lib/data";
import { Category } from "@/lib/types";
import { Search, ArrowLeftRight, X } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | "All">("All");
  const [tradeOnly, setTradeOnly] = useState(false);

  const filteredItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;
      const matchesTrade = !tradeOnly || item.upForTrade;
      return matchesQuery && matchesCategory && matchesTrade;
    });
  }, [query, selectedCategory, tradeOnly]);

  return (
    <div className="min-h-screen pb-20">
      <Header />

      <main className="max-w-lg mx-auto">
        {/* Search bar */}
        <div className="px-4 pt-5 pb-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cream/40" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search collectibles..."
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-charcoal-dark/80 border border-charcoal-light/40 text-cream placeholder:text-cream/30 focus:outline-none focus:border-lavender/60 focus:ring-1 focus:ring-lavender/30 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-charcoal-light/50"
              >
                <X className="w-4 h-4 text-cream/40" />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 pb-3 space-y-2">
          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {["All", ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat as Category | "All")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-lavender/25 text-lavender border border-lavender/40"
                    : "bg-charcoal-dark/60 text-cream/50 border border-charcoal-light/30 hover:text-cream/70"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Trade toggle */}
          <button
            onClick={() => setTradeOnly(!tradeOnly)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              tradeOnly
                ? "bg-mint/20 text-mint border border-mint/40"
                : "bg-charcoal-dark/60 text-cream/50 border border-charcoal-light/30 hover:text-cream/70"
            }`}
          >
            <ArrowLeftRight className="w-3 h-3" />
            Up for Trade only
          </button>
        </div>

        {/* Results */}
        <div className="px-4 pb-4">
          <p className="text-xs text-cream/40 mb-3">{filteredItems.length} results</p>

          <div className="grid grid-cols-3 gap-2.5">
            {filteredItems.map((item, i) => (
              <div
                key={item.id}
                className="rounded-xl overflow-hidden border border-charcoal-light/30 bg-charcoal-dark/60 card-hover group animate-scale-in"
                style={{
                  animationDelay: `${i * 0.03}s`,
                  animationFillMode: "both",
                }}
              >
                <div className="relative aspect-square bg-charcoal-light/20 overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {item.upForTrade && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-mint/90 flex items-center justify-center shadow-lg">
                      <ArrowLeftRight className="w-2.5 h-2.5 text-charcoal-dark" />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs text-cream/80 truncate font-medium">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-lavender/70 mt-0.5">{item.category}</p>
                  {item.estimatedValue && (
                    <p className="text-[10px] text-mint/60 font-medium mt-0.5">
                      ${item.estimatedValue}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-charcoal-light/30 flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-cream/30" />
              </div>
              <p className="text-cream/50 font-medium">No items found</p>
              <p className="text-cream/30 text-sm mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
