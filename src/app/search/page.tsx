"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import CardDetailModal from "@/components/CardDetailModal";
import ItemConfigForm, { ItemConfig } from "@/components/ItemConfigForm";
import { formatValue } from "@/lib/format";
import { MasterItem } from "@/lib/catalog/types";
import { CollectibleItem } from "@/lib/types";
import { CATEGORIES, Category } from "@/lib/constants";
import {
  Search, X, Loader2, Check, Save, ArrowLeft, AlertCircle,
  Star, UserPlus, UserCheck, Users,
} from "lucide-react";

const PAGE_SIZE = 60;

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

// ── Accent-insensitive text normalization ─────────────────────────────────────
const normalize = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// ── Collector directory (mock data) ───────────────────────────────────────────

type Collector = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  trades: number;
  collectionValue: number;
  categories: string[];
  trustScore: number;
  online: boolean;
};

const COLLECTORS: Collector[] = [
  {
    id: "user-drew",
    name: "Drew",
    handle: "drew",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Drew&backgroundColor=B5EAD7",
    trades: 63,
    collectionValue: 27000,
    categories: ["Pokémon TCG", "Funko Pop"],
    trustScore: 4.9,
    online: true,
  },
  {
    id: "user-ethan",
    name: "Ethan",
    handle: "ethan",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan&backgroundColor=FFDAC1",
    trades: 38,
    collectionValue: 31200,
    categories: ["Sports Cards", "Lego", "Funko Pop"],
    trustScore: 4.6,
    online: true,
  },
  {
    id: "user-sam",
    name: "Sam",
    handle: "sam",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam&backgroundColor=FCF9D5",
    trades: 91,
    collectionValue: 14500,
    categories: ["Pokémon TCG"],
    trustScore: 4.8,
    online: false,
  },
  {
    id: "user-alex",
    name: "Alex",
    handle: "alex",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=AA95C5",
    trades: 27,
    collectionValue: 48000,
    categories: ["Funko Pop"],
    trustScore: 4.7,
    online: false,
  },
  {
    id: "user-jordan",
    name: "Jordan",
    handle: "jordan",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan&backgroundColor=CAE6CE",
    trades: 44,
    collectionValue: 9800,
    categories: ["Sneakers"],
    trustScore: 4.5,
    online: false,
  },
  {
    id: "user-riley",
    name: "Riley",
    handle: "riley",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Riley&backgroundColor=FFD9E8",
    trades: 15,
    collectionValue: 5600,
    categories: ["Comics", "Video Games"],
    trustScore: 4.3,
    online: false,
  },
];

// ── Collector card ─────────────────────────────────────────────────────────────

