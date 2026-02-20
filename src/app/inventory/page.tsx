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
import { useInventory } from "@/lib/InventoryContext";
import AddItemModal from "@/components/AddItemModal";
import EditProfileModal, { UserProfile } from "@/components/EditProfileModal";
import GrailsPickerModal from "@/components/GrailsPickerModal";
import ReviewsListModal from "@/components/ReviewsListModal";
import ItemConfigForm, { ItemConfig } from "@/components/ItemConfigForm";
import MarketplaceModal from "@/components/MarketplaceModal";
import { inventoryItems, currentUser } from "@/lib/data";
import { formatValue } from "@/lib/format";
import { CollectibleItem, Category, ItemCondition, ItemStatus } from "@/lib/types";
import { CATEGORIES } from "@/lib/constants";
import {
  Plus,
  ArrowLeftRight,
  Crown,
  GripVertical,
  Star,
  DollarSign,
  TrendingUp,
  Package,
  Database,
  Edit3,
  X,
  Save,
  Trash2,
  ChevronLeft,
  Shield,
  Tag,
  Award,
  BarChart3,
  Lock,
  Unlock,
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
const PROFILE_FILTERS = ["All", "In Trade", ...CATEGORIES] as const;
type ProfileFilter = (typeof PROFILE_FILTERS)[number];

// ── Sortable grid item ──────────────────────────────────────────────────
function SortableItem({ item, onTap }: { item: CollectibleItem; onTap: () => void }) {
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
      className="relative rounded-2xl overflow-hidden bg-background-light shadow-soft group cursor-pointer"
      onClick={onTap}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
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

      {item.isLocked ? (
        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-amber-500/90 flex items-center justify-center shadow-soft">
          <span className="text-[7px] font-bold text-charcoal-dark leading-none">IN TRADE</span>
        </div>
      ) : item.upForTrade && (
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
function TrustStars({ score, reviewCount, onClick }: { score: number; reviewCount?: number; onClick?: () => void }) {
  const fullStars = Math.floor(score);
  const hasHalf = score - fullStars >= 0.5;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-0.5 hover:opacity-80 transition-opacity"
    >
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
      {reviewCount !== undefined && (
        <span className="text-[10px] text-cream/30 ml-0.5">({reviewCount} reviews)</span>
      )}
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// ██  PROFILE PAGE  ███████████████████████████████████████████████████████
// ═════════════════════════════════════════════════════════════════════════

export default function ProfilePage() {
  const { unlockItems } = useInventory();
  const [items, setItems] = useState<CollectibleItem[]>(inventoryItems);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [pinnedGrailIds, setPinnedGrailIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showGrailsPicker, setShowGrailsPicker] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ProfileFilter>("All");
  const [editingItem, setEditingItem] = useState<CollectibleItem | null>(null);
  const [viewMode, setViewMode] = useState(true);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [editConfig, setEditConfig] = useState<ItemConfig>({
    askingPrice: undefined,
    condition: "Near Mint",
    status: "For Trade",
    notes: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    setItems(loadInventory());
    setProfile(loadProfile());
    setPinnedGrailIds(loadPinnedGrails());
    setHydrated(true);
  }, []);

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

  const totalValue = useMemo(
    () => items.reduce((sum, item) => sum + (item.estimatedValue || 0), 0),
    [items]
  );

  const grails = useMemo(() => {
    const pinned = pinnedGrailIds
      .map((id) => items.find((i) => i.id === id))
      .filter((i): i is CollectibleItem => !!i);

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

  const filteredItems = useMemo(() => {
    if (activeFilter === "All")      return items;
    if (activeFilter === "In Trade") return items.filter((item) => item.isLocked === true);
    return items.filter((item) => item.category === activeFilter);
  }, [items, activeFilter]);

  const linkedCount = useMemo(
    () => items.filter((i) => i.masterId).length,
    [items]
  );

  const lockedCount = useMemo(
    () => items.filter((i) => i.isLocked).length,
    [items]
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
      condition: (newItem.condition as ItemCondition) || undefined,
      status: (newItem.status as ItemStatus) || undefined,
      notes: newItem.notes,
      graded: newItem.graded,
      grader: newItem.grader,
      gradeNum: newItem.gradeNum,
      year: newItem.year,
      pieces: newItem.pieces
    };
    setItems((prev) => [item, ...prev]);
  };

  const handleViewItem = (item: CollectibleItem) => {
    setEditingItem(item);
    setViewMode(true);
    setEditConfig({
      askingPrice: item.estimatedValue,
      condition: item.condition || "Near Mint",
      status: item.status || "For Trade",
      notes: item.notes || "",
      customImage: item.customImage,
      graded: item.graded,
      grader: item.grader,
      gradeNum: item.gradeNum,
      year: item.year,
      pieces: item.pieces
    });
  };

  const handleStartEdit = () => {
    setViewMode(false);
  };

  // 🔥 כאן היה חלק מהאדום - הוספתי "as ItemCondition" כדי לסדר את זה
  const handleSaveEdit = () => {
    if (!editingItem) return;
    setItems((prev) =>
      prev.map((i) =>
        i.id === editingItem.id
          ? {
              ...i,
              estimatedValue: editConfig.askingPrice,
              condition: editConfig.condition as ItemCondition,
              status: editConfig.status as ItemStatus,
              upForTrade: editConfig.status === "For Trade",
              notes: editConfig.notes || undefined,
              customImage: editConfig.customImage,
              graded: editConfig.graded,
              grader: editConfig.grader,
              gradeNum: editConfig.gradeNum,
              year: editConfig.year,
              pieces: editConfig.pieces
            }
          : i
      )
    );
    setEditingItem(null);
  };

  const handleDeleteItem = () => {
    if (!editingItem) return;
    setItems((prev) => prev.filter((i) => i.id !== editingItem.id));
    setEditingItem(null);
  };

  const handleCancelOffer = () => {
    if (!editingItem) return;
    // Unlock in context (persists to localStorage) and in local state
    unlockItems([editingItem.id]);
    setItems((prev) =>
      prev.map((i) => (i.id === editingItem.id ? { ...i, isLocked: false } : i))
    );
    setEditingItem((prev) => prev ? { ...prev, isLocked: false } : null);
  };

  const filters = PROFILE_FILTERS;

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
                <button onClick={() => setShowEditProfile(true)} className="p-1 rounded-lg hover:bg-charcoal-light/50 transition-colors">
                  <Edit3 className="w-3.5 h-3.5 text-cream/30" />
                </button>
              </div>
              {currentUser.trustScore !== undefined && (
                <TrustStars score={currentUser.trustScore} reviewCount={6} onClick={() => setShowReviews(true)} />
              )}
              {profile.bio && <p className="text-xs text-cream/40 mt-1.5 leading-relaxed">{profile.bio}</p>}
            </div>
          </div>

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
        </div>

        {/* ── Total Value ─────────────────────────────────────── */}
        <div className="mx-5 mb-5 rounded-2xl bg-gradient-to-r from-primary/15 via-surface/10 to-primary/15 p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <p className="text-xs text-cream/50 font-semibold">Total Inventory Value</p>
              </div>
              <p className="text-2xl font-extrabold text-primary value-display">{formatValue(totalValue)}</p>
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
            {hasPinnedGrails && <span className="text-[9px] text-yellow-400/50 font-medium ml-0.5">curated</span>}
            <button onClick={() => setShowGrailsPicker(true)} className="ml-auto p-1.5 rounded-lg hover:bg-charcoal-light/50 transition-colors">
              <Edit3 className="w-3.5 h-3.5 text-cream/30" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {grails.map((item, i) => (
              <div key={item.id} className="flex-shrink-0 w-40 rounded-2xl overflow-hidden bg-background-light shadow-soft-lg animate-scale-in relative" style={{ animationDelay: `${i * 0.1}s`, animationFillMode: "both" }}>
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

        {/* ── Filters ────────────────────────────────────────── */}
        <div className="px-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-cream/50" />
            <h2 className="text-sm font-bold text-cream/80">Collection</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-none">
            {filters.map((f) => {
              const isInTrade = f === "In Trade";
              const isActive = activeFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isInTrade && isActive
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : isInTrade && !isActive
                      ? "bg-background-light text-amber-400/60 hover:text-amber-400"
                      : isActive
                      ? "bg-surface/25 text-surface-light shadow-glow-surface"
                      : "bg-background-light text-cream/40 hover:text-cream/60"
                  }`}
                >
                  {f}
                  {isInTrade && lockedCount > 0 && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? "bg-amber-500/30 text-amber-300" : "bg-amber-500/20 text-amber-400"
                    }`}>
                      {lockedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── "In Trade" dedicated list view ─────────────────── */}
        {activeFilter === "In Trade" ? (
          <div className="px-5 pb-6">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
                  <Lock className="w-7 h-7 text-amber-400/50" />
                </div>
                <p className="text-cream/40 font-medium text-sm">No items in trade</p>
                <p className="text-cream/25 text-xs mt-1 max-w-[200px] leading-relaxed">
                  When you send a trade offer, those items will appear here so you always know where they are.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-[11px] text-amber-400/60 font-semibold uppercase tracking-wider mb-3">
                  {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""} pending · tap to cancel
                </p>
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleViewItem(item)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-background-light border border-amber-500/15 hover:border-amber-500/30 transition-colors text-left"
                  >
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                      <img
                        src={item.customImage || item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-amber-500/20" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-cream truncate">{item.name}</p>
                      <p className="text-xs text-amber-400/70 mt-0.5 truncate">
                        {item.lockedNote ?? "Pending trade offer"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {item.estimatedValue != null && (
                        <span className="text-xs font-bold text-primary">{formatValue(item.estimatedValue)}</span>
                      )}
                      <span className="text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded font-bold">
                        PENDING
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ── Normal DnD grid ──────────────────────────────── */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredItems.map((i) => i.id)} strategy={rectSortingStrategy}>
                <div className="px-5 grid grid-cols-3 gap-3 pb-6">
                  {filteredItems.map((item) => (
                    <SortableItem key={item.id} item={item} onTap={() => handleViewItem(item)} />
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
          </>
        )}
      </main>

      <button onClick={() => setShowAddModal(true)} className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-primary shadow-soft-lg shadow-primary/20 flex items-center justify-center hover:bg-primary-dark active:scale-90 transition-all z-40 animate-bounce-soft">
        <Plus className="w-7 h-7 text-charcoal-dark" strokeWidth={2.5} />
      </button>

      {/* ── Modals ──────────────────────────────────────────── */}
      <AddItemModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onAdd={handleAddItem} />
      <EditProfileModal isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} profile={profile} onSave={setProfile} />
      <GrailsPickerModal isOpen={showGrailsPicker} onClose={() => setShowGrailsPicker(false)} items={items} pinnedIds={pinnedGrailIds} onSave={setPinnedGrailIds} />
      <ReviewsListModal isOpen={showReviews} onClose={() => setShowReviews(false)} userName={profile.name} trustScore={currentUser.trustScore || 4.8} />

      {/* ── Item Detail Modal ───────────────────────────────── */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-fade-in" onClick={() => setEditingItem(null)} />
          <div className="relative w-full max-w-md bg-charcoal-dark rounded-3xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up">
            <button onClick={() => setEditingItem(null)} className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors">
              <X className="w-4.5 h-4.5 text-white/80" />
            </button>

            {viewMode ? (
              <>
                <div className="flex-1 overflow-y-auto overscroll-contain">
                  <div className="relative flex items-center justify-center px-6 pt-6 pb-3">
                    <img src={editingItem.customImage || editingItem.imageUrl} alt={editingItem.name} className="relative max-h-[42vh] w-auto max-w-full object-contain drop-shadow-2xl" />
                  </div>
                  <div className="px-5 pb-5 pt-2 space-y-3.5">
                    <div>
                      <h2 className="text-lg font-bold text-cream leading-snug">{editingItem.name}</h2>
                      <p className="text-sm text-cream/40 mt-0.5">{editingItem.category}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editingItem.isLocked && (
                        <div className="flex items-start gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 w-full">
                          <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-bold text-amber-400">In Trade · Pending</span>
                            {editingItem.lockedNote && (
                              <p className="text-[11px] text-amber-400/70 mt-0.5 leading-snug">{editingItem.lockedNote}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {editingItem.graded && editingItem.gradeNum ? (
                         <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                           <Award className="w-3.5 h-3.5 text-purple-400" />
                           <span className="text-xs font-bold text-purple-400">{editingItem.grader} {editingItem.gradeNum}</span>
                         </div>
                      ) : editingItem.condition && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                          <Shield className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-xs font-bold text-blue-400">{editingItem.condition}</span>
                        </div>
                      )}
                      {editingItem.status && (
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${editingItem.status === "For Trade" ? "bg-primary/10 border-primary/25" : "bg-white/5 border-white/10"}`}>
                          <Tag className={`w-3.5 h-3.5 ${editingItem.status === "For Trade" ? "text-primary" : "text-cream/35"}`} />
                          <span className={`text-xs font-bold ${editingItem.status === "For Trade" ? "text-primary" : "text-cream/45"}`}>{editingItem.status}</span>
                        </div>
                      )}
                    </div>
                    {editingItem.estimatedValue && editingItem.estimatedValue > 0 && (
                      <div className="rounded-2xl bg-green-500/8 border border-green-500/20 p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <DollarSign className="w-4 h-4 text-green-400" />
                          <span className="text-[11px] text-cream/35 font-semibold uppercase tracking-wider">Asking Price</span>
                        </div>
                        <p className="text-3xl font-bold text-green-400">{formatValue(editingItem.estimatedValue)}</p>
                      </div>
                    )}
                    {editingItem.notes && (
                      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
                        <p className="text-[11px] text-cream/30 font-semibold uppercase tracking-wider mb-2">Notes</p>
                        <p className="text-sm text-cream/60 leading-relaxed">{editingItem.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 px-5 pb-5 pt-3 border-t border-white/[0.06] flex-shrink-0">
                  <button onClick={handleDeleteItem} className="flex items-center justify-center px-3.5 py-3 rounded-2xl bg-red-500/10 text-red-400 font-bold text-sm hover:bg-red-500/20 active:scale-[0.97] transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {editingItem.isLocked ? (
                    <button
                      onClick={handleCancelOffer}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-500/15 text-amber-400 font-bold text-sm hover:bg-amber-500/25 active:scale-[0.97] transition-all"
                    >
                      <Unlock className="w-4 h-4" />
                      Cancel Offer
                    </button>
                  ) : (
                    <>
                      <button onClick={() => setShowMarketplace(true)} className="flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-2xl bg-surface/10 text-surface-light/60 font-bold text-sm hover:bg-surface/20 active:scale-[0.97] transition-all">
                        <BarChart3 className="w-4 h-4" />
                        Market
                      </button>
                      <button onClick={handleStartEdit} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/20 text-primary font-bold text-sm hover:bg-primary/30 active:scale-[0.97] transition-all">
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
                  <button onClick={() => setViewMode(true)} className="p-1.5 rounded-xl hover:bg-charcoal-light/50 transition-colors">
                    <ChevronLeft className="w-5 h-5 text-cream/50" />
                  </button>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <img src={editingItem.customImage || editingItem.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-cream truncate">Edit Item</p>
                      <p className="text-xs text-cream/35 truncate">{editingItem.name}</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain p-5">
                  <ItemConfigForm config={editConfig} onChange={setEditConfig} category={editingItem.category} />
                </div>
                <div className="flex gap-3 px-5 pb-5 pt-3 border-t border-white/[0.06] flex-shrink-0">
                  <button onClick={() => setViewMode(true)} className="px-5 py-3 rounded-2xl bg-background-light text-cream/40 font-bold text-sm hover:bg-charcoal-light/50 active:scale-[0.97] transition-all">Back</button>
                  <button onClick={handleSaveEdit} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/20 text-primary font-bold text-sm hover:bg-primary/30 active:scale-[0.97] transition-all">
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Marketplace Modal */}
      <MarketplaceModal
        isOpen={showMarketplace}
        onClose={() => setShowMarketplace(false)}
        item={editingItem ? {
          name: editingItem.name,
          imageUrl: editingItem.customImage || editingItem.imageUrl,
          marketPrice: editingItem.estimatedValue || 0,
          category: editingItem.category,
        } : null}
      />

      <BottomNav />
    </div>
  );
}