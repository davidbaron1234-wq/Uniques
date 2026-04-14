"use client";

import { useState, useEffect, useRef, useCallback, Suspense, useMemo } from "react";
import { driver } from "driver.js";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import MarketTicker from "@/components/MarketTicker";
import CardDetailModal from "@/components/CardDetailModal";
import ItemConfigForm, { ItemConfig } from "@/components/ItemConfigForm";
import { formatValue } from "@/lib/format";
import { MasterItem } from "@/lib/catalog/types";
import { CollectibleItem } from "@/lib/types";
import { useInventory } from "@/lib/InventoryContext";
import { CATEGORIES, Category } from "@/lib/constants";
import AdvancedFiltersModal, { ExploreFilters } from "@/components/AdvancedFiltersModal";
import { usePreferences } from "@/lib/UserPreferencesContext";
import { isDemoUser } from "@/lib/demo";
import GuestAuthModal from "@/components/GuestAuthModal";
import {
  Search, X, Loader2, Check, Save, ArrowLeft, AlertCircle,
  Star, UserPlus, UserCheck, Users, SlidersHorizontal, Sparkles, Flame, Info, MessageSquare,
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
  itemCount?: number;
  categories: string[];
  trustScore: number;
  online: boolean;
  isPro: boolean;
  isNew?: boolean; // joined within the last 3 days (from API)
  paymentMethods: string[];
  shippingPreferences: string[];
};