function CollectorCard({
  collector,
  followed,
  onFollow,
  index,
}: {
  collector: Collector;
  followed: boolean;
  onFollow: () => void;
  index: number;
}) {
  return (
    <div
      className="flex items-center bg-background-light rounded-2xl overflow-hidden hover:bg-white/[0.05] transition-colors animate-slide-up"
      style={{ animationDelay: `${index * 0.05}s`, animationFillMode: "both" }}
    >
      {/* Clickable profile area */}
      <Link
        href={`/u/${collector.handle}`}
        className="flex items-center gap-3 flex-1 p-4 min-w-0"
      >
        {/* Avatar + online dot */}
        <div className="relative flex-shrink-0">
          <div className="w-11 h-11 rounded-full overflow-hidden border border-white/[0.08]">
            <img
              src={collector.avatar}
              alt={collector.name}
              className="w-full h-full object-cover"
            />
          </div>
          {collector.online && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-charcoal-dark" />
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-sm font-bold text-cream truncate">{collector.name}</p>
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />
            <span className="text-[10px] text-cream/40 font-semibold flex-shrink-0">{collector.trustScore}</span>
          </div>
          <p className="text-[10px] text-cream/30 font-medium">@{collector.handle}</p>
          <p className="text-[10px] text-cream/25 mt-1">
            {collector.trades} trades · {formatValue(collector.collectionValue)} collection
          </p>
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {collector.categories.slice(0, 2).map((cat) => (
              <span
                key={cat}
                className="text-[9px] font-semibold text-cream/30 bg-white/[0.05] px-1.5 py-0.5 rounded"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      </Link>

      {/* Follow button — outside the Link to avoid nested interactive elements */}
      <div className="pr-4 flex-shrink-0">
        <button
          onClick={onFollow}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${
            followed
              ? "bg-primary/10 text-primary border border-primary/20"
              : "bg-white/[0.07] text-cream/50 hover:bg-white/[0.13] hover:text-cream/80 border border-white/[0.08]"
          }`}
        >
          {followed
            ? <UserCheck className="w-3 h-3" />
            : <UserPlus className="w-3 h-3" />
          }
          {followed ? "Following" : "Follow"}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"Items" | "Collectors">("Items");
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const itemId = searchParams.get("itemId");
  const autoOpen = searchParams.get("autoOpen");
  const action = searchParams.get("action");
  const [autoTradeOpen, setAutoTradeOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SearchFilter>("All");
  const [results, setResults] = useState<MasterItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
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

  // ── Category pills drag-to-scroll ──────────────────────────────────────
  const pillsRef = useRef<HTMLDivElement>(null);
  const pillsDrag = useRef({ active: false, startX: 0, scrollLeft: 0 });
  const handlePillsDown = (e: React.MouseEvent) => {
    pillsDrag.current = { active: true, startX: e.pageX, scrollLeft: pillsRef.current?.scrollLeft ?? 0 };
    if (pillsRef.current) pillsRef.current.style.cursor = "grabbing";
  };
  const handlePillsMove = (e: React.MouseEvent) => {
    if (!pillsDrag.current.active || !pillsRef.current) return;
    e.preventDefault();
    pillsRef.current.scrollLeft = pillsDrag.current.scrollLeft - (e.pageX - pillsDrag.current.startX);
  };
  const handlePillsEnd = () => {
    pillsDrag.current.active = false;
    if (pillsRef.current) pillsRef.current.style.cursor = "grab";
  };
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
        if (searchQuery.trim().length >= 2) params.set("q", searchQuery.trim());
        if (category !== "All") params.set("category", category);
        params.set("page", String(pageNum));
        params.set("pageSize", String(PAGE_SIZE));
        params.set("categoryIds", "1,220,64482,11116,281");

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
      }
    },
    []
  );

  useEffect(() => {
    if (activeTab !== "Items") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(query, selectedCategory, 1, false);
    }, query.length === 0 ? 0 : 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selectedCategory, activeTab, fetchResults]);

  // Sync local query state when the Header pushes a new ?q= while the user is
  // already on /search (useState initializer only runs on mount, not on URL changes).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null && q !== query) {
      setQuery(q);
    }
  }, [searchParams]);

  // Auto-open the detail modal when a deep-linked itemId is present and results
  // have loaded. Tries an exact ID match first, then falls back to results[0].
  // Cleans the itemId out of the URL immediately to prevent re-triggering on
  // subsequent renders (e.g. load-more updating the results array).
  useEffect(() => {
    if (!itemId || results.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match = results.find((r) => r.id === itemId || (r as any).masterId === itemId);
    setViewItem(match ?? results[0]);
    const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
    window.history.replaceState(null, "", `/search${qs}`);
  }, [itemId, results]);

  // Auto-open the first result when a Radar match deep-link includes autoOpen=true.
  // If action=trade is also present, flag the modal to skip to the trade/marketplace view.
  // Cleans all params from the URL after triggering to prevent re-firing on re-renders.
  useEffect(() => {
    if (autoOpen !== "true" || results.length === 0) return;
    setViewItem(results[0]);
    if (action === "trade") setAutoTradeOpen(true);
    const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
    window.history.replaceState(null, "", `/search${qs}`);
  }, [autoOpen, action, results]);

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
        customImage: undefined
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
            customImage: config.customImage
        };

        const currentInventoryString = localStorage.getItem("uniques_inventory");
        const currentInventory = currentInventoryString ? JSON.parse(currentInventoryString) : [];
        localStorage.setItem("uniques_inventory", JSON.stringify([newItem, ...currentInventory]));

        setAddItem(null);
        setLocalToast({ msg: `${addItem.name} added successfully!`, type: 'success' });
        setTimeout(() => setLocalToast(null), 3000);

    } catch (e) {
        console.error("LocalStorage Save error:", e);
        setLocalToast({ msg: "Memory full! Try removing old items or a smaller image.", type: 'error' });
        setTimeout(() => setLocalToast(null), 5000);
    }
  };

  const toggleFollow = (id: string) => {
    setFollowedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Filter collectors by query (name, handle, or category)
  const filteredCollectors = COLLECTORS.filter((c) => {
    if (!query.trim()) return true;
    const q = normalize(query);
    return (
      normalize(c.name).includes(q) ||
      normalize(c.handle).includes(q) ||
      c.categories.some((cat) => normalize(cat).includes(q))
    );
  });

  const hasMore = page < totalPages;

  return (
    <div className="min-h-screen pb-20 bg-charcoal-dark">
      <Header />

      <main className="max-w-lg mx-auto">

        {/* ── Tab toggle ── */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex gap-2 p-1 rounded-2xl bg-background-light">
            {(["Items", "Collectors"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab
                    ? "bg-primary text-charcoal-dark shadow-soft"
                    : "text-cream/40 hover:text-cream/70"
                }`}
              >
                {tab === "Collectors" && <Users className="w-3.5 h-3.5" />}
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* ── Items tab content ── */}
        {activeTab === "Items" && (
          <>
            {/* Category pills (Items only) */}
            <div className="px-5 pb-3">
              <div
                ref={pillsRef}
                className="flex flex-nowrap gap-2 overflow-x-auto pb-1 scrollbar-none cursor-grab select-none"
                onMouseDown={handlePillsDown}
                onMouseMove={handlePillsMove}
                onMouseUp={handlePillsEnd}
                onMouseLeave={handlePillsEnd}
              >
                {SEARCH_FILTERS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
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

            {/* Results grid */}
            <div className="px-5 pb-4">
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
                        <div className={`aspect-square flex items-center justify-center ${
                          item.category === "Lego" || item.category === "Funko Pop"
                            ? "bg-white p-2"
                            : "bg-white/[0.05] p-3"
                        }`}>
                          <img
                            src={item.imageSmall}
                            alt={item.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
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
                        {loadingMore ? "Loading..." : "Load More"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* ── Collectors tab content ── */}
        {activeTab === "Collectors" && (
          <div className="px-5 pb-6">
            {/* Count */}
            <p className="text-xs text-cream/30 font-medium mb-3">
              {filteredCollectors.length} collector{filteredCollectors.length !== 1 ? "s" : ""}
              {query.trim() ? ` matching "${query}"` : ""}
            </p>

            {filteredCollectors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-background-light flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-cream/20" />
                </div>
                <p className="text-cream/40 font-medium">No collectors found</p>
                <p className="text-cream/25 text-sm mt-1">Try a different name or category</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredCollectors.map((c, i) => (
                  <CollectorCard
                    key={c.id}
                    collector={c}
                    followed={followedIds.has(c.id)}
                    onFollow={() => toggleFollow(c.id)}
                    index={i}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <CardDetailModal
        item={viewItem}
        autoOpenTrade={autoTradeOpen}
        onClose={() => {
          setViewItem(null);
          setAutoTradeOpen(false);
          // Strip itemId from the URL so it doesn't re-open the modal on re-render
          if (searchParams.get("itemId")) {
            const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
            window.history.replaceState(null, "", `/search${qs}`);
          }
        }}
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

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageContent />
    </Suspense>
  );
}
