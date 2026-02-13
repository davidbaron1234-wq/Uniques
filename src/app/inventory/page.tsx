"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import AddItemModal from "@/components/AddItemModal";
import { inventoryItems } from "@/lib/data";
import { formatValue } from "@/lib/format";
import { CollectibleItem, Category } from "@/lib/types";
import { Plus, Package, ArrowLeftRight, Crown, GripVertical } from "lucide-react";

type QuickFilter = "All" | "Shoes" | "Cards" | "Figures" | "Funko";

function filterCategory(item: CollectibleItem, filter: QuickFilter): boolean {
  if (filter === "All") return true;
  if (filter === "Cards") return item.category === "Trading Cards";
  if (filter === "Figures") return item.category === "Figures";
  if (filter === "Funko") return item.category === "Funko Pop";
  if (filter === "Shoes") return item.category === "Shoes";
  return true;
}

function SortableItem({ item }: { item: CollectibleItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative rounded-2xl overflow-hidden bg-background-light shadow-soft group"
    >
      <button
        {...attributes}
        {...listeners}
        className="absolute top-1.5 left-1.5 z-10 w-6 h-6 rounded-lg bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-3.5 h-3.5 text-white/70" />
      </button>

      <div className="aspect-square bg-charcoal-light/20 overflow-hidden">
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {item.upForTrade && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary/90 flex items-center justify-center shadow-soft">
          <ArrowLeftRight className="w-2.5 h-2.5 text-charcoal-dark" />
        </div>
      )}

      <div className="px-2 py-1.5">
        <p className="text-[10px] text-cream/80 truncate leading-tight font-medium">
          {item.name}
        </p>
        {item.estimatedValue && (
          <p className="text-[9px] text-primary/70 font-semibold mt-0.5">
            {formatValue(item.estimatedValue)}
          </p>
        )}
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [items, setItems] = useState<CollectibleItem[]>(inventoryItems);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<QuickFilter>("All");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const grails = useMemo(
    () =>
      [...items]
        .sort((a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0))
        .slice(0, 3),
    [items]
  );

  const filteredItems = useMemo(
    () => items.filter((item) => filterCategory(item, activeFilter)),
    [items, activeFilter]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleAddItem = (newItem: {
    name: string;
    category: Category;
    upForTrade: boolean;
    imagePreview: string | null;
    estimatedValue?: number;
  }) => {
    const item: CollectibleItem = {
      id: `new-${Date.now()}`,
      name: newItem.name,
      category: newItem.category,
      imageUrl:
        newItem.imagePreview ||
        `https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=400&h=400&fit=crop&auto=format&q=80`,
      upForTrade: newItem.upForTrade,
      estimatedValue: newItem.estimatedValue,
    };
    setItems((prev) => [item, ...prev]);
  };

  const filters: QuickFilter[] = ["All", "Cards", "Funko", "Shoes", "Figures"];

  return (
    <div className="min-h-screen pb-20">
      <Header />

      <main className="max-w-lg mx-auto">
        {/* Title */}
        <div className="px-5 pt-6 pb-3">
          <div className="flex items-center gap-2.5 mb-1">
            <Package className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-cream">Your Inventory!</h1>
          </div>
          <p className="text-sm text-cream/40 font-medium">
            {items.length} items in your collection
          </p>
        </div>

        {/* Top 3 Grails */}
        <div className="px-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-bold text-cream/80">Top 3 Grails</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {grails.map((item, i) => (
              <div
                key={item.id}
                className="flex-shrink-0 w-40 rounded-2xl overflow-hidden bg-background-light shadow-soft-lg animate-scale-in relative"
                style={{ animationDelay: `${i * 0.1}s`, animationFillMode: "both" }}
              >
                <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-yellow-400/90 flex items-center justify-center shadow-soft">
                  <span className="text-xs font-extrabold text-charcoal-dark">{i + 1}</span>
                </div>
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-2.5">
                  <p className="text-xs text-cream/90 font-semibold truncate">{item.name}</p>
                  <p className="text-xs text-primary font-bold mt-0.5">{formatValue(item.estimatedValue || 0)}</p>
                  <p className="text-[10px] text-surface-light/60 mt-0.5">{item.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Filter */}
        <div className="px-5 mb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeFilter === f
                    ? "bg-surface/25 text-surface-light shadow-glow-surface"
                    : "bg-background-light text-cream/40 hover:text-cream/60"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Sortable Grid */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredItems.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="px-5 grid grid-cols-3 gap-3 pb-6">
              {filteredItems.map((item) => (
                <SortableItem key={item.id} item={item} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="w-10 h-10 text-cream/20 mb-3" />
            <p className="text-cream/40 font-medium text-sm">No items in this category</p>
          </div>
        )}
      </main>

      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-primary shadow-soft-lg shadow-primary/20 flex items-center justify-center hover:bg-primary-dark active:scale-90 transition-all z-40 animate-bounce-soft"
        aria-label="Add new item"
      >
        <Plus className="w-7 h-7 text-charcoal-dark" strokeWidth={2.5} />
      </button>

      <AddItemModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onAdd={handleAddItem} />
      <BottomNav />
    </div>
  );
}
