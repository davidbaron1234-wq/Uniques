"use client";

import { useState, useEffect, useRef, useCallback, Suspense, useMemo } from "react";
import { driver } from "driver.js";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import CardDetailModal from "@/components/CardDetailModal";
import ItemConfigForm, { ItemConfig } from "@/components/ItemConfigForm";
import { formatValue } from "@/lib/format";
import { MasterItem } from "@/lib/catalog/types";
import { CollectibleItem } from "@/lib/types";
import { CATEGORIES, Category } from "@/lib/constants";
import AdvancedFiltersModal, { ExploreFilters } from "@/components/AdvancedFiltersModal";
import { usePreferences } from "@/lib/UserPreferencesContext";
import {
  Search, X, Loader2, Check, Save, ArrowLeft, AlertCircle,
  Star, UserPlus, UserCheck, Users, SlidersHorizontal, Sparkles, Flame, Info,
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

// ── Bulletproof price parser ───────────────────────────────────────────────────
// Handles: "$1.2K", "1,500", "2.5M", "10-20" (range→lower bound), exotic symbols, nulls
function parsePrice(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") return isFinite(raw) ? raw : 0;
  const str = String(raw)
    .trim()
    .replace(/[$€£¥₩₹\s]/g, "")
    .replace(/,/g, "")
    .replace(/(\d+\.?\d*)-[\d.]+/, "$1");
  const match = str.match(/^([\d.]+)([KkMm]?)$/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  if (!isFinite(num)) return 0;
  const suffix = match[2].toUpperCase();
  if (suffix === "K") return num * 1000;
  if (suffix === "M") return num * 1000000;
  return num;
}

// ── Anti-junk keyword lists (post-filter eBay noise) ─────────────────────────
const CATEGORY_KEYWORDS: Partial<Record<string, string[]>> = {
  "Pokémon TCG": ["pokemon", "pokémon", "pikachu", "charizard", "eevee", "mewtwo", "holo", "tcg", "card"],
  "Sports Cards": ["card", "topps", "panini", "rookie", "auto", "refractor", "patch", "serial"],
  "Other TCG": ["magic", "mtg", "yu-gi-oh", "digimon", "lorcana", "dragon ball", "card"],
  "Funko Pop": ["funko", "pop"],
  "Lego": ["lego"],
  "Sneakers": ["nike", "jordan", "adidas", "yeezy", "dunk", "sneaker", "shoe", "air"],
  "Video Games": ["game", "nintendo", "playstation", "xbox", "switch", "ps4", "ps5"],
  "Comics": ["comic", "marvel", "dc", "issue", "variant"],
  "Watches": ["watch", "rolex", "omega", "seiko", "citizen", "chronograph", "automatic"],
  "Coins": ["coin", "silver", "gold", "bullion", "mint"],
};

// ── Stable mock view count (for social proof) ─────────────────────────────────
function mockViewCount(id: string): number {
  const hash = id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return 120 + (hash % 880);
}

// ── Browse queries for blended "All" feed ─────────────────────────────────────
const BROWSE_QUERIES: Record<string, string> = {
  "Pokémon TCG": "pokemon card holo rare",
  "Sports Cards": "sports card rookie graded",
  "Other TCG": "magic the gathering foil rare",
  "Funko Pop": "funko pop vinyl exclusive",
  "Lego": "lego set new sealed",
  "Sneakers": "air jordan sneaker new",
  "Video Games": "video game sealed collector",
  "Comics": "marvel dc comic key issue",
  "Watches": "luxury automatic wristwatch",
  "Coins": "silver gold coin rare",
  "Other": "rare collectible premium",
};

const DEFAULT_BROWSE_CATS = ["Pokémon TCG", "Watches", "Sneakers", "Lego", "Sports Cards", "Coins"];

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
            {collector.trades} trades · {formatValue(collector.collectionValue)} vault
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

// ── Trending card ─────────────────────────────────────────────────────────────

function TrendingCard({ item, onClick }: { item: MasterItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-[140px] bg-white/5 rounded-2xl border border-white/10 overflow-hidden text-left hover:bg-white/[0.08] transition-colors group"
    >
      <div className="w-full h-[100px] flex items-center justify-center bg-white/[0.03] p-2">
        <img
          src={item.imageSmall}
          alt={item.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>
      <div className="p-2.5">
        <p className="text-[11px] text-cream/80 font-medium truncate">{item.name}</p>
        {item.marketPrice > 0 && (
          <p className="text-[11px] text-[#CAE6CE] font-bold mt-0.5">
            {formatValue(item.marketPrice)}
          </p>
        )}
        <div className="flex items-center justify-between mt-1">
          <span className="text-[9px] font-semibold text-cream/30 bg-white/[0.05] px-1.5 py-0.5 rounded">
            {item.category}
          </span>
          <span className="text-[9px] text-cream/25">👁 {mockViewCount(item.id)}</span>
        </div>
      </div>
    </button>
  );
}

// ── Personalize Feed Modal ─────────────────────────────────────────────────────

function PersonalizeFeedModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { preferences, setFavoriteCategories } = usePreferences();
  const [draft, setDraft] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) setDraft(preferences.favoriteCategories);
  }, [isOpen, preferences.favoriteCategories]);

  if (!isOpen) return null;

  const toggle = (cat: string) =>
    setDraft((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#1A1818] rounded-3xl border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#CAE6CE]" />
            <h2 className="text-lg font-bold text-cream">Personalize Feed</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-none p-5">
          <p className="text-sm text-cream/45 mb-4 leading-relaxed">
            Pick your favorite categories to get a personalized feed tailored to what you collect.
          </p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const active = draft.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggle(cat)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all ${
                    active
                      ? "bg-[#CAE6CE]/20 text-[#CAE6CE] ring-1 ring-[#CAE6CE]/40"
                      : "bg-white/5 text-cream/50 hover:text-cream/70"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 pb-5 pt-3 border-t border-white/[0.06] flex-shrink-0">
          <button
            onClick={() => { setFavoriteCategories([]); onClose(); }}
            className="px-5 py-3 rounded-2xl bg-white/5 text-cream/40 font-bold text-sm hover:bg-white/10 hover:text-cream/60 active:scale-[0.97] transition-all"
          >
            Clear
          </button>
          <button
            onClick={() => { setFavoriteCategories(draft); onClose(); }}
            className="flex-1 py-3 rounded-2xl bg-[#CAE6CE]/20 text-[#CAE6CE] font-bold text-sm hover:bg-[#CAE6CE]/30 active:scale-[0.97] transition-all"
          >
            Save{draft.length > 0 ? ` (${draft.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status } = useSession();
  const [activeTab, setActiveTab] = useState<"Market" | "Collectors">(
    searchParams.get("tab") === "Collectors" ? "Collectors" : "Market",
  );
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const itemId = searchParams.get("itemId");
  const autoOpen = searchParams.get("autoOpen");
  const action = searchParams.get("action");
  // Capture at mount — stable ref so the tour useEffect never reads a stale value.
  const initialTourParam = useRef(searchParams.get("tour"));
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
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Browse-mode pagination tracking (refs to avoid stale-closure issues)
  const isBrowseModeRef = useRef(false);
  const browseCatsRef = useRef<string[]>([]);
  const browseSeenIds = useRef<Set<string>>(new Set());
  const autoFetchAttemptsRef = useRef(0);
  const activeFiltersRef = useRef<ExploreFilters>({ categories: [], minPrice: null, maxPrice: null, condition: null });
  const tourDriverRef = useRef<ReturnType<typeof driver> | null>(null);
  // true while the tour itself is calling router.push — suppresses the
  // pathname watcher from destroying the tour mid-navigation.
  const tourNavigatingRef = useRef(false);
  const pathname = usePathname();
  // Keep a ref so step callbacks never close over a stale pathname value.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // ── Kill tour on route change (unless tour triggered the nav itself) ──────
  const isInitialPathnameMount = useRef(true);
  useEffect(() => {
    // Skip the very first fire — this effect runs on mount with the current
    // pathname and must not destroy a tour that hasn't started yet.
    if (isInitialPathnameMount.current) {
      isInitialPathnameMount.current = false;
      return;
    }
    if (tourNavigatingRef.current) {
      // Tour-initiated push — swallow this event and reset the flag.
      tourNavigatingRef.current = false;
      return;
    }
    if (tourDriverRef.current?.isActive()) {
      tourDriverRef.current.destroy();
      tourDriverRef.current = null;
    }
  }, [pathname]);

  // ── Product tour (driver.js) — triggered by localStorage flag from home page ─
  useEffect(() => {
    if (localStorage.getItem("continueTour") !== "true") return;

    const t = setTimeout(() => {
      // Double-fire guard: Strict Mode mounts twice; first timeout may have
      // already consumed the flag before the second timeout fires.
      if (localStorage.getItem("continueTour") !== "true") return;
      localStorage.removeItem("continueTour");

      // Steps 3–5 of the 7-step cross-page tour.
      // Step 5 (messages-tab) is the last step here — clicking "Next →" on it
      // must navigate to /inbox to continue with step 6. Because driver.js
      // ignores onNextClick on the final array step (it calls destroy directly),
      // we track intent via a ref and handle it in onDestroyStarted.
      const shouldNavToInboxRef = { current: false };

      const RAW_STEPS = [
        {
          element: "[data-tour='for-you-feed']",
          popover: {
            title: "🔥 Your Daily Heat",
            description: "Curated slabs, bricks, and grails based on your PC. No filler, just global and local heat tailored for you.",
            side: "bottom" as const,
            align: "start" as const,
            nextBtnText: "Next →",
            progressText: "3 of 7",
          },
        },
        {
          element: "[data-tour='filters-btn']",
          popover: {
            title: "🎯 Precision Sniping",
            description: "Don't just scroll. Filter by exact PSA/BGS grade, condition, and market comps. Snipe exactly what you need.",
            side: "bottom" as const,
            align: "start" as const,
            nextBtnText: "Next →",
            progressText: "4 of 7",
          },
        },
        {
          element: "[data-tour='messages-tab']",
          // Mark intent to navigate when this (last) step is completed.
          onHighlightStarted: () => { shouldNavToInboxRef.current = true; },
          popover: {
            title: "🤝 The Deal Room",
            description: "Forget messy DMs. Propose visual trades, negotiate based on real comps, and lock in the deal.",
            side: "top" as const,
            align: "center" as const,
            nextBtnText: "Next →",
            progressText: "5 of 7",
          },
        },
      ];

      const steps = RAW_STEPS.filter((s) => !!document.querySelector(s.element));

      if (steps.length === 0) return;

      const driverObj = driver({
        showProgress: true,
        allowClose: true,
        stagePadding: 8,
        disableActiveInteraction: true,
        onDestroyStarted: () => {
          const nav = shouldNavToInboxRef.current;
          driverObj.destroy();
          if (nav) {
            localStorage.setItem("tourStep", "messages");
            localStorage.setItem("tourStep_ts", String(Date.now()));
            setTimeout(() => router.push("/inbox"), 150);
          }
        },
        onCloseClick: () => {
          shouldNavToInboxRef.current = false;
          driverObj.destroy();
        },
        steps,
      });
      tourDriverRef.current = driverObj;
      driverObj.drive();
    }, 2000);

    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ── Trending ──
  const [trendingItems, setTrendingItems] = useState<MasterItem[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [showTrendingTooltip, setShowTrendingTooltip] = useState(false);

  // ── Filters ──
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ExploreFilters>({
    categories: [],
    minPrice: null,
    maxPrice: null,
    condition: null,
  });

  // ── For You ──
  const { preferences } = usePreferences();
  const favoriteCategories = preferences.favoriteCategories;

  // Keep ref in sync so fetchResults (stable callback) can read current filters
  activeFiltersRef.current = activeFilters;

  const activeFilterCount =
    (activeFilters.categories.length > 0 ? 1 : 0) +
    (activeFilters.minPrice !== null ? 1 : 0) +
    (activeFilters.maxPrice !== null ? 1 : 0) +
    (activeFilters.condition !== null ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  const fetchResults = useCallback(
    async (searchQuery: string, category: string, pageNum: number, append: boolean) => {
      if (!append) {
        isBrowseModeRef.current = false;
        autoFetchAttemptsRef.current = 0;
      }
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
        const { minPrice, maxPrice } = activeFiltersRef.current;
        if (minPrice !== null) params.set("minPrice", String(minPrice));
        if (maxPrice !== null) params.set("maxPrice", String(maxPrice));

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

  // ── Blended browse: paginated multi-category fetch with dedup + shuffle ───────
  const fetchBrowseAll = useCallback(async (cats?: string[], pageNum = 1, append = false) => {
    if (!append) {
      isBrowseModeRef.current = true;
      autoFetchAttemptsRef.current = 0;
      browseSeenIds.current = new Set();
      setLoading(true);
      setResults([]);
    } else {
      setLoadingMore(true);
    }

    try {
      const browseCats = cats && cats.length > 0 ? cats : DEFAULT_BROWSE_CATS;
      browseCatsRef.current = browseCats;

      const queries = browseCats.map((c) => BROWSE_QUERIES[c] ?? "rare collectible premium");
      const responses = await Promise.allSettled(
        queries.map((q) =>
          fetch(`/api/catalog/search?${new URLSearchParams({ q, pageSize: "12", page: String(pageNum) })}`).then((r) => r.json())
        )
      );

      const merged: MasterItem[] = [];
      let anyHasMore = false;
      responses.forEach((r) => {
        if (r.status === "fulfilled" && Array.isArray(r.value?.items)) {
          r.value.items.forEach((item: MasterItem) => {
            if (!browseSeenIds.current.has(item.id)) {
              browseSeenIds.current.add(item.id);
              merged.push(item);
            }
          });
          if ((r.value.page ?? 1) < (r.value.totalPages ?? 1)) anyHasMore = true;
        }
      });

      // Fisher-Yates shuffle for variety
      for (let i = merged.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [merged[i], merged[j]] = [merged[j], merged[i]];
      }

      if (append) {
        setResults((prev) => [...prev, ...merged]);
      } else {
        setResults(merged);
      }

      // Expose pagination to IntersectionObserver and auto-fetch logic
      setPage(pageNum);
      setTotalPages(anyHasMore ? pageNum + 1 : pageNum);
      setTotal(merged.length);
    } catch {
      if (!append) fetchResults("", "All", 1, false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [fetchResults]);

  useEffect(() => {
    if (activeTab !== "Market") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (query.trim().length === 0 && selectedCategory === "All") {
        fetchBrowseAll(favoriteCategories.length > 0 ? favoriteCategories : undefined, 1, false);
      } else {
        fetchResults(query, selectedCategory, 1, false);
      }
    }, query.length === 0 ? 0 : 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selectedCategory, activeTab, fetchResults, fetchBrowseAll, favoriteCategories]);

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

  // ── Fetch trending items on mount ──
  useEffect(() => {
    let cancelled = false;
    async function fetchTrending() {
      setTrendingLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("q", "rare collectible");
        params.set("pageSize", "10");
        params.set("categoryIds", "1,220,64482,11116,281");
        const res = await fetch(`/api/catalog/search?${params.toString()}`);
        if (!res.ok) throw new Error("Trending fetch failed");
        const data = await res.json();
        if (!cancelled) {
          // Sort by price descending for "trending"
          const sorted = [...data.items].sort((a: MasterItem, b: MasterItem) => b.marketPrice - a.marketPrice);
          setTrendingItems(sorted.slice(0, 10));
        }
      } catch {
        // silent fail
      } finally {
        if (!cancelled) setTrendingLoading(false);
      }
    }
    fetchTrending();
    return () => { cancelled = true; };
  }, []);

  // ── Infinite scroll via IntersectionObserver ─────────────────────────────────
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && page < totalPages) {
          if (isBrowseModeRef.current) {
            fetchBrowseAll(browseCatsRef.current, page + 1, true);
          } else {
            fetchResults(query, selectedCategory, page + 1, true);
          }
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadingMore, page, totalPages, query, selectedCategory, fetchResults, fetchBrowseAll]);

  // ── Apply filters + anti-junk guard ──────────────────────────────────────────
  const filteredResults = useMemo(() => results.filter((item) => {
    // 1. Category: use selectedCategory (the canonical state for category filtering)
    if (selectedCategory !== "All" && item.category !== selectedCategory) return false;

    // 2. Modal category filter (single-select, synced with selectedCategory)
    if (activeFilters.categories.length > 0 && !activeFilters.categories.includes(item.category)) return false;

    // 3. Anti-junk: if a specific category is active, item name must contain a relevant keyword
    const activeCat = selectedCategory !== "All" ? selectedCategory : activeFilters.categories[0];
    if (activeCat) {
      const keywords = CATEGORY_KEYWORDS[activeCat];
      if (keywords) {
        const nameLower = item.name.toLowerCase();
        if (!keywords.some((kw) => nameLower.includes(kw))) return false;
      }
    }

    // 4. Price: use parsePrice to handle "$1.2K", "1,500", "2.5M", and plain numbers
    const price = parsePrice(item.marketPrice);
    if (activeFilters.minPrice !== null && price > 0 && price < activeFilters.minPrice) return false;
    if (activeFilters.maxPrice !== null && price > 0 && price > activeFilters.maxPrice) return false;

    return true;
  }), [results, selectedCategory, activeFilters]);

  // ── Auto-fetch when filters reduce visible items below threshold ──────────────
  const MIN_VISIBLE = 6;
  useEffect(() => {
    if (loading || loadingMore) return;
    if (filteredResults.length >= MIN_VISIBLE) {
      autoFetchAttemptsRef.current = 0;
      return;
    }
    if (page >= totalPages) return;                    // no more API pages
    if (autoFetchAttemptsRef.current >= 2) return;    // cap silent fetches
    autoFetchAttemptsRef.current++;
    if (isBrowseModeRef.current) {
      fetchBrowseAll(browseCatsRef.current, page + 1, true);
    } else {
      fetchResults(query, selectedCategory, page + 1, true);
    }
  }, [filteredResults.length, page, totalPages, loading, loadingMore, query, selectedCategory, fetchResults, fetchBrowseAll]);

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
    if (typeof window === 'undefined') return;

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
        let currentInventory: CollectibleItem[] = [];
        if (currentInventoryString) {
          try { currentInventory = JSON.parse(currentInventoryString); } catch { /* corrupt data, use empty */ }
        }
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

  if (status === "unauthenticated") {
    router.replace("/api/auth/signin");
    return null;
  }
  if (status === "loading") return null;

  return (
    <div className="min-h-screen pb-20 bg-background">
      <Header />

      <main className="max-w-lg mx-auto" data-tour="explore-feed">

        {/* ── Tab toggle ── */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex gap-2 p-1 rounded-2xl bg-background-light">
            {(["Market", "Collectors"] as const).map((tab) => (
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
        {activeTab === "Market" && (
          <>
            {/* Personalize Feed Banner */}
            {preferences.favoriteCategories.length === 0 ? (
              <div data-tour="for-you-feed" className="mx-5 mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#CAE6CE]/[0.07] border border-[#CAE6CE]/20">
                <Sparkles className="w-4 h-4 text-[#CAE6CE] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-cream/80">Personalize your feed</p>
                  <p className="text-[10px] text-cream/40">Pick the categories you collect</p>
                </div>
                <button
                  onClick={() => setPersonalizeOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#CAE6CE]/20 text-[#CAE6CE] text-[11px] font-bold flex-shrink-0 hover:bg-[#CAE6CE]/30 transition-colors"
                >
                  Set Up
                </button>
              </div>
            ) : (
              <div data-tour="for-you-feed" className="mx-5 mb-4 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                <Sparkles className="w-3.5 h-3.5 text-[#CAE6CE] flex-shrink-0" />
                <span className="text-xs font-semibold text-cream/60 flex-1 truncate">
                  For You: {preferences.favoriteCategories.join(", ")}
                </span>
                <button
                  onClick={() => setPersonalizeOpen(true)}
                  className="text-[10px] text-cream/30 hover:text-cream/60 flex-shrink-0 transition-colors"
                >
                  Edit
                </button>
              </div>
            )}

            {/* Trending carousel */}
            {trendingItems.length > 0 && (
              <section className="mb-4">
                <div className="flex items-center gap-2 mb-3 px-4">
                  <Flame className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <h2 className="text-sm font-bold text-cream/80 tracking-wide uppercase">Trending Now</h2>
                  <div className="relative">
                    <button
                      onClick={() => setShowTrendingTooltip((v) => !v)}
                      onBlur={() => setShowTrendingTooltip(false)}
                      className="flex items-center"
                    >
                      <Info className="w-3.5 h-3.5 text-cream/25 hover:text-cream/55 transition-colors" />
                    </button>
                    {showTrendingTooltip && (
                      <div className="absolute left-0 top-6 w-52 bg-charcoal-dark border border-white/10 rounded-xl p-3 text-[11px] text-cream/55 z-20 shadow-xl leading-relaxed">
                        Trending items based on platform activity and interest.
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-none px-4 pb-2">
                  {trendingItems.map((item) => (
                    <TrendingCard key={item.id} item={item} onClick={() => setViewItem(item)} />
                  ))}
                </div>
              </section>
            )}
            {trendingLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-surface-light/40 animate-spin" />
              </div>
            )}

            {/* Category pills + Filters button (Filters far LEFT) */}
            <div className="px-5 pb-3">
              <div className="flex items-center gap-2 pb-1">
                <button
                  data-tour="filters-btn"
                  onClick={() => setFiltersOpen(true)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all flex-shrink-0 ${
                    hasActiveFilters
                      ? "bg-[#CAE6CE]/20 text-[#CAE6CE] ring-1 ring-[#CAE6CE]/40"
                      : "bg-background-light text-cream/50 hover:text-cream/70"
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="bg-[#CAE6CE] text-[#1A1818] rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <div
                  ref={pillsRef}
                  className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-none cursor-grab select-none flex-1 min-w-0"
                  onMouseDown={handlePillsDown}
                  onMouseMove={handlePillsMove}
                  onMouseUp={handlePillsEnd}
                  onMouseLeave={handlePillsEnd}
                >
                  {SEARCH_FILTERS.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        // Sync category to modal state; preserve price & condition
                        setActiveFilters((prev) => ({
                          ...prev,
                          categories: cat === "All" ? [] : [cat],
                        }));
                      }}
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
            </div>

            {/* Results grid */}
            <div className="px-5 pb-4">
              {loading && (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 text-surface-light/50 animate-spin" />
                </div>
              )}

              {!loading && filteredResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center mb-4">
                    <Search className="w-7 h-7 text-white/30" />
                  </div>
                  <h3 className="text-base font-semibold text-cream mb-1">No results found</h3>
                  <p className="text-sm text-white/40 max-w-[240px]">
                    {hasActiveFilters
                      ? "Try adjusting your filters or search term."
                      : "Try a different search term or browse by category above."}
                  </p>
                </div>
              )}

              {!loading && filteredResults.length > 0 && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {filteredResults.map((item, i) => (
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

                  {/* Infinite scroll sentinel */}
                  <div ref={sentinelRef} className="flex justify-center py-6 h-12">
                    {loadingMore && <Loader2 className="w-5 h-5 text-surface-light/40 animate-spin" />}
                  </div>
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
                            <p className="text-[10px] text-cream/40 font-bold uppercase tracking-wider">Add to Vault</p>
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
                        Close
                    </button>
                    <button
                        onClick={handleSaveToInventory}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/20 text-primary font-bold hover:bg-primary/30 active:scale-95 transition-all shadow-glow-primary"
                    >
                        <Save className="w-4 h-4" />
                        Add to Vault
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

      <AdvancedFiltersModal
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={activeFilters}
        onApply={(f) => {
          setActiveFilters(f);
          // Sync category pill to modal selection
          if (f.categories.length > 0) {
            setSelectedCategory(f.categories[0] as typeof SEARCH_FILTERS[number]);
          } else {
            setSelectedCategory("All");
          }
          setFiltersOpen(false);
        }}
      />

      <PersonalizeFeedModal
        isOpen={personalizeOpen}
        onClose={() => setPersonalizeOpen(false)}
      />

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
