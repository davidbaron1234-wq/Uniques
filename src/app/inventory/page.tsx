"use client";

import { useState, useMemo, useEffect } from "react";
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
import EditProfileModal, { UserProfile } from "@/components/EditProfileModal";
import GrailsPickerModal from "@/components/GrailsPickerModal";
import { inventoryItems, currentUser } from "@/lib/data";
import { formatValue } from "@/lib/format";
import { CollectibleItem, Category } from "@/lib/types";
import {
  Plus,
  ArrowLeftRight,
  Crown,
  GripVertical,
  Star,
  DollarSign,
  TrendingUp,
  Package,
  Truck,
  CreditCard,
  Database,
  Edit3,
} from "lucide-react";

// ── localStorage keys ────────────────────────────────────────────────────
const STORAGE_INVENTORY = "uniques_inventory";
const STORAGE_PROFILE = "uniques_profile";
const STORAGE_GRAILS = "uniques_pinned_grails";

// ── Defaults ─────────────────────────────────────────────────────────────
const defaultProfile: UserProfile = {
  name: currentUser.name,
  bio: currentUser.bio || "",
  avatar: currentUser.avatar,
  joinDate: currentUser.memberSince || "2024-03-15",
};

// ── Loaders ──────────────────────────────────────────────────────────────
function loadInventory(): CollectibleItem[] {
  if (typeof window === "undefined") return inventoryItems;
  try {
    const saved = localStorage.getItem(STORAGE_INVENTORY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* corrupt data */ }
  return inventoryItems;
}

function loadProfile(): UserProfile {
  if (typeof window === "undefined") return defaultProfile;
  try {
    const saved = localStorage.getItem(STORAGE_PROFILE);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.name) return { ...defaultProfile, ...parsed };
    }
  } catch { /* corrupt data */ }
  return defaultProfile;
}

function loadPinnedGrails(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_GRAILS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* corrupt data */ }
  return [];
}

// ── Filter helper ────────────────────────────────────────────────────────
type QuickFilter = "All" | "Shoes" | "Cards" | "Figures" | "Funko" | "Coins" | "Comics";

function filterCategory(item: CollectibleItem, filter: QuickFilter): boolean {
  if (filter === "All") return true;
  if (filter === "Cards") return item.category === "Trading Cards";
  if (filter === "Figures") return item.category === "Figures";
  if (filter === "Funko") return item.category === "Funko Pop";
  if (filter === "Shoes") return item.category === "Shoes";
  if (filter === "Coins") return item.category === "Coins";
  if (filter === "Comics") return item.category === "Comics";
  return true;
}

