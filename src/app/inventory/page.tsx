"use client";

import { useState } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import AddItemModal from "@/components/AddItemModal";
import { inventoryItems, categories } from "@/lib/data";
import { CollectibleItem, Category } from "@/lib/types";
import { Plus, Package, ArrowLeftRight } from "lucide-react";

export default function InventoryPage() {
  const [items, setItems] = useState<CollectibleItem[]>(inventoryItems);
  const [showAddModal, setShowAddModal] = useState(false);

  const itemsByCategory = categories.reduce(
    (acc, cat) => {
      const catItems = items.filter((item) => item.category === cat);
      if (catItems.length > 0) acc[cat] = catItems;
      return acc;
    },
    {} as Record<Category, CollectibleItem[]>
  );

  const handleAddItem = (newItem: {
    name: string;
    category: Category;
    upForTrade: boolean;
    imagePreview: string | null;
  }) => {
    const item: CollectibleItem = {
      id: `new-${Date.now()}`,
      name: newItem.name,
      category: newItem.category,
      imageUrl:
        newItem.imagePreview ||
        `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(newItem.name)}&backgroundColor=4A3535&shape1Color=CAE6CE&shape2Color=AA95C5&shape3Color=FCF9D5`,
      upForTrade: newItem.upForTrade,
    };
    setItems((prev) => [item, ...prev]);
  };

  return (
    <div className="min-h-screen pb-20">
      <Header />

      <main className="max-w-lg mx-auto">
        {/* Page title */}
        <div className="px-4 pt-5 pb-2">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-5 h-5 text-mint" />
            <h1 className="text-xl font-bold text-cream">Your Inventory!</h1>
          </div>
          <p className="text-sm text-cream/50">
            {items.length} items across {Object.keys(itemsByCategory).length} categories
          </p>
        </div>

        {/* Categories */}
        {Object.entries(itemsByCategory).map(([category, catItems], catIndex) => (
          <div
            key={category}
            className="mb-6 animate-slide-up"
            style={{
              animationDelay: `${catIndex * 0.08}s`,
              animationFillMode: "both",
            }}
          >
            {/* Category header */}
            <div className="px-4 py-2 flex items-center justify-between">
              <h2 className="text-sm font-bold text-lavender uppercase tracking-wider">
                {category}
              </h2>
              <span className="text-xs text-cream/40">{catItems.length} items</span>
            </div>

            {/* Item grid */}
            <div className="px-4 grid grid-cols-4 gap-2">
              {catItems.map((item) => (
                <div
                  key={item.id}
                  className="relative rounded-xl overflow-hidden border border-charcoal-light/30 bg-charcoal-dark/60 card-hover group"
                >
                  {/* Image */}
                  <div className="aspect-square bg-charcoal-light/20 overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Trade badge */}
                  {item.upForTrade && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-mint/90 flex items-center justify-center shadow-lg">
                      <ArrowLeftRight className="w-2.5 h-2.5 text-charcoal-dark" />
                    </div>
                  )}

                  {/* Name */}
                  <div className="px-1.5 py-1">
                    <p className="text-[9px] text-cream/70 truncate leading-tight">
                      {item.name}
                    </p>
                    {item.estimatedValue && (
                      <p className="text-[8px] text-mint/60 font-medium">
                        ${item.estimatedValue}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* Floating add button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-mint shadow-lg shadow-mint/20 flex items-center justify-center hover:bg-mint-dark active:scale-90 transition-all z-40 animate-bounce-soft"
        aria-label="Add new item"
      >
        <Plus className="w-7 h-7 text-charcoal-dark" strokeWidth={2.5} />
      </button>

      <AddItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddItem}
      />

      <BottomNav />
    </div>
  );
}