const COLLECTORS: Collector[] = [
  // ── Original 6 ──────────────────────────────────────────────────────────
  { id: "user-drew",   name: "Drew",   handle: "drew",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Drew&backgroundColor=B5EAD7",   trades: 63,  collectionValue: 27000,   categories: ["Pokémon TCG", "Funko Pop"],           trustScore: 4.9, online: true,  isPro: true,  paymentMethods: ["PayPal", "Crypto"],          shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-ethan",  name: "Ethan",  handle: "ethan",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan&backgroundColor=FFDAC1",  trades: 38,  collectionValue: 31200,   categories: ["Sports Cards", "Lego", "Funko Pop"], trustScore: 4.6, online: true,  isPro: false, paymentMethods: ["Bank Transfer"],             shippingPreferences: ["Local Pickup"] },
  { id: "user-sam",    name: "Sam",    handle: "sam",    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam&backgroundColor=FCF9D5",    trades: 91,  collectionValue: 14500,   categories: ["Pokémon TCG"],                       trustScore: 4.8, online: false, isPro: true,  paymentMethods: ["PayPal"],                    shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-alex",   name: "Alex",   handle: "alex",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=AA95C5",   trades: 27,  collectionValue: 48000,   categories: ["Funko Pop"],                         trustScore: 4.7, online: false, isPro: true,  paymentMethods: ["PayPal", "Bank Transfer"],   shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-jordan", name: "Jordan", handle: "jordan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan&backgroundColor=CAE6CE", trades: 44,  collectionValue: 9800,    categories: ["Sneakers"],                          trustScore: 4.5, online: false, isPro: false, paymentMethods: ["Crypto"],                    shippingPreferences: ["Local Pickup"] },
  { id: "user-riley",  name: "Riley",  handle: "riley",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Riley&backgroundColor=FFD9E8",  trades: 15,  collectionValue: 5600,    categories: ["Comics", "Video Games"],             trustScore: 4.3, online: false, isPro: false, paymentMethods: [],                            shippingPreferences: ["Worldwide Shipping"] },
  // ── Expanded 44 ─────────────────────────────────────────────────────────
  { id: "user-mia",    name: "Mia",    handle: "mia",    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia&backgroundColor=ffd5dc",    trades: 112, collectionValue: 125000,  categories: ["Watches"],                           trustScore: 4.9, online: true,  isPro: true,  paymentMethods: ["PayPal", "Crypto"],          shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-carlos", name: "Carlos", handle: "carlos", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos&backgroundColor=b6e3f4", trades: 87,  collectionValue: 87000,   categories: ["Sports Cards"],                      trustScore: 4.8, online: true,  isPro: true,  paymentMethods: ["Bank Transfer"],             shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-zoe",    name: "Zoe",    handle: "zoe",    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe&backgroundColor=c0aede",    trades: 22,  collectionValue: 8500,    categories: ["Pokémon TCG"],                       trustScore: 4.4, online: false, isPro: false, paymentMethods: ["PayPal"],                    shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-marcus", name: "Marcus", handle: "marcus", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus&backgroundColor=CAE6CE", trades: 204, collectionValue: 210000,  categories: ["Lego"],                              trustScore: 4.9, online: true,  isPro: true,  paymentMethods: ["Crypto"],                    shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-priya",  name: "Priya",  handle: "priya",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya&backgroundColor=FFD9E8",  trades: 11,  collectionValue: 4200,    categories: ["Comics"],                            trustScore: 4.1, online: false, isPro: false, paymentMethods: ["PayPal"],                    shippingPreferences: ["Local Pickup"] },
  { id: "user-tyler",  name: "Tyler",  handle: "tyler",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tyler&backgroundColor=b6e3f4",  trades: 76,  collectionValue: 95000,   categories: ["Sneakers"],                          trustScore: 4.7, online: true,  isPro: true,  paymentMethods: ["PayPal", "Crypto"],          shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-sofia",  name: "Sofia",  handle: "sofia",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia&backgroundColor=ffd5dc",  trades: 319, collectionValue: 450000,  categories: ["Watches"],                           trustScore: 5.0, online: false, isPro: true,  paymentMethods: ["Bank Transfer"],             shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-jake",   name: "Jake",   handle: "jake",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jake&backgroundColor=FCF9D5",   trades: 8,   collectionValue: 3100,    categories: ["Video Games"],                       trustScore: 4.0, online: false, isPro: false, paymentMethods: ["PayPal"],                    shippingPreferences: ["Local Pickup"] },
  { id: "user-naomi",  name: "Naomi",  handle: "naomi",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Naomi&backgroundColor=AA95C5",  trades: 55,  collectionValue: 32000,   categories: ["Pokémon TCG"],                       trustScore: 4.8, online: true,  isPro: true,  paymentMethods: ["PayPal"],                    shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-darius", name: "Darius", handle: "darius", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Darius&backgroundColor=b6e3f4", trades: 143, collectionValue: 156000,  categories: ["Sports Cards"],                      trustScore: 4.9, online: true,  isPro: true,  paymentMethods: ["Bank Transfer", "Crypto"],   shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-emma",   name: "Emma",   handle: "emma",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma&backgroundColor=FFD9E8",   trades: 19,  collectionValue: 7800,    categories: ["Funko Pop"],                         trustScore: 4.2, online: false, isPro: false, paymentMethods: ["PayPal"],                    shippingPreferences: ["Local Pickup"] },
  { id: "user-kai",    name: "Kai",    handle: "kai",    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kai&backgroundColor=CAE6CE",    trades: 61,  collectionValue: 67000,   categories: ["Lego"],                              trustScore: 4.6, online: false, isPro: true,  paymentMethods: ["Crypto"],                    shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-aria",   name: "Aria",   handle: "aria",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aria&backgroundColor=c0aede",   trades: 98,  collectionValue: 89000,   categories: ["Comics"],                            trustScore: 4.8, online: true,  isPro: true,  paymentMethods: ["PayPal", "Bank Transfer"],   shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-noah",   name: "Noah",   handle: "noah",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Noah&backgroundColor=FCF9D5",   trades: 7,   collectionValue: 2300,    categories: ["Sneakers"],                          trustScore: 3.9, online: false, isPro: false, paymentMethods: [],                            shippingPreferences: ["Local Pickup"] },
  { id: "user-luna",   name: "Luna",   handle: "luna",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna&backgroundColor=ffd5dc",   trades: 441, collectionValue: 1200000, categories: ["Watches"],                           trustScore: 4.9, online: true,  isPro: true,  paymentMethods: ["PayPal", "Crypto", "Bank Transfer"], shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-felix",  name: "Felix",  handle: "felix",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=B5EAD7",  trades: 33,  collectionValue: 11000,   categories: ["Pokémon TCG"],                       trustScore: 4.5, online: false, isPro: false, paymentMethods: ["PayPal"],                    shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-zara",   name: "Zara",   handle: "zara",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zara&backgroundColor=AA95C5",   trades: 188, collectionValue: 325000,  categories: ["Coins"],                             trustScore: 4.8, online: false, isPro: true,  paymentMethods: ["Bank Transfer"],             shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-hunter", name: "Hunter", handle: "hunter", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Hunter&backgroundColor=b6e3f4", trades: 24,  collectionValue: 6400,    categories: ["Sports Cards"],                      trustScore: 4.3, online: false, isPro: false, paymentMethods: ["PayPal"],                    shippingPreferences: ["Local Pickup"] },
  { id: "user-isla",   name: "Isla",   handle: "isla",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Isla&backgroundColor=FFD9E8",   trades: 72,  collectionValue: 78000,   categories: ["Pokémon TCG"],                       trustScore: 4.9, online: true,  isPro: true,  paymentMethods: ["PayPal", "Crypto"],          shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-river",  name: "River",  handle: "river",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=River&backgroundColor=CAE6CE",  trades: 16,  collectionValue: 4800,    categories: ["Sneakers"],                          trustScore: 4.1, online: false, isPro: false, paymentMethods: ["Crypto"],                    shippingPreferences: ["Local Pickup"] },
  { id: "user-sage",   name: "Sage",   handle: "sage",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sage&backgroundColor=c0aede",   trades: 14,  collectionValue: 5200,    categories: ["Comics"],                            trustScore: 4.2, online: false, isPro: false, paymentMethods: ["PayPal"],                    shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-quinn",  name: "Quinn",  handle: "quinn",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Quinn&backgroundColor=ffd5dc",  trades: 49,  collectionValue: 43000,   categories: ["Funko Pop"],                         trustScore: 4.7, online: true,  isPro: true,  paymentMethods: ["PayPal"],                    shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-devon",  name: "Devon",  handle: "devon",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Devon&backgroundColor=FCF9D5",  trades: 5,   collectionValue: 1800,    categories: ["Video Games"],                       trustScore: 3.8, online: false, isPro: false, paymentMethods: [],                            shippingPreferences: ["Local Pickup"] },
  { id: "user-skylar", name: "Skylar", handle: "skylar", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Skylar&backgroundColor=B5EAD7", trades: 95,  collectionValue: 112000,  categories: ["Lego"],                              trustScore: 4.8, online: false, isPro: true,  paymentMethods: ["Bank Transfer"],             shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-remy",   name: "Remy",   handle: "remy",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Remy&backgroundColor=AA95C5",   trades: 267, collectionValue: 580000,  categories: ["Watches"],                           trustScore: 5.0, online: true,  isPro: true,  paymentMethods: ["PayPal", "Bank Transfer"],   shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-casey",  name: "Casey",  handle: "casey",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Casey&backgroundColor=b6e3f4",  trades: 31,  collectionValue: 9100,    categories: ["Sports Cards"],                      trustScore: 4.4, online: false, isPro: false, paymentMethods: ["PayPal"],                    shippingPreferences: ["Local Pickup"] },
  { id: "user-morgan", name: "Morgan", handle: "morgan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Morgan&backgroundColor=CAE6CE", trades: 177, collectionValue: 245000,  categories: ["Pokémon TCG"],                       trustScore: 4.9, online: true,  isPro: true,  paymentMethods: ["Crypto"],                    shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-avery",  name: "Avery",  handle: "avery",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Avery&backgroundColor=ffd5dc",  trades: 28,  collectionValue: 7200,    categories: ["Sneakers"],                          trustScore: 4.3, online: false, isPro: false, paymentMethods: ["PayPal"],                    shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-brett",  name: "Brett",  handle: "brett",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Brett&backgroundColor=FCF9D5",  trades: 66,  collectionValue: 67000,   categories: ["Comics"],                            trustScore: 4.6, online: false, isPro: true,  paymentMethods: ["Bank Transfer", "Crypto"],   shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-hana",   name: "Hana",   handle: "hana",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Hana&backgroundColor=FFD9E8",   trades: 42,  collectionValue: 15000,   categories: ["Coins"],                             trustScore: 4.5, online: false, isPro: false, paymentMethods: ["Bank Transfer"],             shippingPreferences: ["Local Pickup"] },
  { id: "user-leo",    name: "Leo",    handle: "leo",    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo&backgroundColor=c0aede",    trades: 9,   collectionValue: 3400,    categories: ["Lego"],                              trustScore: 4.0, online: false, isPro: false, paymentMethods: ["PayPal"],                    shippingPreferences: ["Local Pickup"] },
  { id: "user-vera",   name: "Vera",   handle: "vera",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vera&backgroundColor=AA95C5",   trades: 388, collectionValue: 890000,  categories: ["Watches"],                           trustScore: 4.9, online: true,  isPro: true,  paymentMethods: ["PayPal", "Crypto"],          shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-omar",   name: "Omar",   handle: "omar",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Omar&backgroundColor=b6e3f4",   trades: 121, collectionValue: 134000,  categories: ["Sports Cards"],                      trustScore: 4.7, online: false, isPro: true,  paymentMethods: ["Bank Transfer"],             shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-chloe",  name: "Chloe",  handle: "chloe",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chloe&backgroundColor=ffd5dc",  trades: 20,  collectionValue: 6800,    categories: ["Pokémon TCG"],                       trustScore: 4.2, online: false, isPro: false, paymentMethods: ["PayPal"],                    shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-finn",   name: "Finn",   handle: "finn",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Finn&backgroundColor=CAE6CE",   trades: 53,  collectionValue: 42000,   categories: ["Video Games"],                       trustScore: 4.6, online: true,  isPro: true,  paymentMethods: ["Crypto", "PayPal"],          shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-jade",   name: "Jade",   handle: "jade",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jade&backgroundColor=B5EAD7",   trades: 134, collectionValue: 185000,  categories: ["Sneakers"],                          trustScore: 4.8, online: true,  isPro: true,  paymentMethods: ["PayPal", "Bank Transfer"],   shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-marco",  name: "Marco",  handle: "marco",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marco&backgroundColor=FCF9D5",  trades: 211, collectionValue: 475000,  categories: ["Coins"],                             trustScore: 4.9, online: false, isPro: true,  paymentMethods: ["Bank Transfer", "Crypto"],   shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-nora",   name: "Nora",   handle: "nora",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nora&backgroundColor=FFD9E8",   trades: 10,  collectionValue: 2900,    categories: ["Comics"],                            trustScore: 4.1, online: false, isPro: false, paymentMethods: ["PayPal"],                    shippingPreferences: ["Local Pickup"] },
  { id: "user-theo",   name: "Theo",   handle: "theo",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Theo&backgroundColor=c0aede",   trades: 79,  collectionValue: 89000,   categories: ["Lego"],                              trustScore: 4.7, online: false, isPro: true,  paymentMethods: ["PayPal", "Crypto"],          shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-elise",  name: "Elise",  handle: "elise",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elise&backgroundColor=ffd5dc",  trades: 37,  collectionValue: 18000,   categories: ["Watches"],                           trustScore: 4.4, online: false, isPro: false, paymentMethods: ["PayPal"],                    shippingPreferences: ["Local Pickup"] },
  { id: "user-caden",  name: "Caden",  handle: "caden",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Caden&backgroundColor=AA95C5",  trades: 58,  collectionValue: 64000,   categories: ["Funko Pop"],                         trustScore: 4.6, online: true,  isPro: true,  paymentMethods: ["Bank Transfer"],             shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-ivy",    name: "Ivy",    handle: "ivy",    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ivy&backgroundColor=B5EAD7",    trades: 503, collectionValue: 1500000, categories: ["Pokémon TCG"],                       trustScore: 5.0, online: true,  isPro: true,  paymentMethods: ["PayPal", "Crypto", "Bank Transfer"], shippingPreferences: ["Worldwide Shipping"] },
  { id: "user-ash",    name: "Ash",    handle: "ash",    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ash&backgroundColor=b6e3f4",    trades: 13,  collectionValue: 4100,    categories: ["Sports Cards"],                      trustScore: 3.7, online: false, isPro: false, paymentMethods: [],                            shippingPreferences: ["Local Pickup"] },
  { id: "user-max",    name: "Max",    handle: "max",    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Max&backgroundColor=CAE6CE",    trades: 156, collectionValue: 230000,  categories: ["Sneakers"],                          trustScore: 4.8, online: true,  isPro: true,  paymentMethods: ["Crypto", "PayPal"],          shippingPreferences: ["Worldwide Shipping"] },
];

// ── Collector card ─────────────────────────────────────────────────────────────

function CollectorCard({
  collector,
  followed,
  onFollow,
  onMessage,
  index,
}: {
  collector: Collector;
  followed: boolean;
  onFollow: () => void;
  onMessage?: () => void;
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
            {collector.trustScore > 0 ? (
              <>
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                <span className="text-[10px] text-cream/40 font-semibold flex-shrink-0">{collector.trustScore}</span>
              </>
            ) : collector.isNew ? (
              <span className="text-[10px] text-primary/70 font-semibold flex-shrink-0 bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20">New</span>
            ) : null}
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

      {/* Action buttons — outside the Link to avoid nested interactive elements */}
      <div className="pr-4 flex-shrink-0 flex items-center gap-2">
        <button
          onClick={onMessage}
          className="p-2 rounded-xl bg-white/[0.06] text-cream/40 border border-white/[0.06] hover:bg-white/[0.12] hover:text-cream/70 transition-all"
          aria-label={`Message ${collector.name}`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>
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
      <div className="w-full aspect-square overflow-hidden">
        <img
          src={item.imageSmall}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
  const { data: session, status } = useSession();
  const { addFromCatalog, removeItem: removeInventoryItem, showToast: showInventoryToast } = useInventory();
  const [activeTab, setActiveTab] = useState<"Market" | "Collectors">(
    searchParams.get("tab") === "Collectors" ? "Collectors" : "Market",
  );
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const isGuest = !session?.user?.id && status !== "loading";
  const [guestContext, setGuestContext] = useState<string | null>(null);

  // ── Collectors tab state ──────────────────────────────────────────────────
  const [dbCollectors,       setDbCollectors]       = useState<Collector[]>([]);
  const [collectorsLoading,  setCollectorsLoading]  = useState(false);
  const [collectorsCatFilter,    setCollectorsCatFilter]    = useState("");
  const [collectorsMinValue,     setCollectorsMinValue]     = useState(0); // 0 = any
  const [collectorsQuery,          setCollectorsQuery]          = useState("");
  const [collectorsPaymentFilter, setCollectorsPaymentFilter] = useState<Set<string>>(new Set());
  const [collectorsShippingFilter, setCollectorsShippingFilter] = useState<Set<string>>(new Set());
  const [collectorsProOnly,      setCollectorsProOnly]      = useState(false);
  const [collectorsMinRating,    setCollectorsMinRating]    = useState(0); // 0 = any
  const collectorsLoadedRef = useRef(false);

  // For real users, find-or-create a conversation and navigate to its ID.
  // For demo users, navigate directly by handle (matches CHAT_DATA keys).
  const handleMessage = async (collector: Collector) => {
    if (isGuest) { setGuestContext("send a message"); return; }
    if (isDemoUser(session?.user?.email) || !session?.user?.id) {
      router.push(`/inbox/${collector.handle}`);
      return;
    }
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId:     collector.id,
          recipientName:   collector.name,
          recipientAvatar: collector.avatar,
        }),
      });
      const data = await res.json() as { id?: string };
      if (data.id) {
        router.push(`/inbox/${data.id}`);
      } else {
        router.push(`/inbox/${collector.handle}`);
      }
    } catch {
      router.push(`/inbox/${collector.handle}`);
    }
  };

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
    if (isGuest) { setGuestContext("add items to your vault"); return; }
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

    // Optimistic update via InventoryContext (updates shared state + localStorage cache)
    addFromCatalog(addItem, {
      askingPrice: config.askingPrice,
      condition:   config.condition,
      status:      config.status,
      notes:       config.notes,
      customImage: config.customImage,
    });

    setAddItem(null);

    // Persist to DB for real users
    if (!isDemoUser(session?.user?.email) && status === "authenticated") {
      const imageUrl = config.customImage || addItem.imageLarge || addItem.imageSmall || "";
      fetch("/api/items", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          title:          addItem.name,
          category:       mapCatalogCategory(addItem.category),
          imageUrl,
          estimatedValue: config.askingPrice ?? null,
          upForTrade:     config.status === "For Trade",
          status:         "VAULT",
        }),
      })
        .then(async (r) => {
          if (r.status === 403) {
            const d = await r.json() as { code?: string };
            if (d.code === "UPGRADE_REQUIRED") {
              router.push("/upgrade");
            }
          }
        })
        .catch(() => {});
    }
  };

  const toggleFollow = (id: string) => {
    if (isGuest) { setGuestContext("follow collectors"); return; }
    const isFollowing = followedIds.has(id);
    // Optimistic update
    setFollowedIds((prev) => {
      const next = new Set(prev);
      isFollowing ? next.delete(id) : next.add(id);
      return next;
    });
    // Sync to DB
    if (isFollowing) {
      fetch(`/api/follow?userId=${id}`, { method: "DELETE" }).catch(() => {});
    } else {
      fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followingId: id }),
      }).catch(() => {});
    }
  };

  // ── Load initial follow list from DB ─────────────────────────────────────
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/follow?list=following")
      .then((r) => r.ok ? r.json() : null)
      .then((data: { follows: Array<{ followingId: string }> } | null) => {
        if (data?.follows) {
          setFollowedIds(new Set(data.follows.map((f) => f.followingId)));
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // ── Fetch real DB collectors when the tab is visible or filters change ───────
  useEffect(() => {
    if (activeTab !== "Collectors" || status === "loading") return;
    if (status === "unauthenticated") return;
    // All authenticated users fetch from DB (demo users see mocks + any DB results)

    // Avoid hammering the API on first render; use a ref to allow re-fetch on filter change
    setCollectorsLoading(true);
    const params = new URLSearchParams();
    if (collectorsCatFilter) params.set("category", collectorsCatFilter);
    if (collectorsMinValue > 0) params.set("minValue", String(collectorsMinValue));
    fetch(`/api/users?${params.toString()}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { collectors: Collector[] } | null) => {
        // Always update DB state (even empty array) — null means fetch failed
        if (data !== null) setDbCollectors(data.collectors ?? []);
      })
      .catch(() => {})
      .finally(() => setCollectorsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, status, collectorsCatFilter, collectorsMinValue]);

  // Always show DB users first, mocks fill remaining slots (no duplicate handles)
  const dbHandleSet = new Set(dbCollectors.map((c) => c.handle));
  const allCollectors = [...dbCollectors, ...COLLECTORS.filter((c) => !dbHandleSet.has(c.handle))];
  const filteredCollectors = allCollectors.filter((c) => {
    if (collectorsQuery.trim()) {
      const q = normalize(collectorsQuery);
      const nameMatch =
        normalize(c.name).includes(q) ||
        normalize(c.handle).includes(q) ||
        c.categories.some((cat) => normalize(cat).includes(q));
      if (!nameMatch) return false;
    }
    if (collectorsCatFilter && !c.categories.some((cat) => normalize(cat).includes(normalize(collectorsCatFilter)))) return false;
    if (collectorsMinValue > 0 && c.collectionValue < collectorsMinValue) return false;
    if (collectorsPaymentFilter.size > 0 && !c.paymentMethods.some((m) => collectorsPaymentFilter.has(m))) return false;
    if (collectorsShippingFilter.size > 0 && !c.shippingPreferences.some((s) => collectorsShippingFilter.has(s))) return false;
    if (collectorsProOnly && !c.isPro) return false;
    if (collectorsMinRating > 0 && c.trustScore < collectorsMinRating) return false;
    return true;
  });

  if (status === "loading") return null;

  return (
    <div className="min-h-screen pb-20 bg-background">
      <Header />

      <main className="max-w-lg mx-auto" data-tour="explore-feed">

        {/* ── Global Market Ticker ── */}
        <MarketTicker />

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
                        <div className="aspect-square overflow-hidden">
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
          <div className="px-5 pb-6 space-y-3">

            {/* ── Collector search input ─────────────────────────────── */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cream/25 pointer-events-none" />
              <input
                type="text"
                value={collectorsQuery}
                onChange={(e) => setCollectorsQuery(e.target.value)}
                placeholder="Search by name or @handle…"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-background-light border border-white/[0.07] text-sm text-cream placeholder:text-cream/25 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
              />
              {collectorsQuery && (
                <button
                  onClick={() => setCollectorsQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-cream/30 hover:text-cream/60"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* ── Filters ──────────────────────────────────────────────── */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-cream/25 uppercase tracking-widest">Filter Collectors By</p>

              {/* Category interest pills */}
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
                {["", "Pokémon TCG", "Sports Cards", "Funko Pop", "Lego", "Sneakers", "Watches", "Comics", "Coins"].map((cat) => (
                  <button
                    key={cat || "all"}
                    onClick={() => setCollectorsCatFilter(cat)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                      collectorsCatFilter === cat
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-white/[0.06] text-cream/40 border border-white/[0.06] hover:text-cream/60"
                    }`}
                  >
                    {cat || "All Categories"}
                  </button>
                ))}
              </div>

              {/* Vault value slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-cream/40 font-medium">Min Vault Value</span>
                  <span className="text-[11px] font-bold text-primary">
                    {collectorsMinValue === 0 ? "Any" : `$${(collectorsMinValue / 1000).toFixed(0)}k+`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100000}
                  step={5000}
                  value={collectorsMinValue}
                  onChange={(e) => setCollectorsMinValue(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary bg-white/[0.08]"
                />
                <div className="flex justify-between text-[9px] text-cream/20 font-medium">
                  <span>Any</span>
                  <span>$25k</span>
                  <span>$50k</span>
                  <span>$100k+</span>
                </div>
              </div>

              {/* Advanced filters */}
              <div className="rounded-2xl bg-white/[0.025] border border-white/[0.06] p-4 space-y-3">
                <p className="text-[9px] font-bold text-cream/25 uppercase tracking-widest">Advanced</p>

                {/* Payment multi-select pills — matches EditProfileModal PAYMENT_OPTIONS */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-cream/35 uppercase tracking-wide">Payment</label>
                  <div className="flex gap-2 flex-wrap">
                    {["PayPal", "Venmo", "Cash", "Bank Transfer", "Crypto", "Trade Only"].map((method) => {
                      const active = collectorsPaymentFilter.has(method);
                      return (
                        <button
                          key={method}
                          onClick={() => setCollectorsPaymentFilter((prev) => {
                            const next = new Set(prev);
                            active ? next.delete(method) : next.add(method);
                            return next;
                          })}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${
                            active
                              ? "bg-primary/20 text-primary border-primary/30"
                              : "bg-white/[0.05] text-cream/40 border-white/[0.07] hover:text-cream/60 hover:bg-white/[0.09]"
                          }`}
                        >
                          {method}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Shipping multi-select pills — matches EditProfileModal SHIPPING_OPTIONS */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-cream/35 uppercase tracking-wide">Shipping</label>
                  <div className="flex gap-2 flex-wrap">
                    {["Worldwide Shipping", "Local Pickup", "Convention Meetup", "Insured Shipping", "Middleman Service"].map((pref) => {
                      const active = collectorsShippingFilter.has(pref);
                      return (
                        <button
                          key={pref}
                          onClick={() => setCollectorsShippingFilter((prev) => {
                            const next = new Set(prev);
                            active ? next.delete(pref) : next.add(pref);
                            return next;
                          })}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${
                            active
                              ? "bg-primary/20 text-primary border-primary/30"
                              : "bg-white/[0.05] text-cream/40 border-white/[0.07] hover:text-cream/60 hover:bg-white/[0.09]"
                          }`}
                        >
                          {pref}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Toggle chips row */}
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => setCollectorsProOnly((v) => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border flex-1 justify-center ${
                      collectorsProOnly
                        ? "bg-primary/20 text-primary border-primary/30 shadow-sm shadow-primary/10"
                        : "bg-white/[0.04] text-cream/40 border-white/[0.07] hover:bg-white/[0.08] hover:text-cream/60"
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    Pro Only
                  </button>
                  <button
                    onClick={() => setCollectorsMinRating((v) => v === 4 ? 0 : 4)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border flex-1 justify-center ${
                      collectorsMinRating >= 4
                        ? "bg-primary/20 text-primary border-primary/30 shadow-sm shadow-primary/10"
                        : "bg-white/[0.04] text-cream/40 border-white/[0.07] hover:bg-white/[0.08] hover:text-cream/60"
                    }`}
                  >
                    <Star className="w-3 h-3" />
                    4+ Stars
                  </button>
                  {(collectorsPaymentFilter.size > 0 || collectorsShippingFilter.size > 0 || collectorsProOnly || collectorsMinRating > 0) && (
                    <button
                      onClick={() => { setCollectorsPaymentFilter(new Set()); setCollectorsShippingFilter(new Set()); setCollectorsProOnly(false); setCollectorsMinRating(0); }}
                      className="px-2.5 py-1.5 rounded-xl text-[10px] text-cream/30 hover:text-cream/60 border border-white/[0.06] hover:border-white/[0.12] transition-all"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Count + loading */}
            <div className="flex items-center gap-2">
              <p className="text-xs text-cream/30 font-medium">
                {collectorsLoading ? "Loading…" : (
                  `${filteredCollectors.length} collector${filteredCollectors.length !== 1 ? "s" : ""}${collectorsQuery.trim() ? ` matching "${collectorsQuery}"` : ""}`
                )}
              </p>
              {collectorsLoading && (
                <Loader2 className="w-3 h-3 text-cream/30 animate-spin" />
              )}
            </div>

            {filteredCollectors.length === 0 && !collectorsLoading ? (
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
                    onMessage={() => handleMessage(c)}
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

      <GuestAuthModal
        isOpen={!!guestContext}
        onClose={() => setGuestContext(null)}
        context={guestContext ?? undefined}
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