// ── Sortable grid item ──────────────────────────────────────────────────
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
          src={item.customImage || item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {item.upForTrade && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary/90 flex items-center justify-center shadow-soft">
          <ArrowLeftRight className="w-2.5 h-2.5 text-charcoal-dark" />
        </div>
      )}

      {item.masterId && (
        <div className="absolute bottom-[2.75rem] right-1.5 w-4 h-4 rounded-full bg-surface/80 flex items-center justify-center">
          <Database className="w-2.5 h-2.5 text-white" />
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

// ── Trust stars ──────────────────────────────────────────────────────────
function TrustStars({ score }: { score: number }) {
  const fullStars = Math.floor(score);
  const hasHalf = score - fullStars >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < fullStars
              ? "text-yellow-400 fill-yellow-400"
              : i === fullStars && hasHalf
              ? "text-yellow-400 fill-yellow-400/50"
              : "text-cream/15"
          }`}
        />
      ))}
      <span className="text-xs text-cream/50 ml-1 font-semibold">{score.toFixed(1)}</span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// ██  PROFILE PAGE  ███████████████████████████████████████████████████████
// ═════════════════════════════════════════════════════════════════════════

export default function ProfilePage() {
  // ── Core state ─────────────────────────────────────────────────────────
  const [items, setItems] = useState<CollectibleItem[]>(inventoryItems);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [pinnedGrailIds, setPinnedGrailIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // ── UI state ──────────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showGrailsPicker, setShowGrailsPicker] = useState(false);
  const [activeFilter, setActiveFilter] = useState<QuickFilter>("All");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // ── Hydrate from localStorage on mount ─────────────────────────────────
  useEffect(() => {
    setItems(loadInventory());
    setProfile(loadProfile());
    setPinnedGrailIds(loadPinnedGrails());
    setHydrated(true);
  }, []);

  // ── Persist on change ──────────────────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_INVENTORY, JSON.stringify(items)); } catch { /* quota */ }
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile)); } catch { /* quota */ }
  }, [profile, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_GRAILS, JSON.stringify(pinnedGrailIds)); } catch { /* quota */ }
  }, [pinnedGrailIds, hydrated]);

  // ── Computed values ────────────────────────────────────────────────────
  const totalValue = useMemo(
    () => items.reduce((sum, item) => sum + (item.estimatedValue || 0), 0),
    [items]
  );

  const grails = useMemo(() => {
    // Start with pinned items (in order), filtering out any that were deleted
    const pinned = pinnedGrailIds
      .map((id) => items.find((i) => i.id === id))
      .filter((i): i is CollectibleItem => !!i);

    // Fill remaining slots (up to 3) with most expensive non-pinned items
    if (pinned.length < 3) {
      const pinnedSet = new Set(pinnedGrailIds);
      const byValue = [...items]
        .filter((i) => !pinnedSet.has(i.id))
        .sort((a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0));
      const remaining = byValue.slice(0, 3 - pinned.length);
      return [...pinned, ...remaining];
    }

    return pinned.slice(0, 3);
  }, [items, pinnedGrailIds]);

  const filteredItems = useMemo(
    () => items.filter((item) => filterCategory(item, activeFilter)),
    [items, activeFilter]
  );

  const linkedCount = useMemo(
    () => items.filter((i) => i.masterId).length,
    [items]
  );

  // ── Handlers ──────────────────────────────────────────────────────────
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
    customImage?: string;
    estimatedValue?: number;
    masterId?: string;
  }) => {
    const item: CollectibleItem = {
      id: `new-${Date.now()}`,
      masterId: newItem.masterId,
      name: newItem.name,
      category: newItem.category,
      imageUrl:
        newItem.imagePreview ||
        `https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=400&h=400&fit=crop&auto=format&q=80`,
      customImage: newItem.customImage,
      upForTrade: newItem.upForTrade,
      estimatedValue: newItem.estimatedValue,
    };
    setItems((prev) => [item, ...prev]);
  };

  const filters: QuickFilter[] = ["All", "Cards", "Funko", "Shoes", "Coins", "Comics", "Figures"];

  const memberDate = profile.joinDate
    ? new Date(profile.joinDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null;

  const hasPinnedGrails = pinnedGrailIds.length > 0;

  return (
    <div className="min-h-screen pb-20">
      <Header />

      <main className="max-w-lg mx-auto">
        {/* ── Profile Header ──────────────────────────────────── */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 border-2 border-primary/30 overflow-hidden flex-shrink-0">
              <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-cream truncate">{profile.name === "You" ? "My Profile" : profile.name}</h1>
                <button
                  onClick={() => setShowEditProfile(true)}
                  className="p-1 rounded-lg hover:bg-charcoal-light/50 transition-colors"
                  aria-label="Edit profile"
                >
                  <Edit3 className="w-3.5 h-3.5 text-cream/30" />
                </button>
              </div>
              {currentUser.trustScore !== undefined && (
                <TrustStars score={currentUser.trustScore} />
              )}
              {profile.bio && (
                <p className="text-xs text-cream/40 mt-1.5 leading-relaxed">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-2 mt-4">
            {currentUser.totalTrades !== undefined && (
              <div className="flex-1 px-3 py-2.5 rounded-2xl bg-background-light">
                <p className="text-[10px] text-cream/30 font-medium">Trades</p>
                <p className="text-sm text-cream font-bold">{currentUser.totalTrades}</p>
              </div>
            )}
            <div className="flex-1 px-3 py-2.5 rounded-2xl bg-background-light">
              <p className="text-[10px] text-cream/30 font-medium">Items</p>
              <p className="text-sm text-cream font-bold">{items.length}</p>
            </div>
            {memberDate && (
              <div className="flex-1 px-3 py-2.5 rounded-2xl bg-background-light">
                <p className="text-[10px] text-cream/30 font-medium">Member</p>
                <p className="text-sm text-cream font-bold">{memberDate}</p>
              </div>
            )}
          </div>

          {/* Preferences */}
          {(currentUser.deliveryPreference || currentUser.paymentPreference) && (
            <div className="mt-3 space-y-1.5">
              {currentUser.deliveryPreference && (
                <div className="flex items-center gap-2 text-cream/30">
                  <Truck className="w-3 h-3 flex-shrink-0" />
                  <span className="text-[10px] font-medium">{currentUser.deliveryPreference}</span>
                </div>
              )}
              {currentUser.paymentPreference && (
                <div className="flex items-center gap-2 text-cream/30">
                  <CreditCard className="w-3 h-3 flex-shrink-0" />
                  <span className="text-[10px] font-medium">{currentUser.paymentPreference}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Total Inventory Value ────────────────────────────── */}
        <div className="mx-5 mb-5 rounded-2xl bg-gradient-to-r from-primary/15 via-surface/10 to-primary/15 p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <p className="text-xs text-cream/50 font-semibold">Total Inventory Value</p>
              </div>
              <p className="text-2xl font-extrabold text-primary value-display">
                {formatValue(totalValue)}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-cream/30 mb-1">
                <DollarSign className="w-3 h-3" />
                <span className="text-[10px] font-medium">{items.length} items</span>
              </div>
              <div className="flex items-center gap-1 text-surface-light/50">
                <Database className="w-3 h-3" />
                <span className="text-[10px] font-medium">{linkedCount} catalog-linked</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Top 3 Grails ────────────────────────────────────── */}
        <div className="px-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-bold text-cream/80">Top 3 Grails</h2>
            {hasPinnedGrails && (
              <span className="text-[9px] text-yellow-400/50 font-medium ml-0.5">curated</span>
            )}
            <button
              onClick={() => setShowGrailsPicker(true)}
              className="ml-auto p-1.5 rounded-lg hover:bg-charcoal-light/50 transition-colors"
              aria-label="Manage grails"
            >
              <Edit3 className="w-3.5 h-3.5 text-cream/30" />
            </button>
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
                {pinnedGrailIds.includes(item.id) && (
                  <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-md bg-yellow-400/20">
                    <span className="text-[8px] text-yellow-400 font-bold">PINNED</span>
                  </div>
                )}
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={item.customImage || item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
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

        {/* ── Quick Filter ────────────────────────────────────── */}
        <div className="px-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-cream/50" />
            <h2 className="text-sm font-bold text-cream/80">Collection</h2>
          </div>
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

        {/* ── Sortable Grid ───────────────────────────────────── */}
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

      {/* ── Modals ──────────────────────────────────────────── */}
      <AddItemModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onAdd={handleAddItem} />
      <EditProfileModal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        profile={profile}
        onSave={setProfile}
      />
      <GrailsPickerModal
        isOpen={showGrailsPicker}
        onClose={() => setShowGrailsPicker(false)}
        items={items}
        pinnedIds={pinnedGrailIds}
        onSave={setPinnedGrailIds}
      />
      <BottomNav />
    </div>
  );
}
