"use client";
export const dynamic = "force-dynamic";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useRef, useState, useEffect } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { isDemoUser } from "@/lib/demo";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ProposeTradeModal from "@/components/ProposeTradeModal";
import ReviewsListModal from "@/components/ReviewsListModal";
import AddItemModal from "@/components/AddItemModal";
import { socialUsers, type SocialUser } from "@/lib/data";
import { CollectibleItem } from "@/lib/types";
import { formatValue } from "@/lib/format";
import { useInventory } from "@/lib/InventoryContext";
import { type Achievement, ACHIEVEMENTS } from "@/lib/achievements";
import { useAchievements } from "@/lib/AchievementsContext";
import AchievementModal from "@/components/AchievementModal";
import GuestAuthModal   from "@/components/GuestAuthModal";
import PortfolioChart   from "@/components/PortfolioChart";
import {
  ArrowLeft,
  ArrowLeftRight,
  Award,
  Bell,
  Calendar,
  Crosshair,
  Target,
  CreditCard,
  Crown,
  Database,
  Lock,
  Mail,
  Package,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
  TrendingUp,
  Truck,
  UserCheck,
  UserPlus,
  Zap,
} from "lucide-react";

// ── Radar types + per-user seed data ─────────────────────────────────────────

type RadarEntry = {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  marketValue: number;
  budget?: string;
  trading?: string;
};

