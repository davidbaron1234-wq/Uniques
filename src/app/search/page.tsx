"use client";

import { useState, useMemo } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { inventoryItems, categories } from "@/lib/data";
import { formatValue } from "@/lib/format";
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
        <div className="px-5 pt-6 pb-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cream/30" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search collectibles..."
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

        <div className="px-5 pb-3 space-y-2.5">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {["All", ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat as Category | "All")}
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

          <button
            onClick={() => setTradeOnly(!tradeOnly)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              tradeOnly
                ? "bg-primary/20 text-primary shadow-glow"
                : "bg-background-light text-cream/35 hover:text-cream/60"
            }`}
          >
            <ArrowLeftRight className="w-3 h-3" />
            Up for Trade only
          </button>
        </div>

        <div className="px-5 pb-4">
          <p className="text-xs text-cream/30 mb-3 font-medium">{filteredItems.length} results</p>

          <div className="grid grid-cols-3 gap-3">
            {filteredItems.map((item, i) => (
              <div
                key={item.id}
                className="rounded-2xl overflow-hidden bg-background-light shadow-soft card-hover group animate-scale-in"
                style={{ animationDelay: `${i * 0.03}s`, animationFillMode: "both" }}
              >
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {item.upForTrade && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary/90 flex items-center justify-center shadow-soft">
                      <ArrowLeftRight className="w-2.5 h-2.5 text-charcoal-dark" />
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-xs text-cream/80 truncate font-medium">{item.name}</p>
                  <p className="text-[10px] text-surface-light/50 mt-0.5">{item.category}</p>
                  {item.estimatedValue && (
                    <p className="text-[10px] text-primary/70 font-semibold mt-0.5">
                      {formatValue(item.estimatedValue)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-background-light flex items-center justify-center mb-4 shadow-soft">
                <Search className="w-8 h-8 text-cream/20" />
              </div>
              <p className="text-cream/40 font-medium">No items found</p>
              <p className="text-cream/25 text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