// ── Item image pools by category (for auto-generated mock vault items) ────────
const MOCK_ITEM_POOLS: Record<string, { name: string; imageUrl: string; baseValue: number }[]> = {
  "Pokémon TCG": [
    { name: "Charizard Base Set (Holo)", imageUrl: "https://images.pokemontcg.io/base1/4.png",   baseValue: 3200 },
    { name: "Umbreon VMAX Alt Art",      imageUrl: "https://images.pokemontcg.io/swsh7/215.png", baseValue: 310  },
    { name: "Mew ex Special Art Rare",   imageUrl: "https://images.pokemontcg.io/sv3pt5/205.png",baseValue: 420  },
    { name: "Lugia (Neo Genesis) BGS 9", imageUrl: "https://images.pokemontcg.io/neo1/9.png",    baseValue: 490  },
    { name: "Blastoise Base Set",        imageUrl: "https://images.pokemontcg.io/base1/2.png",   baseValue: 2100 },
    { name: "Rayquaza VMAX Alt Art",     imageUrl: "https://images.pokemontcg.io/swsh7/218.png", baseValue: 260  },
  ],
  "Watches": [
    { name: "Rolex Submariner Date",     imageUrl: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=400&h=400&fit=crop", baseValue: 12000 },
    { name: "Patek Philippe Nautilus",   imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop", baseValue: 35000 },
    { name: "Audemars Piguet Royal Oak", imageUrl: "https://images.unsplash.com/photo-1594534475808-b18fc33b045e?w=400&h=400&fit=crop", baseValue: 28000 },
    { name: "Omega Speedmaster",         imageUrl: "https://images.unsplash.com/photo-1584468198886-2e3bb37b2b1e?w=400&h=400&fit=crop", baseValue: 4500  },
  ],
  "Sports Cards": [
    { name: "Michael Jordan 1986 Fleer RC",  imageUrl: "https://images.unsplash.com/photo-1518791841217-8f162f1912da?w=400&h=400&fit=crop", baseValue: 8500 },
    { name: "LeBron James 2003 Topps RC",    imageUrl: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=400&fit=crop", baseValue: 4200 },
    { name: "Shohei Ohtani 2018 Topps RC",   imageUrl: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400&h=400&fit=crop", baseValue: 3600 },
    { name: "Patrick Mahomes 2017 Prizm RC", imageUrl: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&h=400&fit=crop", baseValue: 1200 },
  ],
  "Sneakers": [
    { name: "Air Jordan 1 OG 'Chicago'", imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop", baseValue: 18000 },
    { name: "Nike Air Mag (2011)",        imageUrl: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=400&h=400&fit=crop", baseValue: 28000 },
    { name: "Yeezy 350 V2 'Zebra'",       imageUrl: "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=400&h=400&fit=crop", baseValue: 450   },
    { name: "Nike Dunk Low 'Panda'",      imageUrl: "https://images.unsplash.com/photo-1605408499391-6368c628ef42?w=400&h=400&fit=crop", baseValue: 180   },
  ],
  "Lego": [
    { name: "Millennium Falcon #75192",      imageUrl: "https://cdn.rebrickable.com/media/sets/75192-1.jpg", baseValue: 850 },
    { name: "Technic Bugatti Chiron #42083", imageUrl: "https://cdn.rebrickable.com/media/sets/42083-1.jpg", baseValue: 400 },
    { name: "Architecture Taj Mahal #10256", imageUrl: "https://cdn.rebrickable.com/media/sets/10256-1.jpg", baseValue: 370 },
    { name: "AT-AT Walker #75313",            imageUrl: "https://cdn.rebrickable.com/media/sets/75313-1.jpg", baseValue: 850 },
  ],
  "Comics": [
    { name: "Amazing Fantasy #15",      imageUrl: "https://images.unsplash.com/photo-1612036782180-f82956ef2431?w=400&h=400&fit=crop", baseValue: 25000 },
    { name: "X-Men #1 (1963)",          imageUrl: "https://images.unsplash.com/photo-1601645191163-3fc0d5d64e35?w=400&h=400&fit=crop", baseValue: 8500  },
    { name: "Amazing Spider-Man #300",  imageUrl: "https://images.unsplash.com/photo-1531259683007-016a7b628fc3?w=400&h=400&fit=crop", baseValue: 1200  },
  ],
  "Funko Pop": [
    { name: "Freddy Funko Ghost Rider SDCC", imageUrl: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&h=400&fit=crop", baseValue: 33500 },
    { name: "Batman (SDCC 2016)",             imageUrl: "https://images.unsplash.com/photo-1563396983906-b3795482a59a?w=400&h=400&fit=crop", baseValue: 4500  },
    { name: "Alien (Chrome) NYCC",            imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop", baseValue: 850   },
  ],
  "Video Games": [
    { name: "Super Mario Bros NES Sealed (VGA 85)", imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=400&fit=crop", baseValue: 12000 },
    { name: "Pokémon Gold GBC Sealed (CGC 9.8)",    imageUrl: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&h=400&fit=crop", baseValue: 3200  },
    { name: "Zelda: Ocarina of Time (CGC 9.8)",     imageUrl: "https://images.unsplash.com/photo-1535016120720-40c646be5580?w=400&h=400&fit=crop", baseValue: 4800  },
  ],
  "Coins": [
    { name: "1933 Saint-Gaudens Double Eagle", imageUrl: "https://images.unsplash.com/photo-1611324503583-c8b2af52c7d3?w=400&h=400&fit=crop", baseValue: 180000 },
    { name: "1794 Flowing Hair Silver Dollar", imageUrl: "https://images.unsplash.com/photo-1568952433726-3896e3881c65?w=400&h=400&fit=crop", baseValue: 85000  },
    { name: "Morgan Silver Dollar (MS65)",      imageUrl: "https://images.unsplash.com/photo-1608096299210-db7e38487075?w=400&h=400&fit=crop", baseValue: 450    },
  ],
};

// Compact seed data for all 50 mock collectors — covers handles not in socialUsers
const MOCK_PROFILES: Record<string, { name: string; avatar: string; categories: string[]; collectionValue: number; trades: number; trustScore: number; isPro: boolean }> = {
  sam:    { name: "Sam",    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam&backgroundColor=FCF9D5",    categories: ["Pokémon TCG"],            collectionValue: 14500,   trades: 91,  trustScore: 4.8, isPro: true  },
  alex:   { name: "Alex",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=AA95C5",   categories: ["Funko Pop"],              collectionValue: 48000,   trades: 27,  trustScore: 4.7, isPro: true  },
  jordan: { name: "Jordan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan&backgroundColor=CAE6CE", categories: ["Sneakers"],               collectionValue: 9800,    trades: 44,  trustScore: 4.5, isPro: false },
  riley:  { name: "Riley",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Riley&backgroundColor=FFD9E8",  categories: ["Comics", "Video Games"],  collectionValue: 5600,    trades: 15,  trustScore: 4.3, isPro: false },
  mia:    { name: "Mia",    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia&backgroundColor=ffd5dc",    categories: ["Watches"],                collectionValue: 125000,  trades: 112, trustScore: 4.9, isPro: true  },
  carlos: { name: "Carlos", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos&backgroundColor=b6e3f4", categories: ["Sports Cards"],           collectionValue: 87000,   trades: 87,  trustScore: 4.8, isPro: true  },
  zoe:    { name: "Zoe",    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe&backgroundColor=c0aede",    categories: ["Pokémon TCG"],            collectionValue: 8500,    trades: 22,  trustScore: 4.4, isPro: false },
  marcus: { name: "Marcus", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus&backgroundColor=CAE6CE", categories: ["Lego"],                   collectionValue: 210000,  trades: 204, trustScore: 4.9, isPro: true  },
  priya:  { name: "Priya",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya&backgroundColor=FFD9E8",  categories: ["Comics"],                 collectionValue: 4200,    trades: 11,  trustScore: 4.1, isPro: false },
  tyler:  { name: "Tyler",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tyler&backgroundColor=b6e3f4",  categories: ["Sneakers"],               collectionValue: 95000,   trades: 76,  trustScore: 4.7, isPro: true  },
  sofia:  { name: "Sofia",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia&backgroundColor=ffd5dc",  categories: ["Watches"],                collectionValue: 450000,  trades: 319, trustScore: 5.0, isPro: true  },
  jake:   { name: "Jake",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jake&backgroundColor=FCF9D5",   categories: ["Video Games"],            collectionValue: 3100,    trades: 8,   trustScore: 4.0, isPro: false },
  naomi:  { name: "Naomi",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Naomi&backgroundColor=AA95C5",  categories: ["Pokémon TCG"],            collectionValue: 32000,   trades: 55,  trustScore: 4.8, isPro: true  },
  darius: { name: "Darius", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Darius&backgroundColor=b6e3f4", categories: ["Sports Cards"],           collectionValue: 156000,  trades: 143, trustScore: 4.9, isPro: true  },
  emma:   { name: "Emma",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma&backgroundColor=FFD9E8",   categories: ["Funko Pop"],              collectionValue: 7800,    trades: 19,  trustScore: 4.2, isPro: false },
  kai:    { name: "Kai",    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kai&backgroundColor=CAE6CE",    categories: ["Lego"],                   collectionValue: 67000,   trades: 61,  trustScore: 4.6, isPro: true  },
  aria:   { name: "Aria",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aria&backgroundColor=c0aede",   categories: ["Comics"],                 collectionValue: 89000,   trades: 98,  trustScore: 4.8, isPro: true  },
  noah:   { name: "Noah",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Noah&backgroundColor=FCF9D5",   categories: ["Sneakers"],               collectionValue: 2300,    trades: 7,   trustScore: 3.9, isPro: false },
  luna:   { name: "Luna",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna&backgroundColor=ffd5dc",   categories: ["Watches"],                collectionValue: 1200000, trades: 441, trustScore: 4.9, isPro: true  },
  felix:  { name: "Felix",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=B5EAD7",  categories: ["Pokémon TCG"],            collectionValue: 11000,   trades: 33,  trustScore: 4.5, isPro: false },
  zara:   { name: "Zara",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zara&backgroundColor=AA95C5",   categories: ["Coins"],                  collectionValue: 325000,  trades: 188, trustScore: 4.8, isPro: true  },
  hunter: { name: "Hunter", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Hunter&backgroundColor=b6e3f4", categories: ["Sports Cards"],           collectionValue: 6400,    trades: 24,  trustScore: 4.3, isPro: false },
  isla:   { name: "Isla",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Isla&backgroundColor=FFD9E8",   categories: ["Pokémon TCG"],            collectionValue: 78000,   trades: 72,  trustScore: 4.9, isPro: true  },
  river:  { name: "River",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=River&backgroundColor=CAE6CE",  categories: ["Sneakers"],               collectionValue: 4800,    trades: 16,  trustScore: 4.1, isPro: false },
  sage:   { name: "Sage",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sage&backgroundColor=c0aede",   categories: ["Comics"],                 collectionValue: 5200,    trades: 14,  trustScore: 4.2, isPro: false },
  quinn:  { name: "Quinn",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Quinn&backgroundColor=ffd5dc",  categories: ["Funko Pop"],              collectionValue: 43000,   trades: 49,  trustScore: 4.7, isPro: true  },
  devon:  { name: "Devon",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Devon&backgroundColor=FCF9D5",  categories: ["Video Games"],            collectionValue: 1800,    trades: 5,   trustScore: 3.8, isPro: false },
  skylar: { name: "Skylar", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Skylar&backgroundColor=B5EAD7", categories: ["Lego"],                   collectionValue: 112000,  trades: 95,  trustScore: 4.8, isPro: true  },
  remy:   { name: "Remy",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Remy&backgroundColor=AA95C5",   categories: ["Watches"],                collectionValue: 580000,  trades: 267, trustScore: 5.0, isPro: true  },
  casey:  { name: "Casey",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Casey&backgroundColor=b6e3f4",  categories: ["Sports Cards"],           collectionValue: 9100,    trades: 31,  trustScore: 4.4, isPro: false },
  morgan: { name: "Morgan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Morgan&backgroundColor=CAE6CE", categories: ["Pokémon TCG"],            collectionValue: 245000,  trades: 177, trustScore: 4.9, isPro: true  },
  avery:  { name: "Avery",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Avery&backgroundColor=ffd5dc",  categories: ["Sneakers"],               collectionValue: 7200,    trades: 28,  trustScore: 4.3, isPro: false },
  brett:  { name: "Brett",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Brett&backgroundColor=FCF9D5",  categories: ["Comics"],                 collectionValue: 67000,   trades: 66,  trustScore: 4.6, isPro: true  },
  hana:   { name: "Hana",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Hana&backgroundColor=FFD9E8",   categories: ["Coins"],                  collectionValue: 15000,   trades: 42,  trustScore: 4.5, isPro: false },
  leo:    { name: "Leo",    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo&backgroundColor=c0aede",    categories: ["Lego"],                   collectionValue: 3400,    trades: 9,   trustScore: 4.0, isPro: false },
  vera:   { name: "Vera",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vera&backgroundColor=AA95C5",   categories: ["Watches"],                collectionValue: 890000,  trades: 388, trustScore: 4.9, isPro: true  },
  omar:   { name: "Omar",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Omar&backgroundColor=b6e3f4",   categories: ["Sports Cards"],           collectionValue: 134000,  trades: 121, trustScore: 4.7, isPro: true  },
  chloe:  { name: "Chloe",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chloe&backgroundColor=ffd5dc",  categories: ["Pokémon TCG"],            collectionValue: 6800,    trades: 20,  trustScore: 4.2, isPro: false },
  finn:   { name: "Finn",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Finn&backgroundColor=CAE6CE",   categories: ["Video Games"],            collectionValue: 42000,   trades: 53,  trustScore: 4.6, isPro: true  },
  jade:   { name: "Jade",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jade&backgroundColor=B5EAD7",   categories: ["Sneakers"],               collectionValue: 185000,  trades: 134, trustScore: 4.8, isPro: true  },
  marco:  { name: "Marco",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marco&backgroundColor=FCF9D5",  categories: ["Coins"],                  collectionValue: 475000,  trades: 211, trustScore: 4.9, isPro: true  },
  nora:   { name: "Nora",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nora&backgroundColor=FFD9E8",   categories: ["Comics"],                 collectionValue: 2900,    trades: 10,  trustScore: 4.1, isPro: false },
  theo:   { name: "Theo",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Theo&backgroundColor=c0aede",   categories: ["Lego"],                   collectionValue: 89000,   trades: 79,  trustScore: 4.7, isPro: true  },
  elise:  { name: "Elise",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elise&backgroundColor=ffd5dc",  categories: ["Watches"],                collectionValue: 18000,   trades: 37,  trustScore: 4.4, isPro: false },
  caden:  { name: "Caden",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Caden&backgroundColor=AA95C5",  categories: ["Funko Pop"],              collectionValue: 64000,   trades: 58,  trustScore: 4.6, isPro: true  },
  ivy:    { name: "Ivy",    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ivy&backgroundColor=B5EAD7",    categories: ["Pokémon TCG"],            collectionValue: 1500000, trades: 503, trustScore: 5.0, isPro: true  },
  ash:    { name: "Ash",    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ash&backgroundColor=b6e3f4",    categories: ["Sports Cards"],           collectionValue: 4100,    trades: 13,  trustScore: 3.7, isPro: false },
  max:    { name: "Max",    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Max&backgroundColor=CAE6CE",    categories: ["Sneakers"],               collectionValue: 230000,  trades: 156, trustScore: 4.8, isPro: true  },
};

// Builds a SocialUser-compatible object for any of the 50 mock collectors
function buildMockSocialUser(handle: string): SocialUser | null {
  const data = MOCK_PROFILES[handle];
  if (!data) return null;

  const h = handle.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const inventory: import("@/lib/types").CollectibleItem[] = [];

  for (let ci = 0; ci < data.categories.length && inventory.length < 8; ci++) {
    const cat = data.categories[ci];
    const pool = MOCK_ITEM_POOLS[cat] ?? MOCK_ITEM_POOLS["Pokémon TCG"];
    const n = Math.min(4, pool.length);
    for (let i = 0; i < n && inventory.length < 8; i++) {
      const item = pool[(h + i + ci * 3) % pool.length];
      if (inventory.some((x) => x.name === item.name)) continue;
      const poolTotal = pool.reduce((s, p) => s + p.baseValue, 0);
      const ratio     = data.collectionValue / Math.max(poolTotal, 1);
      const val       = Math.round(item.baseValue * Math.max(0.3, Math.min(ratio, 8)));
      inventory.push({
        id:             `${handle}-${ci}-${i}`,
        name:           item.name,
        category:       cat as import("@/lib/types").CollectibleItem["category"],
        imageUrl:       item.imageUrl,
        estimatedValue: val,
        upForTrade:     (h + i) % 3 === 0,
      });
    }
  }

  const grailIds   = inventory.slice(0, 3).map((x) => x.id);
  const joinYear   = 2022 + (h % 3);
  const joinMonth  = String(1  + (h % 12)).padStart(2, "0");
  const joinDay    = String(1  + (h % 28)).padStart(2, "0");

  const CAT_BIOS: Record<string, string> = {
    "Pokémon TCG":  "Pokémon collector & trader. Always hunting alt arts and PSA 10s.",
    "Watches":      "Horology enthusiast. Grails only. Serious inquiries welcome.",
    "Sports Cards": "Sports card collector. PSA/BGS graded. Fair trades always.",
    "Sneakers":     "Sneakerhead. Deadstock pairs, rare colorways. Let's connect.",
    "Lego":         "Lego collector — sets & MOCs. Sealed preferred. Trade-friendly.",
    "Comics":       "Comics & graphic novel collector. Key issues and grail variants.",
    "Funko Pop":    "Funko exclusive hunter. SDCC, conventions, chases only.",
    "Video Games":  "Sealed game collector. CGC graded. Retro to modern.",
    "Coins":        "Numismatist — rare coins & bullion. PCGS/NGC graded only.",
  };

  return {
    user: {
      id:           `user-${handle}`,
      name:         data.name,
      handle,
      avatar:       data.avatar,
      bio:          CAT_BIOS[data.categories[0]] ?? "Passionate collector. DM to trade.",
      trustScore:   data.trustScore,
      totalTrades:  data.trades,
      memberSince:  `${joinYear}-${joinMonth}-${joinDay}`,
      tier:         data.isPro ? "pro" : "free",
    },
    inventory,
    grailIds,
  };
}

const RADAR_BY_HANDLE: Record<string, RadarEntry[]> = {
  drew: [
    { id: "dr-r1", name: "Pikachu Illustrator (PSA 9)", imageUrl: "https://images.pokemontcg.io/swsh12pt5/67.png", category: "Pokémon TCG", marketValue: 350000, budget: "$400K+" },
    { id: "dr-r2", name: "Charizard (Base Set) PSA 10", imageUrl: "https://images.pokemontcg.io/base1/4.png",       category: "Pokémon TCG", marketValue: 12000,  trading: "Lugia Neo Genesis BGS 9 + cash" },
    { id: "dr-r3", name: "Blastoise (Base Set) PSA 10", imageUrl: "https://images.pokemontcg.io/base1/2.png",       category: "Pokémon TCG", marketValue: 8500,   budget: "$9,000" },
  ],
  ethan: [
    { id: "et-r1", name: "Honus Wagner T206 (VG)", imageUrl: "https://images.unsplash.com/photo-1612404819070-1b5e6791e6ad?w=400&h=400&fit=crop", category: "Sports Cards", marketValue: 12000, budget: "$15,000" },
    { id: "et-r2", name: "Freddy Funko Ghost Rider Metallic (SDCC 2013)", imageUrl: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&h=400&fit=crop&auto=format&q=80&seed=5", category: "Funko Pop", marketValue: 33500, trading: "Freddy Batman SDCC 2016 + cash" },
  ],
  alex: [
    { id: "al-r1", name: "LEGO Star Wars Millennium Falcon #75192", imageUrl: "https://cdn.rebrickable.com/media/sets/75192-1.jpg", category: "Lego", marketValue: 890, budget: "$1,000" },
    { id: "al-r2", name: "Mew ex Special Art Rare",   imageUrl: "https://images.pokemontcg.io/sv3pt5/205.png", category: "Pokémon TCG", marketValue: 420, trading: "Umbreon VMAX Alt Art" },
  ],
};

// ── Per-user achievements (subset of global ACHIEVEMENTS with personal dates) ─

/** IDs of achievements unlocked by each user, with their own unlock date + catalyst */
const USER_ACHIEVEMENTS: Record<string, Achievement[]> = {
  drew: [
    {
      ...ACHIEVEMENTS.find((a) => a.id === "heavyweight")!,
      unlockedAt:   "Mar 2, 2026",
      catalystItem: { name: "Charizard Base Set PSA 10", imageUrl: "https://images.pokemontcg.io/base1/4_hires.png" },
    },
    {
      ...ACHIEVEMENTS.find((a) => a.id === "dealmaker")!,
      unlockedAt:   "Nov 18, 2025",
      catalystItem: { name: "Pikachu Illustrator PSA 9", imageUrl: "https://images.pokemontcg.io/swsh12pt5/67.png" },
    },
    { ...ACHIEVEMENTS.find((a) => a.id === "first-blood")!,   unlockedAt: "Apr 5, 2023" },
    { ...ACHIEVEMENTS.find((a) => a.id === "early-adopter")!, unlockedAt: "Aug 1, 2024" },
  ],
  ethan: [
    {
      ...ACHIEVEMENTS.find((a) => a.id === "heavyweight")!,
      unlockedAt:   "Jan 10, 2026",
      catalystItem: { name: "Honus Wagner T206", imageUrl: "https://images.unsplash.com/photo-1612404819070-1b5e6791e6ad?w=200&q=80" },
    },
    {
      ...ACHIEVEMENTS.find((a) => a.id === "high-roller")!,
      unlockedAt:   "Oct 22, 2025",
      catalystItem: { name: "Freddy Funko SDCC Metallic", imageUrl: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=200&q=80" },
    },
    { ...ACHIEVEMENTS.find((a) => a.id === "first-blood")!, unlockedAt: "Jun 3, 2023" },
  ],
  alex: [
    { ...ACHIEVEMENTS.find((a) => a.id === "first-blood")!,   unlockedAt: "Dec 1, 2024" },
    { ...ACHIEVEMENTS.find((a) => a.id === "early-adopter")!, unlockedAt: "Aug 1, 2024" },
    {
      ...ACHIEVEMENTS.find((a) => a.id === "dealmaker")!,
      unlockedAt:   "Feb 7, 2026",
      catalystItem: { name: "Mew ex Special Art Rare", imageUrl: "https://images.pokemontcg.io/sv3pt5/205_hires.png" },
    },
  ],
  sam: [
    { ...ACHIEVEMENTS.find((a) => a.id === "first-blood")!,   unlockedAt: "Jan 14, 2025" },
    { ...ACHIEVEMENTS.find((a) => a.id === "early-adopter")!, unlockedAt: "Aug 1, 2024" },
  ],
  jordan: [
    { ...ACHIEVEMENTS.find((a) => a.id === "early-adopter")!, unlockedAt: "Sep 12, 2024" },
    { ...ACHIEVEMENTS.find((a) => a.id === "first-blood")!,   unlockedAt: "Mar 3, 2025" },
  ],
};

// ── Trust Stars ──────────────────────────────────────────────────────────────
function TrustStars({ score, reviewCount, onClick }: { score: number; reviewCount?: number; onClick?: () => void }) {
  if (score === 0) {
    return (
      <button onClick={onClick} className="flex items-center gap-1 rounded-lg transition-opacity hover:opacity-75">
        <span className="text-[10px] font-bold text-cream/30 bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 rounded-full">
          New collector
        </span>
      </button>
    );
  }
  const full = Math.floor(score);
  const half = score - full >= 0.5;
  return (
    <button onClick={onClick} className="flex items-center gap-0.5 rounded-lg transition-opacity hover:opacity-75">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < full
              ? "text-yellow-400 fill-yellow-400"
              : i === full && half
              ? "text-yellow-400 fill-yellow-400/50"
              : "text-cream/15"
          }`}
        />
      ))}
      <span className="text-xs text-cream/50 ml-1 font-semibold">{score.toFixed(1)}</span>
      {reviewCount != null && (
        <span className="text-[10px] text-cream/30 ml-0.5 font-medium">({reviewCount})</span>
      )}
    </button>
  );
}

// ── Item Card (read-only) ────────────────────────────────────────────────────
function ItemCard({ item, index, onTap }: { item: CollectibleItem; index: number; onTap: () => void }) {
  const whiteBg    = item.category === "Lego" || item.category === "Funko Pop";
  const notTrading = item.upForTrade === false;
  return (
    <button
      onClick={onTap}
      className={`relative rounded-2xl overflow-hidden bg-background-light shadow-soft group cursor-pointer text-left w-full animate-scale-in ${notTrading ? "opacity-50" : ""}`}
      style={{ animationDelay: `${Math.min(index, 15) * 0.04}s`, animationFillMode: "both" }}
    >
      <div className={`aspect-square flex items-center justify-center ${whiteBg ? "bg-white p-2" : "bg-white/[0.05] p-3"}`}>
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {notTrading && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/60 text-[8px] font-bold text-white/60 leading-none">
            Not Trading
          </div>
        )}
      </div>
      <div className="px-2 py-1.5">
        <p className="text-[10px] text-cream/80 truncate leading-tight font-medium">{item.name}</p>
        {item.estimatedValue != null && (
          <p className="text-[9px] text-primary/70 font-semibold mt-0.5">{formatValue(item.estimatedValue)}</p>
        )}
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ██  PUBLIC PROFILE PAGE  ████████████████████████████████████████████████████
// ═══════════════════════════════════════════════════════════════════════════════

// Builds a SocialUser from a real DB profile + items
function buildDbSocialUser(
  profile: { userId: string; name: string; handle?: string | null; avatar: string; bio: string; interests: string[]; pinnedItemIds: string[]; paymentMethods: string[]; shippingPreferences: string[]; tier?: string },
  items:   Array<{ id: string; title: string; category: string; imageUrl: string; estimatedValue: number | null; upForTrade: boolean }>,
  handle:  string,
): SocialUser {
  const inventory: CollectibleItem[] = items.map((i) => ({
    id:             i.id,
    name:           i.title,
    category:       i.category as CollectibleItem["category"],
    imageUrl:       i.imageUrl,
    estimatedValue: i.estimatedValue ?? undefined,
    upForTrade:     i.upForTrade,
  }));

  const grailIds =
    profile.pinnedItemIds.length > 0
      ? profile.pinnedItemIds
      : [...inventory]
          .sort((a, b) => (b.estimatedValue ?? 0) - (a.estimatedValue ?? 0))
          .slice(0, 3)
          .map((i) => i.id);

  // Prefer stored DB handle; fall back to URL param (which may be a UUID for direct links)
  const displayHandle = profile.handle?.trim() || handle;
  return {
    user: {
      id:          profile.userId,
      name:        profile.name.trim() || displayHandle,
      handle:      displayHandle,
      avatar:      profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile.userId)}&backgroundColor=b6e3f4,c0aede,ffd5dc`,
      bio:         profile.bio || "Passionate collector. DM to trade.",
      trustScore:  0,
      totalTrades: 0,
      memberSince: "2025-01-01",
      tier:        (profile.tier === "pro" ? "pro" : "free") as "pro" | "free",
    },
    inventory,
    grailIds,
  };
}

export default function PublicProfilePage() {
  const params  = useParams();
  const router  = useRouter();
  const handle  = (params.username as string)?.toLowerCase();

  // Detect if the route param is a DB ID (UUID or Prisma CUID) vs a display handle.
  // UUID: standard 8-4-4-4-12 hex  |  CUID: starts with 'c' + 24+ alphanumeric chars
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(handle ?? "");
  const isCuid = /^c[a-z0-9]{20,}$/i.test(handle ?? "");
  const isId   = isUuid || isCuid; // either format → use ?userId= lookup

  const mockUser = useMemo(() => {
    if (isId) return null; // never show mock data for direct userId routes
    const social = socialUsers.find((u) => u.user.handle?.toLowerCase() === handle);
    if (social) return social;
    // Only use the mock profile if the handle is in MOCK_PROFILES — avoids
    // showing stale fake data for real DB users whose handles aren't mocked.
    if (handle && handle in MOCK_PROFILES) return buildMockSocialUser(handle);
    return null; // unknown handle — DB fetch will run
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, isId]);

  // Always fetch DB — real data wins over mock seed data.
  // Mock is only used as fallback when DB returns 404 (demo/seed handles).
  type PublicProfileResponse = {
    found:    boolean;
    profile?: Parameters<typeof buildDbSocialUser>[0];
    items?:   Parameters<typeof buildDbSocialUser>[1];
    achievements?: Array<{ achievementId: string; unlockedAt: string; catalystName: string | null; catalystImage: string | null }>;
  };

  const profileUrl = handle
    ? (isId
        ? `/api/users/public?userId=${encodeURIComponent(handle)}`
        : `/api/users/public?handle=${encodeURIComponent(handle)}`)
    : null;

  const {
    data:      rawProfileData,
    isLoading: dbLoading,
    mutate:    mutateProfileSWR,
  } = useSWR<PublicProfileResponse | null>(
    profileUrl,
    (url: string) => fetch(url).then((r) => r.ok ? r.json() : null),
    { revalidateOnFocus: false },
  );

  const dbUser = useMemo(() => {
    if (!rawProfileData?.found || !rawProfileData.profile || !rawProfileData.items) return null;
    return buildDbSocialUser(rawProfileData.profile, rawProfileData.items, handle ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawProfileData]);

  const dbProfileRaw = useMemo(() => {
    if (!rawProfileData?.found || !rawProfileData.profile) return null;
    return {
      paymentMethods:      rawProfileData.profile.paymentMethods      ?? [],
      shippingPreferences: rawProfileData.profile.shippingPreferences ?? [],
    };
  }, [rawProfileData]);

  const dbAchievements = useMemo(
    () => (rawProfileData?.found ? (rawProfileData.achievements ?? []) : null),
    [rawProfileData],
  );

  // DB user wins; mock is only shown when DB returns 404 (demo / seed handles)
  const socialUser = dbUser ?? mockUser;

  const { data: session, status: sessionStatus } = useSession();
  const isDemo = isDemoUser(session?.user?.email);
  const { achievements: myAchievements } = useAchievements();

  const { items: myItems } = useInventory();

  // True when the logged-in user is viewing their own public profile
  const isOwnProfile = !!(session?.user?.id && dbUser && dbUser.user.id === session.user.id);

  // Guest = unauthenticated visitor (not loading, not logged in, not demo)
  const isGuest = !session?.user?.id && sessionStatus !== "loading";

  // Instant achievement sync — when any user unlocks an achievement, mutate
  // the SWR cache for this profile if it matches the user being viewed.
  const mutateProfileSWRRef = useRef(mutateProfileSWR);
  useEffect(() => { mutateProfileSWRRef.current = mutateProfileSWR; }, [mutateProfileSWR]);
  useEffect(() => {
    const handler = (e: Event) => {
      const { userId } = (e as CustomEvent<{ userId: string }>).detail ?? {};
      if (userId && dbUser?.user.id === userId) {
        mutateProfileSWRRef.current();
      }
    };
    window.addEventListener("uniques:achievement-unlocked", handler);
    return () => window.removeEventListener("uniques:achievement-unlocked", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbUser?.user.id]);

  const [targetItem, setTargetItem]   = useState<CollectibleItem | null>(null);
  const [msgToast, setMsgToast]       = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [following, setFollowing]     = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [guestContext, setGuestContext] = useState<string | null>(null);

  // Load follow status from DB for real users
  useEffect(() => {
    if (isDemo || !session?.user?.id || !handle) return;
    fetch(`/api/follow?userId=${encodeURIComponent(handle)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { isFollowing?: boolean } | null) => {
        if (data?.isFollowing != null) setFollowing(data.isFollowing);
      })
      .catch(() => {});
  }, [isDemo, session?.user?.id, handle]);
  const [profileTab, setProfileTab]   = useState<"collection" | "radar">("collection");
  const [showAddModal, setShowAddModal] = useState(false);
  const [tradePrefill, setTradePrefill] = useState<{ selectedIds: Set<string> } | undefined>(undefined);
  const [lockedToast,  setLockedToast]  = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  // Radar is only available for mock/demo seed handles; DB users have no radar data yet
  const userRadar = !dbUser ? (RADAR_BY_HANDLE[handle] ?? []) : [];

  // Returns the first matching inventory item for a radar entry (or null)
  const getMatchForEntry = useMemo(() => {
    return (entryName: string): CollectibleItem | null => {
      const key = entryName.toLowerCase().split(" ")[0];
      return (
        myItems.find(
          (item) =>
            item.name.toLowerCase().includes(key) ||
            entryName.toLowerCase().includes(item.name.toLowerCase().split(" ")[0])
        ) ?? null
      );
    };
  }, [myItems]);

  const handleMessage = () => {
    if (isGuest) { setGuestContext("send a message"); return; }
    // For real users with a known DB id, find/create a conversation then navigate to it.
    // Demo users fall back to the handle-based seed route.
    const targetId = user?.id;
    if (!isDemo && targetId && session?.user?.id) {
      fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId:     targetId,
          recipientName:   user?.name ?? handle,
          recipientAvatar: user?.avatar ?? "",
        }),
      })
        .then((r) => r.ok ? r.json() : null)
        .then((data: { id?: string } | null) => {
          if (data?.id) router.push(`/inbox/${data.id}`);
        })
        .catch(() => router.push(`/inbox/${handle}`));
    } else {
      router.push(`/inbox/${handle}`);
    }
  };

  // Null-safe destructure — hooks must run unconditionally on every render,
  // so we extract with fallbacks here and guard with the early return below.
  const user      = socialUser?.user;
  const inventory = socialUser?.inventory ?? [];
  const grailIds  = socialUser?.grailIds  ?? [];

  const grails = useMemo(() => {
    if (!user) return [];
    // Free users: always auto Top 3 by value, ignore manual grailIds
    if (user.tier !== 'pro') {
      return [...inventory]
        .sort((a, b) => (b.estimatedValue ?? 0) - (a.estimatedValue ?? 0))
        .slice(0, 3);
    }
    const pinned = grailIds
      .map((id) => inventory.find((i) => i.id === id))
      .filter((i): i is CollectibleItem => !!i);
    if (pinned.length >= 3) return pinned.slice(0, 3);
    const set = new Set(grailIds);
    const rest = [...inventory]
      .filter((i) => !set.has(i.id))
      .sort((a, b) => (b.estimatedValue ?? 0) - (a.estimatedValue ?? 0));
    return [...pinned, ...rest].slice(0, 3);
  }, [inventory, grailIds, user?.tier]);

  const totalValue = useMemo(
    () => inventory.reduce((s, i) => s + (i.estimatedValue ?? 0), 0),
    [inventory],
  );

  const [activeFilter, setActiveFilter] = useState("All");

  const categoryCounts = useMemo(() =>
    inventory.reduce((acc: Record<string, number>, item) => {
      if (item.category) acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {}), [inventory]);

  const filters = useMemo(() =>
    ["All", "In Trade", ...Object.keys(categoryCounts)],
    [categoryCounts]);

  const forTradeCount = useMemo(() => inventory.filter((i) => i.upForTrade).length, [inventory]);

  const filteredInventory = useMemo(() => {
    if (activeFilter === "All")      return inventory;
    if (activeFilter === "In Trade") return inventory.filter((i) => i.upForTrade);
    return inventory.filter((i) => i.category === activeFilter);
  }, [inventory, activeFilter]);

  // ── Loading DB user — show spinner only when there's no mock fallback either ──
  if (!socialUser && dbLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  // ── Not found — MUST come after all hooks ────────────────────────────────
  if (!socialUser || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-8">
        <p className="text-5xl">🔍</p>
        <p className="text-lg font-bold text-cream">Profile not found</p>
        <p className="text-sm text-cream/40">
          No collector with the handle <span className="text-cream/60 font-mono">@{handle}</span> exists.
        </p>
        <button
          onClick={() => isGuest ? router.push("/search") : router.back()}
          className="mt-2 px-6 py-2.5 rounded-2xl bg-background-light text-cream/60 text-sm font-semibold hover:bg-charcoal-light/50 transition-colors"
        >
          {isGuest ? "Explore Market" : "Go Back"}
        </button>
      </div>
    );
  }

  const memberYear = new Date(user.memberSince).getFullYear().toString().slice(-2);
  const memberDateFull = new Date(user.memberSince).toLocaleDateString("en-US", {
    month: "short", year: "numeric",
  });

  // Gold / Silver / Bronze theme lookup (same as private profile)
  const grailThemes = [
    { badge: "bg-[#D4AF37] text-[#713F12] border border-[#FDE047]/80", wrapper: "shadow-[0_0_15px_rgba(212,175,55,0.15)] ring-1 ring-[#D4AF37]/50", price: "text-[#FDE047]" },
    { badge: "bg-[#C0C0C0] text-[#374151] border border-white/80",      wrapper: "shadow-[0_0_15px_rgba(156,163,175,0.15)] ring-1 ring-[#9CA3AF]/50", price: "text-[#E5E7EB]" },
    { badge: "bg-[#CD7F32] text-[#451A03] border border-[#FDBA74]/80",  wrapper: "shadow-[0_0_15px_rgba(180,83,9,0.15)] ring-1 ring-[#B45309]/50",   price: "text-[#FDBA74]" },
  ];

  return (
    <div className="min-h-screen pb-20">
      <Header />

      <main className="max-w-lg mx-auto">

        {/* ── Back — hidden for guests ──────────────────────────── */}
        {!isGuest && (
          <div className="px-5 pt-4 pb-1">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-cream/35 hover:text-cream/70 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back</span>
            </button>
          </div>
        )}

        {/* ── Profile Header ─────────────────────────────────────── */}
        <div className="px-5 pt-4 pb-5">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 border-2 border-primary/30 overflow-hidden flex-shrink-0">
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              {/* Name row */}
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-cream truncate">{user.name}</h1>
                {user.handle && (
                  <span className="text-xs text-cream/30 font-medium font-mono shrink-0">@{user.handle}</span>
                )}
                {/* Pro badge — shown only if this user is Pro */}
                {user.tier === 'pro' && (
                  <span className="inline-flex items-center text-[10px] font-bold tracking-wider uppercase bg-[#CAE6CE] text-[#1A1818] px-2 py-0.5 rounded-full shrink-0">
                    PRO
                  </span>
                )}
              </div>
              <TrustStars score={user.trustScore} reviewCount={!dbUser && mockUser ? 6 : 0} onClick={() => setReviewsOpen(true)} />
              {user.bio && (
                <p className="text-xs text-cream/40 mt-1.5 leading-relaxed line-clamp-2">{user.bio}</p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-4 mb-1">
            <button
              onClick={handleMessage}
              className="flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl bg-[#2C2929] border border-white/[0.05] text-[#FCF9D5] text-sm font-semibold hover:bg-white/[0.05] transition-colors"
            >
              <Mail className="w-4 h-4" />
              Message
            </button>
            <button
              disabled={followLoading}
              onClick={async () => {
                if (isGuest) { setGuestContext("follow this collector"); return; }
                if (isDemo) { setFollowing((f) => !f); return; }
                setFollowLoading(true);
                try {
                  if (following) {
                    await fetch(`/api/follow?userId=${encodeURIComponent(handle)}`, { method: "DELETE" });
                    setFollowing(false);
                  } else {
                    await fetch("/api/follow", {
                      method:  "POST",
                      headers: { "Content-Type": "application/json" },
                      body:    JSON.stringify({ followingId: handle }),
                    });
                    setFollowing(true);
                  }
                } catch { /* ignore */ }
                setFollowLoading(false);
              }}
              className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors active:scale-[0.98] ${
                following
                  ? "bg-[#CAE6CE]/20 border border-[#CAE6CE]/30 text-[#CAE6CE] hover:bg-[#CAE6CE]/30"
                  : "bg-[#CAE6CE]/10 border border-[#CAE6CE]/20 text-[#CAE6CE] hover:bg-[#CAE6CE]/20"
              }`}
            >
              {following ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {following ? "Following" : "Follow"}
            </button>
          </div>
        </div>

        {/* Coming Soon toast */}
        {msgToast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-charcoal-light border border-white/10 shadow-2xl">
              <Mail className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-cream">Direct messaging — coming soon!</span>
            </div>
          </div>
        )}

        {/* ── Total Inventory Value Card ───────────────────────────── */}
        {(() => {
          // Use live DB data when available; fall back to placeholder for mock/demo profiles
          const payments = dbUser ? (dbProfileRaw?.paymentMethods      ?? []) : ["PayPal", "Venmo"];
          const shipping = dbUser ? (dbProfileRaw?.shippingPreferences ?? []) : ["Worldwide Shipping", "Local Pickup"];
          // Only render the live portfolio chart for authenticated DB users with a known userId
          const chartUserId = isOwnProfile ? (session?.user?.id ?? null) : (dbUser?.user.id ?? null);

          return (
            <div className="mx-5 mb-5 rounded-2xl bg-background-light shadow-soft overflow-visible">
              {/* Header row: label + stats pills */}
              <div className="px-4 pt-4 pb-0 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  <p className="text-[10px] text-cream/40 font-bold uppercase tracking-wider">Portfolio Value</p>
                </div>
                {/* Stats pills */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2C2929] border border-white/[0.08] text-[#FCF9D5] text-[10px] font-semibold shadow-sm">
                    <RefreshCw className="w-3 h-3 text-[#CAE6CE]" />
                    {user.totalTrades} Trades
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2C2929] border border-white/[0.08] text-[#FCF9D5] text-[10px] font-semibold shadow-sm">
                    <Calendar className="w-3 h-3 text-[#AA95C5]" />
                    &apos;{memberYear}
                  </div>
                </div>
              </div>

              {/* ── Portfolio Graph — official prices, live Recharts AreaChart ── */}
              {chartUserId ? (
                <div className="px-3 pt-2 pb-2">
                  <PortfolioChart
                    userId={chartUserId}
                    askingPriceSum={totalValue}
                  />
                </div>
              ) : (
                /* Non-DB user (mock/demo) — show locked trend pill */
                <div className="px-4 pb-3">
                  <div className="relative group inline-block">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.05] text-[#787569] text-[11px] font-semibold tracking-wide cursor-default select-none">
                      <Lock className="w-3 h-3 text-[#AA95C5]" />
                      <span className="blur-[3px] opacity-70 select-none">+$4.2K (8.5%)</span>
                    </div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2.5 bg-[#221F1F] border border-white/[0.08] rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50">
                      <div className="flex flex-col items-center text-center gap-1.5 w-[200px]">
                        <Lock className="w-4 h-4 text-[#AA95C5] mb-0.5" />
                        <span className="text-[11px] font-bold text-[#FCF9D5]">Portfolio Tracking</span>
                        <span className="text-[9px] text-[#787569] leading-tight">Sign up to track portfolio value over time.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Preferences — two-row static layout */}
              <div className="px-4 pb-4">
                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/[0.1] to-transparent mb-3 mt-1" />
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <CreditCard className="w-4 h-4 shrink-0 text-[#CAE6CE] drop-shadow-[0_0_8px_rgba(202,230,206,0.3)]" />
                    {payments.map((m) => (
                      <div key={m} className="px-2.5 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.06] transition-colors border border-white/[0.05] text-[10px] font-medium text-[#FCF9D5] whitespace-nowrap backdrop-blur-sm">
                        {m}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Truck className="w-4 h-4 shrink-0 text-[#AA95C5] drop-shadow-[0_0_8px_rgba(170,149,197,0.3)]" />
                    {shipping.map((s) => (
                      <div key={s} className="px-2.5 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.06] transition-colors border border-white/[0.05] text-[10px] font-medium text-[#FCF9D5] whitespace-nowrap backdrop-blur-sm">
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Achievements Strip ───────────────────────────────────── */}
        {(() => {
          // Own profile: use AchievementsContext (authoritative — DB-synced + localStorage).
          //   Shows all achievements with locked/unlocked state so the user can see what to unlock next.
          // Another user's profile: use public API data; show ONLY their unlocked achievements.
          // Mock/demo handles (no dbUser): fall back to seed map.
          let unlockedAchievements: Achievement[];
          let showLockedToo = false;

          if (isOwnProfile) {
            unlockedAchievements = myAchievements.filter((a) => a.status === "unlocked");
            showLockedToo = true;
          } else if (dbUser && dbAchievements !== null) {
            unlockedAchievements = dbAchievements
              .map((r) => {
                const base = ACHIEVEMENTS.find((a) => a.id === r.achievementId);
                if (!base) return null;
                return {
                  ...base,
                  status:       "unlocked" as const,
                  unlockedAt:   new Date(r.unlockedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                  catalystItem: r.catalystImage ? { name: r.catalystName ?? "", imageUrl: r.catalystImage } : base.catalystItem,
                };
              })
              .filter((a): a is NonNullable<typeof a> => a !== null);
          } else {
            unlockedAchievements = USER_ACHIEVEMENTS[handle] ?? [];
          }

          const unlockedIds = new Set(unlockedAchievements.map((a) => a.id));
          const pct = Math.round((unlockedAchievements.length / ACHIEVEMENTS.length) * 100);

          // Own profile: unlocked first, then locked. Other users: unlocked only.
          const displayAchievements: Achievement[] = showLockedToo
            ? [
                ...ACHIEVEMENTS.filter((a) =>  unlockedIds.has(a.id)).map((a) => myAchievements.find((m) => m.id === a.id) ?? a),
                ...ACHIEVEMENTS.filter((a) => !unlockedIds.has(a.id)),
              ]
            : unlockedAchievements;

          if (displayAchievements.length === 0 && !showLockedToo) {
            return null;
          }

          return (
            <div className="mb-5">
              {/* ── Section header — identical to inventory/page.tsx ───────── */}
              <div className="px-5 flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#D4AF37]" />
                  <h2 className="text-sm font-bold text-cream/80">
                    Achievements{" "}
                    <span className="text-cream/30 font-semibold">
                      ({unlockedAchievements.length}/{ACHIEVEMENTS.length})
                    </span>
                  </h2>
                </div>
              </div>

              {/* ── Green progress bar — identical to inventory/page.tsx ───── */}
              <div className="px-5 mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-cream/40 font-extrabold tabular-nums">{pct}%</span>
                </div>
              </div>

              {/* ── Horizontal badge strip — identical card dimensions to inventory/page.tsx ── */}
              <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-pl-5 pb-2 pl-5">
                {/* Unlocked badges */}
                {ACHIEVEMENTS.filter((a) => unlockedIds.has(a.id))
                  .map((a) => showLockedToo
                    ? (myAchievements.find((m) => m.id === a.id) ?? a)
                    : (unlockedAchievements.find((m) => m.id === a.id) ?? a)
                  )
                  .map((achievement, i) => {
                    const Icon = achievement.icon;
                    return (
                      <button
                        key={achievement.id}
                        onClick={() => isGuest
                          ? setGuestContext("unlock achievements")
                          : setSelectedAchievement(achievement)
                        }
                        className="relative flex-shrink-0 w-32 h-36 snap-start rounded-2xl flex flex-col items-center justify-center gap-2 px-2.5 pt-4 pb-3 text-center active:scale-95 transition-all animate-scale-in overflow-hidden bg-[#1A1818]"
                        style={{
                          animationDelay:    `${i * 0.06}s`,
                          animationFillMode: "both",
                          border:    `1px solid ${achievement.glow.replace("0.3", "0.4").replace("0.35", "0.4")}`,
                          boxShadow: `0 0 14px -4px ${achievement.glow}, inset 0 1px 0 rgba(255,255,255,0.04)`,
                        }}
                      >
                        {/* Icon */}
                        <div className="relative flex-shrink-0">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/[0.07]"
                            style={{ boxShadow: `0 0 12px -3px ${achievement.glow}` }}
                          >
                            <Icon className={`w-6 h-6 ${achievement.color}`} strokeWidth={2} />
                          </div>
                        </div>
                        {/* Text */}
                        <div className="flex flex-col items-center gap-0.5 w-full">
                          <p className="text-[11px] font-extrabold leading-tight text-center w-full text-cream/90">
                            {achievement.title}
                          </p>
                          <p className="text-[9px] leading-snug line-clamp-2 text-center w-full text-cream/40">
                            {achievement.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}

                {/* Locked badges — muted, only shown on own profile */}
                {showLockedToo && ACHIEVEMENTS.filter((a) => !unlockedIds.has(a.id)).map((achievement) => {
                  const Icon = achievement.icon;
                  return (
                    <button
                      key={achievement.id}
                      onClick={() => setSelectedAchievement(achievement)}
                      className="relative flex-shrink-0 w-32 h-36 snap-start rounded-2xl flex flex-col items-center justify-center gap-2 px-2.5 pt-4 pb-3 text-center active:scale-95 transition-all overflow-hidden bg-background-light/60 border border-dashed border-white/[0.09] grayscale opacity-50"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/[0.04]">
                          <Icon className="w-6 h-6 text-cream/25" strokeWidth={1.5} />
                        </div>
                        <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#221F1F] border border-white/[0.09] flex items-center justify-center">
                          <Lock className="w-2.5 h-2.5 text-cream/35" />
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 w-full">
                        <p className="text-[11px] font-extrabold leading-tight text-center w-full text-cream/25">
                          {achievement.title}
                        </p>
                        <p className="text-[9px] leading-snug line-clamp-2 text-center w-full text-cream/20">
                          {achievement.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── Top 3 Grails — Hero Layout ───────────────────────────── */}
        <div className="px-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-bold text-cream/80">Top 3 Grails</h2>
          </div>
          {grails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Crown className="w-8 h-8 text-white/10 mb-3" />
              <p className="text-sm text-cream/30 font-medium">No Grails to display yet.</p>
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-3 w-full">
            {grails.map((item, i) => {
              const isHero = i === 0;
              const theme = grailThemes[i];
              return (
                <div
                  key={item.id}
                  onClick={() => isGuest ? setGuestContext("propose a trade") : setTargetItem(item)}
                  className={`${isHero ? "col-span-2" : "col-span-1"} relative rounded-2xl p-[1px] bg-gradient-to-b from-white/10 via-transparent to-transparent cursor-pointer transition-transform active:scale-95 hover:opacity-90 animate-scale-in ${theme.wrapper}`}
                  style={{ animationDelay: `${i * 0.1}s`, animationFillMode: "both" }}
                >
                  <div className="h-full w-full bg-[#2C2929] rounded-2xl overflow-hidden">
                    <div className={`relative overflow-hidden ${isHero ? "h-[200px]" : "aspect-square"}`}>
                      <img
                        src={item.customImage || item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      {/* Metallic rank badge */}
                      <div className={`absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center text-sm font-black shadow-sm shadow-black/30 z-10 ${theme.badge}`}>
                        {i + 1}
                      </div>
                    </div>
                    <div className={isHero ? "px-3 py-3" : "px-2 py-1.5"}>
                      <p className={`text-cream/90 truncate font-semibold leading-tight ${isHero ? "text-sm" : "text-[10px]"}`}>
                        {item.name}
                      </p>
                      <p className={`font-bold mt-0.5 ${isHero ? "text-sm" : "text-[9px]"} ${theme.price}`}>
                        {formatValue(item.estimatedValue ?? 0)}
                      </p>
                      {isHero && item.category && (
                        <p className="text-[10px] text-muted mt-0.5">{item.category}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* ── Section toggle ────────────────────────────────────────── */}
        <div className="px-5 mb-5">
          <div className="flex gap-2 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <button
              onClick={() => setProfileTab("collection")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                profileTab === "collection"
                  ? "bg-background-light text-cream shadow-sm"
                  : "text-cream/35 hover:text-cream/60"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Vault
            </button>
            <button
              onClick={() => setProfileTab("radar")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                profileTab === "radar"
                  ? "bg-background-light text-[#CAE6CE] shadow-sm"
                  : "text-cream/35 hover:text-cream/60"
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              Radar
              {userRadar.length > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  profileTab === "radar"
                    ? "bg-[#CAE6CE]/20 text-[#CAE6CE]"
                    : "bg-white/[0.08] text-cream/40"
                }`}>
                  {userRadar.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Collection ───────────────────────────────────────────── */}
        {profileTab === "collection" && (
          <>
            <div className="px-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-cream/50" />
                <h2 className="text-sm font-bold text-cream/80">Vault</h2>
                <span className="text-[10px] text-cream/25 ml-1">tap any piece to make an offer</span>
              </div>
              {/* Filter pills */}
              <div className="flex flex-nowrap gap-2 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-none">
                {filters.map((f) => {
                  const isInTrade = f === "In Trade";
                  const isActive  = activeFilter === f;
                  return (
                    <button
                      key={f}
                      onClick={() => setActiveFilter(f)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                        isInTrade && isActive
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : isInTrade && !isActive
                          ? "bg-background-light text-amber-400/60 hover:text-amber-400"
                          : isActive
                          ? "bg-surface/25 text-surface-light shadow-glow-surface"
                          : "bg-background-light text-cream/40 hover:text-cream/60"
                      }`}
                    >
                      {f === "All" ? `All (${inventory.length})` : f === "In Trade" ? "In Trade" : `${f} (${categoryCounts[f] ?? 0})`}
                      {isInTrade && forTradeCount > 0 && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive ? "bg-amber-500/30 text-amber-300" : "bg-amber-500/20 text-amber-400"
                        }`}>
                          {forTradeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Item grid */}
            <div className="px-5 pb-6">
              {filteredInventory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center gap-2">
                  <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-1">
                    <Package className="w-6 h-6 text-white/20" />
                  </div>
                  <p className="text-sm font-semibold text-cream/30">Vault is empty</p>
                  <p className="text-xs text-cream/20 max-w-[180px] leading-relaxed">This Collector hasn&apos;t curated any pieces yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {filteredInventory.map((item, i) => (
                    <ItemCard key={item.id} item={item} index={i} onTap={() => isGuest ? setGuestContext("propose a trade") : setTargetItem(item)} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Public Radar ─────────────────────────────────────────── */}
        {profileTab === "radar" && (
          <div className="px-5 pb-8">
            <div className="flex items-center gap-2 mb-4">
              <Crosshair className="w-4 h-4 text-[#CAE6CE]" />
              <h2 className="text-sm font-bold text-cream/80">{user.name}&apos;s Radar</h2>
              <span className="text-[10px] text-cream/25">actively hunting</span>
            </div>

            {userRadar.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
                <Crosshair className="w-8 h-8 text-cream/15" />
                <p className="text-cream/30 text-sm font-medium">Nothing on Radar yet</p>
                <p className="text-cream/20 text-xs max-w-[200px] leading-relaxed">
                  {user.name} hasn&apos;t added any hunting targets yet.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {userRadar.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl bg-background-light border border-white/[0.06] overflow-hidden"
                  >
                    <div className="flex gap-3 p-3">
                      {/* Image */}
                      <div className="relative flex-shrink-0 w-[68px] h-[68px] rounded-xl overflow-hidden bg-white/[0.04]">
                        <img src={entry.imageUrl} alt={entry.name} className="w-full h-full object-contain p-1.5" loading="lazy" />
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-md bg-black/50 flex items-center justify-center">
                          <Crosshair className="w-2.5 h-2.5 text-[#CAE6CE]/60" />
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-cream truncate leading-snug">{entry.name}</p>
                        <p className="text-[10px] text-cream/30 mt-0.5 mb-2">
                          {entry.category} · ~{entry.marketValue >= 1000 ? `$${(entry.marketValue / 1000).toFixed(1)}K` : `$${entry.marketValue}`}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {entry.budget && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#AA95C5]/10 border border-[#AA95C5]/20">
                              <Bell className="w-2.5 h-2.5 text-[#AA95C5]" />
                              <span className="text-[10px] font-semibold text-[#AA95C5]">Budget: {entry.budget}</span>
                            </div>
                          )}
                          {entry.trading && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                              <ArrowLeftRight className="w-2.5 h-2.5 text-yellow-400/80" />
                              <span className="text-[10px] font-semibold text-yellow-400/80 truncate max-w-[160px]">Trading: {entry.trading}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* CTA — 3-state smart match */}
                    {(() => {
                      const match = getMatchForEntry(entry.name);
                      const radarItem: CollectibleItem = {
                        id: entry.id, name: entry.name, imageUrl: entry.imageUrl,
                        category: entry.category as CollectibleItem["category"],
                        upForTrade: false, estimatedValue: entry.marketValue,
                      };

                      // State 1: match found but item is locked in an active trade
                      if (match?.isLocked) {
                        return (
                          <div className="px-3 pb-3">
                            <button
                              onClick={() => {
                                setLockedToast(true);
                                setTimeout(() => setLockedToast(false), 3500);
                              }}
                              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-colors active:scale-95"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              Locked in another trade
                            </button>
                          </div>
                        );
                      }

                      // State 2: match found and item is free — pre-select it
                      if (match) {
                        return (
                          <div className="px-3 pb-3">
                            <button
                              onClick={() => {
                                if (isGuest) { setGuestContext("propose a trade"); return; }
                                setTradePrefill({ selectedIds: new Set([match.id]) });
                                setTargetItem(radarItem);
                              }}
                              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-500/25 transition-colors active:scale-95"
                            >
                              <span>🔥</span>
                              You have this! Propose Trade
                            </button>
                          </div>
                        );
                      }

                      // State 3: no match — invite user to add item first
                      return (
                        <div className="px-3 pb-3">
                          <button
                            onClick={() => isGuest ? setGuestContext("add items and start a trade") : setShowAddModal(true)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.09] text-cream/40 text-xs font-semibold hover:bg-white/[0.07] hover:text-cream/60 transition-colors active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Not in inventory · Add to Trade
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Reviews Modal ────────────────────────────────────────── */}
      <ReviewsListModal
        isOpen={reviewsOpen}
        onClose={() => setReviewsOpen(false)}
        userName={user.name}
        trustScore={user.trustScore}
        isDemo={isDemo}
        targetUserId={user.id}
        currentUserId={session?.user?.id}
      />

      {/* ── Propose Trade Modal ──────────────────────────────────── */}
      <ProposeTradeModal
        isOpen={!!targetItem}
        targetItem={targetItem}
        targetUser={user}
        prefill={tradePrefill}
        onClose={() => { setTargetItem(null); setTradePrefill(undefined); }}
      />

      {/* AddItemModal — lets user add the item to their inventory to propose a trade */}
      <AddItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={() => setShowAddModal(false)}
      />

      {/* Locked item toast */}
      {lockedToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 max-w-[320px] w-full px-4 animate-slide-up pointer-events-none">
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-[#2C2929] border border-amber-500/20 shadow-2xl shadow-black/40">
            <Lock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <span className="text-xs font-semibold text-cream/80 leading-relaxed">
              This item is currently locked in an active offer. Manage your Trade History to free it up.
            </span>
          </div>
        </div>
      )}

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <AchievementModal
          achievement={selectedAchievement}
          onClose={() => setSelectedAchievement(null)}
        />
      )}

      {/* Guest auth modal — fires when unauthenticated user taps any interaction */}
      <GuestAuthModal
        isOpen={!!guestContext}
        onClose={() => setGuestContext(null)}
        context={guestContext ?? undefined}
      />

      <BottomNav />

      {/* Guest sticky conversion CTA — gradient pill above BottomNav */}
      {isGuest && (
        <div className="fixed bottom-[85px] left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
          <a
            href="/register"
            className="pointer-events-auto flex items-center justify-center gap-2 px-6 py-3 rounded-full backdrop-blur-md bg-gradient-to-r from-[#1E3A34]/90 to-[#12221E]/90 border border-white/20 text-cream text-sm font-semibold shadow-[0_0_15px_rgba(30,255,150,0.2)] hover:shadow-[0_0_20px_rgba(30,255,150,0.3)] active:scale-[0.97] transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#CAE6CE] flex-shrink-0" />
            Trade &amp; collect — it&apos;s free
          </a>
        </div>
      )}
    </div>
  );
}
