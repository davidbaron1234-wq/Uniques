"use client";

import { useMemo, useRef, useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { driver } from "driver.js";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import TradeCard from "@/components/TradeCard";
import ProposeTradeModal from "@/components/ProposeTradeModal";
import { tradeOffers, tradeHistory as staticHistory } from "@/lib/data";
import { useInventory } from "@/lib/InventoryContext";
import { useAchievements } from "@/lib/AchievementsContext";
import { isDemoUser } from "@/lib/demo";
import { formatValue } from "@/lib/format";
import { TrendingUp, Repeat2, Package, ArrowLeftRight, CheckCircle2, Users, Heart, MessageCircle, Share, Trophy, Eye, X, Loader2, Smile, Sparkles, Bell } from "lucide-react";
import type { CollectibleItem, TradeHistoryEntry } from "@/lib/types";
import type { Category } from "@/lib/constants";

// ── Helpers ───────────────────────────────────────────────────────────────────

const isMe = (name: string) => name === "You" || name === "Collector";

function toEntry(t: typeof staticHistory[number]): TradeHistoryEntry {
  return {
    id:          t.id,
    from:        { name: t.from.name,  avatar: t.from.avatar  },
    to:          { name: t.to.name,    avatar: t.to.avatar    },
    fromItems:   t.fromItems.map((i) => ({ id: i.id, name: i.name, imageUrl: i.imageUrl, estimatedValue: i.estimatedValue })),
    fromCash:    t.fromCash,
    toItems:     t.toItems.map((i)   => ({ id: i.id, name: i.name, imageUrl: i.imageUrl, estimatedValue: i.estimatedValue })),
    toCash:      t.toCash,
    status:      t.status as TradeHistoryEntry["status"],
    createdAt:   t.createdAt,
    completedAt: t.completedAt,
  };
}

function offerToEntry(o: typeof tradeOffers[number]): TradeHistoryEntry {
  return {
    id:        o.id,
    from:      { name: o.from.name, avatar: o.from.avatar },
    to:        { name: o.to.name,   avatar: o.to.avatar   },
    fromItems: o.fromItems.map((i) => ({ id: i.id, name: i.name, imageUrl: i.imageUrl, estimatedValue: i.estimatedValue, category: i.category })),
    fromCash:  o.fromCash,
    toItems:   o.toItems.map((i)   => ({ id: i.id, name: i.name, imageUrl: i.imageUrl, estimatedValue: i.estimatedValue, category: i.category })),
    toCash:    o.toCash,
    status:    "pending",
    createdAt: o.createdAt,
  };
}

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// Load all trade_completed_* timestamps from localStorage on mount
function loadCompletedMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const result: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("trade_completed_")) {
      const val = localStorage.getItem(key);
      if (val) result[key.replace("trade_completed_", "")] = val;
    }
  }
  return result;
}

// ── Community Highlights data ─────────────────────────────────────────────────

const COMMUNITY_HIGHLIGHTS = [
  {
    id: "ch-1",
    name: "LEGO Star Wars AT-AT #75313",
    category: "Lego",
    imageUrl: "https://cdn.rebrickable.com/media/sets/75313-1.jpg",
    estimatedValue: 850,
    ownerName: "Ethan",
    ownerHandle: "ethan",
    ownerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan&backgroundColor=FFDAC1",
    wantsTag: "Pokémon TCG",
    views: "2.1K",
  },
  {
    id: "ch-2",
    name: "Freddy Funko Ghost Rider Metallic (SDCC 2013)",
    category: "Funko Pop",
    imageUrl: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&h=400&fit=crop&auto=format&q=80&seed=5",
    estimatedValue: 33500,
    ownerName: "Alex",
    ownerHandle: "alex",
    ownerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=AA95C5",
    wantsTag: "Alt Arts",
    views: "1.8K",
  },
  {
    id: "ch-3",
    name: "Shohei Ohtani 2018 Topps Update RC PSA 10",
    category: "Sports Cards",
    imageUrl: "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=400&h=400&fit=crop&auto=format&q=80&seed=41",
    estimatedValue: 1400,
    ownerName: "Ethan",
    ownerHandle: "ethan",
    ownerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan&backgroundColor=FFDAC1",
    wantsTag: "Pokémon TCG",
    views: "1.2K",
  },
  {
    id: "ch-4",
    name: "Lugia (Neo Genesis) BGS 9",
    category: "Pokémon TCG",
    imageUrl: "https://images.pokemontcg.io/neo1/9.png",
    estimatedValue: 490,
    ownerName: "Drew",
    ownerHandle: "drew",
    ownerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Drew&backgroundColor=B5EAD7",
    wantsTag: "Vintage Cards",
    views: "847",
  },
];

// ── Network Activity data ─────────────────────────────────────────────────────

type EventType = "added_grail" | "completed_trade" | "updated_radar" | "new_listing" | "milestone";

const EVENT_META: Record<EventType, { label: string; cls: string }> = {
  added_grail:      { label: "New Grail",  cls: "bg-yellow-400/15 text-yellow-400" },
  completed_trade:  { label: "Trade",      cls: "bg-green-400/15  text-green-400"  },
  updated_radar:    { label: "Radar",      cls: "bg-surface/15 text-surface-light" },
  new_listing:      { label: "For Trade",  cls: "bg-primary/15 text-primary"       },
  milestone:        { label: "Milestone",  cls: "bg-amber-400/15  text-amber-400"  },
};

const DUMMY_LIKES: Record<string, number> = {
  "ne-1": 12, "ne-2": 5,  "ne-3": 47, "ne-4": 23, "ne-5": 8,
  "ne-6": 31, "ne-7": 18, "ne-8": 9,  "ne-9": 64, "ne-10": 4,
  "ne-11": 27, "ne-12": 15,
  "fy-1": 88, "fy-2": 19, "fy-3": 41, "fy-4": 7,  "fy-5": 53,
  "fy-6": 12, "fy-7": 36, "fy-8": 22,
};


// Dummy radar want-images for the collage on radar-type posts
const RADAR_IMAGES = [
  "https://images.pokemontcg.io/sv3pt5/183.png",
  "https://images.pokemontcg.io/swsh7/215.png",
  "https://images.pokemontcg.io/sv2/245.png",
];

type FeedUser   = { name: string; handle: string; avatar: string };
type FeedReply  = { id: string; user: FeedUser; text: string; time: string; timestamp: number; likes: number };
type FeedComment = FeedReply & { replies: FeedReply[] };

const CURRENT_USER: FeedUser & { avatar: string } = {
  name:   "David Bar",
  handle: "davidbar",
  avatar: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=DavidBar&backgroundColor=ffd83d",
};

// ── Emoji picker data ─────────────────────────────────────────────────────────

type EmojiItem     = { e: string; n: string };
type EmojiCategory = { name: string; emojis: EmojiItem[] };

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: "Smileys & Emotion",
    emojis: [
      { e: "😀", n: "grinning smile" },       { e: "😁", n: "beaming grin" },
      { e: "😂", n: "joy laugh cry" },         { e: "🤣", n: "rolling floor laugh" },
      { e: "🥹", n: "holding back tears" },    { e: "😍", n: "heart eyes love" },
      { e: "🤩", n: "star struck amazing wow" },{ e: "😎", n: "cool sunglasses" },
      { e: "🤔", n: "thinking hmm" },          { e: "😅", n: "sweat smile nervous" },
      { e: "😭", n: "crying loudly sad" },     { e: "🥺", n: "pleading puppy eyes" },
      { e: "😏", n: "smirking smug" },         { e: "😬", n: "grimacing awkward" },
      { e: "🤯", n: "exploding mind blown" },  { e: "🥳", n: "party celebrate congrats" },
      { e: "😤", n: "triumph pride huffing" }, { e: "🙄", n: "eye roll whatever" },
      { e: "😊", n: "smiling happy blush" },   { e: "😇", n: "angel innocent halo" },
      { e: "🥰", n: "smiling hearts love" },   { e: "😆", n: "grinning squinting" },
      { e: "😋", n: "yum tasty" },             { e: "🤪", n: "zany crazy wacky" },
      { e: "😱", n: "scream shock horror" },   { e: "🤗", n: "hugging warm" },
      { e: "🫡", n: "saluting respect" },      { e: "🫶", n: "heart hands love care" },
      { e: "👏", n: "clap applause bravo" },   { e: "🤜", n: "fist bump" },
      { e: "😈", n: "devil smiling evil" },    { e: "💀", n: "skull dead" },
      { e: "😩", n: "weary tired" },
    ],
  },
  {
    name: "Trade & Collectibles",
    emojis: [
      { e: "🔥", n: "fire hot flame" },        { e: "💎", n: "diamond gem jewel" },
      { e: "👀", n: "eyes looking watching" },  { e: "🤝", n: "handshake deal" },
      { e: "💰", n: "money bag cash rich" },   { e: "🎯", n: "target bullseye" },
      { e: "✨", n: "sparkles shiny magic" },   { e: "🏆", n: "trophy winner champion" },
      { e: "💯", n: "hundred perfect score" },  { e: "⚡", n: "lightning fast electric" },
      { e: "🚀", n: "rocket launch blast" },   { e: "💪", n: "muscle strong flex" },
      { e: "👑", n: "crown king queen royal" }, { e: "🌟", n: "star glowing shine" },
      { e: "💸", n: "money wings flying" },    { e: "🪙", n: "coin gold silver" },
      { e: "👍", n: "thumbs up good yes" },    { e: "❤️", n: "heart love red" },
      { e: "🙏", n: "pray thanks please" },    { e: "⭐", n: "star yellow favourite" },
      { e: "🥇", n: "gold medal first place" },{ e: "🏅", n: "sports medal award" },
      { e: "🤑", n: "money mouth rich" },      { e: "📈", n: "chart uptrend growing" },
      { e: "🔑", n: "key access unlock" },     { e: "🎁", n: "gift present surprise" },
      { e: "🎊", n: "confetti celebration" },  { e: "💫", n: "dizzy stars wow" },
    ],
  },
  {
    name: "Objects",
    emojis: [
      { e: "📦", n: "package box shipping" },  { e: "🎮", n: "game controller gaming" },
      { e: "👟", n: "sneaker shoe kick" },     { e: "📱", n: "phone mobile device" },
      { e: "💻", n: "laptop computer" },       { e: "🎨", n: "art palette paint" },
      { e: "🧩", n: "puzzle piece jigsaw" },   { e: "🎸", n: "guitar music" },
      { e: "📸", n: "camera photo" },          { e: "🔭", n: "telescope space stars" },
      { e: "🧸", n: "teddy bear toy" },        { e: "🪆", n: "nesting doll" },
      { e: "🎀", n: "ribbon bow pink" },       { e: "🧲", n: "magnet attract" },
      { e: "💡", n: "lightbulb idea bright" }, { e: "🔎", n: "magnifying glass search" },
      { e: "📚", n: "books read study" },      { e: "🖼️", n: "frame picture art" },
      { e: "🎭", n: "performing arts theatre" },{ e: "🎲", n: "dice game chance" },
      { e: "🃏", n: "card joker playing" },    { e: "🎵", n: "music note song" },
      { e: "🎬", n: "clapper film movie" },    { e: "📺", n: "television tv" },
    ],
  },
];

const ALL_EMOJIS = EMOJI_CATEGORIES.flatMap((c) => c.emojis);

// Who liked each post — counts match DUMMY_LIKES values
const DUMMY_LIKED_BY: Record<string, string[]> = {
  "ne-1": ["Ethan", "Alex", "Drew", "Mia", "Jordan", "Kai", "Sam", "Riley", "Casey", "Morgan", "Blake", "Avery"],
  "ne-2": ["Drew", "Alex", "Jamie", "Quinn", "Taylor"],
  "ne-3": ["Ethan", "Drew", "Alex", "Mia", "Jordan", "Kai", "Sam", "Riley", "Casey", "Morgan", "Blake", "Avery",
           "Cameron", "Dakota", "Emery", "Finley", "Harley", "Indigo", "Jesse", "Kira", "Logan", "Mason",
           "Noel", "Oakley", "Parker", "Quinn", "Sage", "Taylor", "Uma", "Val", "Wren", "Xander",
           "Yasmine", "Zara", "Nico", "Piper", "Remy", "Shay", "Teo", "Uri", "Vesper", "Waverly",
           "Yael", "Zion", "Ari", "Bex", "Cedar"],
  "ne-4": ["Alex", "Mia", "Jordan", "Kai", "Sam", "Riley", "Casey", "Morgan", "Blake", "Avery",
           "Cameron", "Dakota", "Emery", "Finley", "Harley", "Indigo", "Jesse", "Kira", "Logan",
           "Mason", "Noel", "Oakley", "Parker"],
  "ne-5": ["Ethan", "Drew", "Alex", "Mia", "Jordan", "Kai", "Sam", "Riley"],
};

// Helper: ms ago from now (evaluated at module load, good enough for static seed data)
const msAgo = (h: number, m = 0) => Date.now() - (h * 3600 + m * 60) * 1_000;

const DUMMY_FEED_COMMENTS: Record<string, FeedComment[]> = {
  "ne-1": [
    {
      id: "c1", likes: 8, time: "45m", timestamp: msAgo(0, 45),
      user: { name: "Ethan", handle: "ethan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan&backgroundColor=FFDAC1" },
      text: "Absolute grail 🔥 PSA 10 Base Zards are nearly impossible to find at a fair price now.",
      replies: [
        { id: "c1r1", likes: 2, time: "40m", timestamp: msAgo(0, 40),
          user: { name: "Drew", handle: "drew", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Drew&backgroundColor=B5EAD7" },
          text: "Facts — I had a chance to grab one in 2021 for $4K and passed 😭 Still haunts me." },
      ],
    },
    {
      id: "c2", likes: 1, time: "1h", timestamp: msAgo(1),
      user: { name: "Alex", handle: "alex", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=AA95C5" },
      text: "Been hunting for one of these for 2 years. Open to any offers on it?",
      replies: [],
    },
  ],
  "ne-2": [
    {
      id: "c3", likes: 2, time: "2h", timestamp: msAgo(2),
      user: { name: "Drew", handle: "drew", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Drew&backgroundColor=B5EAD7" },
      text: "Are any of these up for trade? I have some alt arts you might love 👀",
      replies: [],
    },
  ],
  "ne-3": [
    {
      id: "c4", likes: 8, time: "4h", timestamp: msAgo(4),
      user: { name: "Ethan", handle: "ethan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan&backgroundColor=FFDAC1" },
      text: "Insane trade value! Congrats on the completion 🎉",
      replies: [
        { id: "c4r1", likes: 3, time: "3h 50m", timestamp: msAgo(3, 50),
          user: { name: "Alex", handle: "alex", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=AA95C5" },
          text: "Thank you! It took 4 months of back-and-forth to finally close it 🙏" },
      ],
    },
    {
      id: "c5", likes: 4, time: "4h", timestamp: msAgo(4, 5),
      user: { name: "Drew", handle: "drew", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Drew&backgroundColor=B5EAD7" },
      text: "What was the final deal? That Freddy Ghost Rider is legendary.",
      replies: [
        { id: "c5r1", likes: 5, time: "3h 55m", timestamp: msAgo(3, 55),
          user: { name: "Alex", handle: "alex", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=AA95C5" },
          text: "NDA lol 😅 Let's just say it involved multiple grails flowing both ways." },
      ],
    },
    {
      id: "c6", likes: 6, time: "5h", timestamp: msAgo(5),
      user: { name: "Ethan", handle: "ethan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan&backgroundColor=FFDAC1" },
      text: "Top 5 most valuable Pops ever made. Respect 🤘",
      replies: [],
    },
  ],
  "ne-4": [
    {
      id: "c7", likes: 2, time: "7h", timestamp: msAgo(7),
      user: { name: "Alex", handle: "alex", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=AA95C5" },
      text: "Umbreon alt arts are so beautiful. What are you looking for in return?",
      replies: [],
    },
  ],
  "ne-5": [
    {
      id: "c8", likes: 5, time: "22h", timestamp: msAgo(22),
      user: { name: "Alex", handle: "alex", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=AA95C5" },
      text: "Big congrats! $10K is a serious milestone 🏆",
      replies: [],
    },
    {
      id: "c9", likes: 3, time: "23h", timestamp: msAgo(23),
      user: { name: "Drew", handle: "drew", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Drew&backgroundColor=B5EAD7" },
      text: "You've been building this for so long — absolutely deserved!",
      replies: [],
    },
  ],
};

type NetworkEvent = {
  id: string;
  user: { name: string; handle: string; avatar: string };
  type: EventType;
  action: string;
  item: { name: string; imageUrl: string; estimatedValue?: number } | null;
  timestamp: string;
  suggested?: boolean;
};

const NETWORK_EVENTS: NetworkEvent[] = [
  {
    id: "ne-1",
    user: { name: "Drew", handle: "drew", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Drew&backgroundColor=B5EAD7" },
    type: "added_grail",
    action: "added a new grail to their vault",
    item: { name: "Charizard (Base Set) PSA 10", imageUrl: "https://images.pokemontcg.io/base1/4.png", estimatedValue: 12000 },
    timestamp: "1h ago",
  },
  {
    id: "ne-2",
    user: { name: "Ethan", handle: "ethan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan&backgroundColor=FFDAC1" },
    type: "updated_radar",
    action: "added 3 new grails to their Radar",
    item: null,
    timestamp: "3h ago",
  },
  {
    id: "ne-3",
    user: { name: "Alex", handle: "alex", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=AA95C5" },
    type: "completed_trade",
    action: "just completed a high-value trade",
    item: { name: "Freddy Funko Ghost Rider Metallic (SDCC 2013)", imageUrl: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&h=400&fit=crop&auto=format&q=80&seed=5", estimatedValue: 33500 },
    timestamp: "5h ago",
  },
  {
    id: "ne-4",
    user: { name: "Drew", handle: "drew", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Drew&backgroundColor=B5EAD7" },
    type: "new_listing",
    action: "listed a new item for trade",
    item: { name: "Umbreon VMAX Alt Art", imageUrl: "https://images.pokemontcg.io/swsh7/215.png", estimatedValue: 310 },
    timestamp: "8h ago",
  },
  {
    id: "ne-5",
    user: { name: "Ethan", handle: "ethan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan&backgroundColor=FFDAC1" },
    type: "milestone",
    action: "hit a $10k vault milestone",
    item: { name: "LEGO Star Wars AT-AT #75313", imageUrl: "https://cdn.rebrickable.com/media/sets/75313-1.jpg", estimatedValue: 850 },
    timestamp: "1d ago",
  },
];

// ── "For You" algorithmic posts (suggested, not necessarily followed) ─────────

const FOR_YOU_EVENTS: NetworkEvent[] = [
  {
    id: "fy-1",
    user: { name: "Maya", handle: "maya", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maya&backgroundColor=FFB7B2" },
    type: "added_grail",
    action: "added a grail that matches your Pokémon interests",
    item: { name: "Pikachu Illustrator (PSA 9)", imageUrl: "https://images.pokemontcg.io/swsh12pt5/67.png", estimatedValue: 350000 },
    timestamp: "2h ago",
    suggested: true,
  },
  {
    id: "fy-2",
    user: { name: "Jordan", handle: "jordan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan&backgroundColor=C7CEEA" },
    type: "new_listing",
    action: "listed a LEGO set you might want",
    item: { name: "LEGO Millennium Falcon #75192", imageUrl: "https://cdn.rebrickable.com/media/sets/75192-1.jpg", estimatedValue: 890 },
    timestamp: "6h ago",
    suggested: true,
  },
];

// Interleaved For You feed: algorithmic posts mixed into the following stream
const FOR_YOU_FEED: NetworkEvent[] = [
  FOR_YOU_EVENTS[0],
  ...NETWORK_EVENTS.slice(0, 2),
  FOR_YOU_EVENTS[1],
  ...NETWORK_EVENTS.slice(2),
];

// ── Extended post pools for infinite scroll ────────────────────────────────────

const EXTRA_FOLLOWING: NetworkEvent[] = [
  {
    id: "ne-6",
    user: { name: "Alex", handle: "alex", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=AA95C5" },
    type: "added_grail", action: "added a new grail to their vault",
    item: { name: "Mew ex Special Art Rare", imageUrl: "https://images.pokemontcg.io/sv3pt5/205.png", estimatedValue: 420 },
    timestamp: "5m ago",
  },
  {
    id: "ne-7",
    user: { name: "Drew", handle: "drew", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Drew&backgroundColor=B5EAD7" },
    type: "new_listing", action: "listed a new item for trade",
    item: { name: "Gengar VMAX Alt Art", imageUrl: "https://images.pokemontcg.io/swsh6/271.png", estimatedValue: 185 },
    timestamp: "9h ago",
  },
  {
    id: "ne-8",
    user: { name: "Ethan", handle: "ethan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan&backgroundColor=FFDAC1" },
    type: "completed_trade", action: "just completed a trade",
    item: { name: "LEGO Technic Porsche 911 RSR #42096", imageUrl: "https://cdn.rebrickable.com/media/sets/42096-1.jpg", estimatedValue: 280 },
    timestamp: "12h ago",
  },
  {
    id: "ne-9",
    user: { name: "Alex", handle: "alex", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=AA95C5" },
    type: "milestone", action: "hit a $25k vault milestone",
    item: null, timestamp: "1d ago",
  },
  {
    id: "ne-10",
    user: { name: "Drew", handle: "drew", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Drew&backgroundColor=B5EAD7" },
    type: "updated_radar", action: "added 5 new grails to their Radar",
    item: null, timestamp: "1d ago",
  },
  {
    id: "ne-11",
    user: { name: "Ethan", handle: "ethan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan&backgroundColor=FFDAC1" },
    type: "added_grail", action: "added a new grail to their vault",
    item: { name: "Shiny Rayquaza EX Full Art", imageUrl: "https://images.pokemontcg.io/xy7/61.png", estimatedValue: 940 },
    timestamp: "2d ago",
  },
  {
    id: "ne-12",
    user: { name: "Alex", handle: "alex", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=AA95C5" },
    type: "new_listing", action: "listed a new item for trade",
    item: { name: "Shadow Lugia VSTAR Alt Art", imageUrl: "https://images.pokemontcg.io/swsh12pt5/202.png", estimatedValue: 260 },
    timestamp: "2d ago",
  },
];

const EXTRA_SUGGESTED: NetworkEvent[] = [
  {
    id: "fy-3", suggested: true,
    user: { name: "Casey", handle: "casey", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Casey&backgroundColor=BAFCA2" },
    type: "added_grail", action: "added a grail that matches your interests",
    item: { name: "Blastoise (Base Set 1st Ed.) PSA 9", imageUrl: "https://images.pokemontcg.io/base1/2.png", estimatedValue: 8500 },
    timestamp: "3h ago",
  },
  {
    id: "fy-4", suggested: true,
    user: { name: "Riley", handle: "riley", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Riley&backgroundColor=E2D9F3" },
    type: "new_listing", action: "listed a LEGO set matching your Radar",
    item: { name: "LEGO Technic Bugatti Chiron #42083", imageUrl: "https://cdn.rebrickable.com/media/sets/42083-1.jpg", estimatedValue: 480 },
    timestamp: "7h ago",
  },
  {
    id: "fy-5", suggested: true,
    user: { name: "Morgan", handle: "morgan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Morgan&backgroundColor=FFDAC1" },
    type: "completed_trade", action: "completed a trade for a vintage collectible",
    item: { name: "Honus Wagner T206 (VG Condition)", imageUrl: "https://images.unsplash.com/photo-1612404819070-1b5e6791e6ad?w=400&h=400&fit=crop&auto=format", estimatedValue: 12000 },
    timestamp: "10h ago",
  },
  {
    id: "fy-6", suggested: true,
    user: { name: "Sam", handle: "sam", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam&backgroundColor=C7CEEA" },
    type: "new_listing", action: "listed a grail that people are watching",
    item: { name: "Freddy Funko Space Suit (SDCC 2015)", imageUrl: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&h=400&fit=crop&auto=format&q=80&seed=99", estimatedValue: 9800 },
    timestamp: "14h ago",
  },
  {
    id: "fy-7", suggested: true,
    user: { name: "Blake", handle: "blake", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Blake&backgroundColor=B5EAD7" },
    type: "added_grail", action: "added a Pokémon grail you might love",
    item: { name: "Charizard GX Full Art (SM35)", imageUrl: "https://images.pokemontcg.io/sm35/9.png", estimatedValue: 1200 },
    timestamp: "1d ago",
  },
  {
    id: "fy-8", suggested: true,
    user: { name: "Kai", handle: "kai", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kai&backgroundColor=FFB7B2" },
    type: "milestone", action: "hit a $50k vault milestone",
    item: null, timestamp: "1d ago",
  },
];

// Full pools — Following: chronological following posts; For You: interleaved algorithmic feed
const FOLLOWING_POOL: NetworkEvent[] = [...NETWORK_EVENTS, ...EXTRA_FOLLOWING];

const FY_POOL: NetworkEvent[] = [
  FOR_YOU_EVENTS[0],       // fy-1  suggested
  NETWORK_EVENTS[0],       // ne-1
  NETWORK_EVENTS[1],       // ne-2
  FOR_YOU_EVENTS[1],       // fy-2  suggested
  NETWORK_EVENTS[2],       // ne-3
  NETWORK_EVENTS[3],       // ne-4
  EXTRA_SUGGESTED[0],      // fy-3  suggested
  NETWORK_EVENTS[4],       // ne-5
  EXTRA_FOLLOWING[0],      // ne-6
  EXTRA_SUGGESTED[1],      // fy-4  suggested
  EXTRA_FOLLOWING[1],      // ne-7
  EXTRA_FOLLOWING[2],      // ne-8
  EXTRA_SUGGESTED[2],      // fy-5  suggested
  EXTRA_FOLLOWING[3],      // ne-9
  EXTRA_FOLLOWING[4],      // ne-10
  EXTRA_SUGGESTED[3],      // fy-6  suggested
  EXTRA_FOLLOWING[5],      // ne-11
  EXTRA_SUGGESTED[4],      // fy-7  suggested
  EXTRA_FOLLOWING[6],      // ne-12
  EXTRA_SUGGESTED[5],      // fy-8  suggested
];

// Master event lookup — covers every post that can appear in any feed pool
const ALL_EVENTS: NetworkEvent[] = [
  ...NETWORK_EVENTS,
  ...FOR_YOU_EVENTS,
  ...EXTRA_FOLLOWING,
  ...EXTRA_SUGGESTED,
];

const PAGE_SIZE = 5;

// ── Compact activity row ─────────────────────────────────────────────────────

function ActivityRow({
  trade,
  completedAt,
  onClick,
}: {
  trade: TradeHistoryEntry;
  completedAt?: string;
  onClick: () => void;
}) {
  const iAmFrom     = isMe(trade.from.name);
  const other       = iAmFrom ? trade.to : trade.from;
  const isCompleted = trade.status === "accepted" && !!(trade.completedAt || completedAt);

  const label = isCompleted
    ? `Completed trade with ${other.name}`
    : trade.status === "accepted"
    ? `Awaiting fulfillment · ${other.name}`
    : trade.status === "pending" && iAmFrom
    ? `Pending ${other.name}'s response`
    : trade.status === "pending"
    ? `Offer from ${other.name}`
    : trade.status === "declined"
    ? `Trade declined · ${other.name}`
    : `Trade with ${other.name}`;

  const dotCls = isCompleted              ? "bg-green-400"
    : trade.status === "accepted"         ? "bg-surface"
    : trade.status === "declined"         ? "bg-red-400/70"
    : /* pending */                         "bg-amber-400";

  const dateStr = new Date(trade.createdAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });

  const thumbItem = (iAmFrom ? trade.toItems : trade.fromItems)[0];

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-background-light hover:bg-white/[0.05] transition-colors text-left"
    >
      {/* Avatar + status dot */}
      <div className="relative flex-shrink-0">
        <div className="w-8 h-8 rounded-xl overflow-hidden bg-primary/10">
          <img src={other.avatar} alt={other.name} className="w-full h-full object-cover" />
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-charcoal-dark ${dotCls}`} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-cream/75 font-medium truncate">{label}</p>
        {thumbItem && (
          <p className="text-[10px] text-cream/30 truncate mt-0.5 leading-tight">{thumbItem.name}</p>
        )}
      </div>

      {/* Date */}
      <span className="text-[10px] text-cream/25 font-medium flex-shrink-0 tabular-nums">{dateStr}</span>
    </button>
  );
}

// ── Tab deep-link handler ─────────────────────────────────────────────────────
// Reads ?tab= from the URL and redirects to the appropriate page.
// Must be isolated in its own component so useSearchParams() can be wrapped in
// Suspense without forcing the entire HomePage into a suspense boundary.

function TabRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    if (searchParams.get("tab") === "history") {
      router.replace("/history");
    }
  }, [searchParams, router]);
  return null;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isDemo = isDemoUser(session?.user?.email);
  const firstName = session?.user?.name?.split(" ")[0] ?? "Collector";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  const {
    items, totalValue,
    tradeHistoryEntries, addTradeHistory, updateTradeHistory,
    removeItem, addRawItem,
    lockItems,
    showToast,
  } = useInventory();

  const { unlockAchievement, isUnlocked } = useAchievements();

  // ── Home-page tour (Step 0: Command Center) ───────────────────────────────
  const homeTourDriverRef = useRef<ReturnType<typeof driver> | null>(null);
  useEffect(() => {
    // Quick synchronous bail-out — avoids scheduling a timeout on pages
    // where the flag was never set.
    if (localStorage.getItem("needsTour") !== "true") return;

    // All mutation (removeItem + drive) happens INSIDE the timeout.
    // Strict Mode dev mounts → unmounts → remounts synchronously; the
    // cleanup cancels the first timeout, but the flag survives because we
    // haven't touched it yet. The second (real) timeout fires normally.
    // The double-fire guard inside the callback handles the edge case where
    // two timeouts somehow both reach the callback.
    const t = setTimeout(() => {
      // Guard: if another timeout already consumed the flag, bail out.
      if (localStorage.getItem("needsTour") !== "true") return;
      localStorage.removeItem("needsTour");

      // Tracks whether the user reached the final step ("Explore" tab).
      // Used by onDestroyStarted to decide whether to hand off to /search.
      // Reset by onCloseClick so tapping X never triggers the handoff.
      const shouldHandoffRef = { current: false };

      const driverObj = driver({
        showProgress: true,
        allowClose: true,
        stagePadding: 8,
        disableActiveInteraction: true,
        // Fires when the last step's "Done" button is clicked (driver.js
        // ignores onNextClick on the final step and calls destroy directly).
        onDestroyStarted: () => {
          const handoff = shouldHandoffRef.current;
          driverObj.destroy();
          if (handoff) {
            localStorage.setItem("continueTour", "true");
            localStorage.setItem("continueTour_ts", String(Date.now()));
            setTimeout(() => router.push("/search"), 150);
          }
        },
        // X button — cancel without handoff.
        onCloseClick: () => {
          shouldHandoffRef.current = false;
          driverObj.destroy();
        },
        steps: [
          {
            element: "[data-tour='home-nav-tab']",
            popover: {
              title: "🏠 Your Command Center",
              description: "Your main feed, active trades, and grail alerts all in one hub.",
              side: "top",
              align: "center",
              nextBtnText: "Next →",
              // First step — no reason to go back.
              showButtons: ["next", "close"] as ("next" | "previous" | "close")[],
              progressText: "1 of 7",
            },
          },
          {
            element: "[data-tour='explore-nav-tab']",
            // Mark that we've reached the last step — onDestroyStarted will
            // use this to trigger the /search handoff.
            onHighlightStarted: () => { shouldHandoffRef.current = true; },
            popover: {
              title: "🔭 Explore the Market",
              description: "Hunt for your next chase piece and search the global market.",
              side: "top",
              align: "center",
              nextBtnText: "Dive In →",
              progressText: "2 of 7",
            },
          },
        ],
      });
      homeTourDriverRef.current = driverObj;
      driverObj.drive();
    }, 1200);

    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Counter / Edit Offer modal state
  const [counterTradeEntry, setCounterTradeEntry] = useState<TradeHistoryEntry | null>(null);

  const counterPrefill = useMemo(() => {
    if (!counterTradeEntry) return null;
    const t = counterTradeEntry;
    const iAmFrom    = isMe(t.from.name);
    const targetRaw  = iAmFrom ? t.toItems[0]   : t.fromItems[0];
    const offerNames = iAmFrom ? t.fromItems.map((i) => i.name) : t.toItems.map((i) => i.name);
    return {
      counterUser:    iAmFrom ? t.to   : t.from,
      targetItem:     targetRaw ? ({
        id:             targetRaw.id,
        name:           targetRaw.name,
        category:       (targetRaw.category ?? "Other") as Category,
        imageUrl:       targetRaw.imageUrl,
        estimatedValue: targetRaw.estimatedValue,
      } as CollectibleItem) : undefined,
      selectedIds: new Set(
        offerNames
          .map((name) => items.find((i) => i.name === name)?.id)
          .filter((id): id is string => !!id)
      ),
      cashOffer:      iAmFrom ? t.fromCash : t.toCash,
      theirCashOffer: iAmFrom ? t.toCash   : t.fromCash,
    };
  }, [counterTradeEntry, items]);

  // Heart likes for network feed rows
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLikedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // Comments modal
  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);
  const [commentText, setCommentText]             = useState("");
  const [commentLikedIds, setCommentLikedIds]     = useState<Set<string>>(new Set());
  const [postedComments, setPostedComments]       = useState<Record<string, FeedComment[]>>({});
  const [modalComments, setModalComments]         = useState<FeedComment[]>([]);
  const [sortMode, setSortMode]                   = useState<"top" | "fresh">("top");
  const [showLikesList, setShowLikesList]         = useState(false);
  const [replyingToId, setReplyingToId]           = useState<string | null>(null);
  const commentInputRef                           = useRef<HTMLInputElement>(null);

  // Init modal comments whenever a post is opened
  useEffect(() => {
    if (!activeCommentPost) { setModalComments([]); return; }
    const base  = DUMMY_FEED_COMMENTS[activeCommentPost] ?? [];
    const extra = postedComments[activeCommentPost]      ?? [];
    setModalComments([...base, ...extra]);
    setSortMode("top");
    setShowLikesList(false);
    setReplyingToId(null);
  }, [activeCommentPost]); // eslint-disable-line react-hooks/exhaustive-deps

  const sortedComments = useMemo(() => {
    if (sortMode === "top") return [...modalComments].sort((a, b) => b.likes - a.likes);
    // Fresh Drops: strict timestamp descending — guarantees new comments always appear first
    return [...modalComments].sort((a, b) => b.timestamp - a.timestamp);
  }, [modalComments, sortMode]);

  const toggleCommentLike = (id: string) =>
    setCommentLikedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handlePostComment = () => {
    if (!activeCommentPost || !commentText.trim()) return;
    const now = Date.now();

    if (replyingToId) {
      // Nest as a reply under the parent comment
      const newReply: FeedReply = {
        id: `reply-${now}`,
        user: { name: CURRENT_USER.name, handle: CURRENT_USER.handle, avatar: CURRENT_USER.avatar },
        text: commentText.trim(),
        time: "just now",
        timestamp: now,
        likes: 0,
      };
      setModalComments((prev) =>
        prev.map((c) => c.id === replyingToId ? { ...c, replies: [...c.replies, newReply] } : c)
      );
      setReplyingToId(null);
    } else {
      // New top-level comment — prepend so it leads in Fresh Drops
      const newComment: FeedComment = {
        id: `new-${now}`,
        user: { name: CURRENT_USER.name, handle: CURRENT_USER.handle, avatar: CURRENT_USER.avatar },
        text: commentText.trim(),
        time: "just now",
        timestamp: now,
        likes: 0,
        replies: [],
      };
      setModalComments((prev) => [newComment, ...prev]);
      setPostedComments((prev) => ({ ...prev, [activeCommentPost]: [...(prev[activeCommentPost] ?? []), newComment] }));
    }
    setCommentText("");
  };

  const handleReply = (commentId: string) => {
    setReplyingToId(commentId);
    requestAnimationFrame(() => commentInputRef.current?.focus());
  };

  const closeCommentModal = () => {
    setActiveCommentPost(null);
    setCommentText("");
    setShowLikesList(false);
    setReplyingToId(null);
    setShowCommentEmoji(false);
    setCommentEmojiSearch("");
  };

  // Comment emoji picker
  const [showCommentEmoji,   setShowCommentEmoji]   = useState(false);
  const [commentEmojiSearch, setCommentEmojiSearch] = useState("");
  const commentEmojiRef  = useRef<HTMLDivElement>(null);
  const commentSmileRef  = useRef<HTMLButtonElement>(null);

  // Close emoji panel on outside click
  useEffect(() => {
    if (!showCommentEmoji) return;
    const handler = (e: PointerEvent) => {
      if (
        commentEmojiRef.current?.contains(e.target as Node) ||
        commentSmileRef.current?.contains(e.target as Node) ||
        commentInputRef.current?.contains(e.target as Node)
      ) return;
      setShowCommentEmoji(false);
      setCommentEmojiSearch("");
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [showCommentEmoji]);

  const filteredCommentEmojis = commentEmojiSearch.trim()
    ? ALL_EMOJIS.filter(({ n, e }) => n.includes(commentEmojiSearch.toLowerCase()) || e === commentEmojiSearch)
    : null;

  // Insert emoji at the current cursor position (not just end-of-string)
  const appendCommentEmoji = (emoji: string) => {
    const input = commentInputRef.current;
    const start = input?.selectionStart ?? commentText.length;
    const end   = input?.selectionEnd   ?? commentText.length;
    const next  = commentText.slice(0, start) + emoji + commentText.slice(end);
    setCommentText(next);
    requestAnimationFrame(() => {
      input?.focus();
      const pos = start + emoji.length;
      input?.setSelectionRange(pos, pos);
    });
  };

  // Feed offer modal (Make Offer / Propose Trade from Following feed)
  const [feedOfferTarget, setFeedOfferTarget] = useState<{
    user: { name: string; avatar: string };
    item?: CollectibleItem;
  } | null>(null);

  // Feed tab + infinite scroll
  const [feedTab,          setFeedTab]          = useState<"foryou" | "following">("foryou");
  const [visibleCount,     setVisibleCount]     = useState(PAGE_SIZE);
  const [isInfiniteLoading, setIsInfiniteLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const pool        = feedTab === "following" ? FOLLOWING_POOL : FY_POOL;
  const visiblePosts = pool.slice(0, visibleCount);
  const hasMore      = visibleCount < pool.length;

  // Reset pagination when switching tabs
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setIsInfiniteLoading(false);
  }, [feedTab]);

  // IntersectionObserver — fires when the sentinel scrolls into view
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || isInfiniteLoading) return;
        setIsInfiniteLoading(true);
        setTimeout(() => {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, pool.length));
          setIsInfiniteLoading(false);
        }, 800);
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isInfiniteLoading, pool.length]);

  // Pending offers — local state tracks dismissals (accept/decline removes from view)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const dismiss = (id: string) =>
    setDismissedIds((prev) => { const n = new Set(prev); n.add(id); return n; });

  // completedAtMap: dual read so completion is idempotent across page re-renders
  const [completedAtMap, setCompletedAtMap] = useState<Record<string, string>>(loadCompletedMap);

  // Ref guard: prevents double-execution of handleCompleteTrade within one render
  const completingIds = useRef(new Set<string>());

  // IDs that have already been handled (accepted/completed) — prevents stale re-appearing
  // after page refresh when dismissedIds (local state) is lost.
  const handledTradeIds = useMemo(
    () => new Set(tradeHistoryEntries.map((e) => e.id)),
    [tradeHistoryEntries]
  );

  // Convert pending tradeOffers into TradeHistoryEntry for the shared TradeCard.
  // Exclude any offer already in the context (accepted, completed, etc.).
  // Demo account shows mock offers; real users start with no pending offers.
  const pendingEntries = isDemo
    ? tradeOffers
        .filter((o) => o.status === "pending" && !dismissedIds.has(o.id) && !handledTradeIds.has(o.id))
        .map(offerToEntry)
        .slice(0, 3)
    : [];

  // Accepted trades awaiting fulfillment (from context, not yet completed)
  const acceptedPending = tradeHistoryEntries.filter(
    (e) => e.status === "accepted" && !e.completedAt && !completedAtMap[e.id]
  );

  // Combined actionable entries — max 3 shown
  const actionEntries = [...pendingEntries, ...acceptedPending].slice(0, 3);

  // Name-based ownership set — catches items received with deterministic IDs and
  // catalog items that carry a "catalog-*" ID different from the trade offer's ID.
  const userItemNames = useMemo(() => new Set(items.map((i) => i.name)), [items]);

  // Returns true if the user no longer owns one or more items required by the trade.
  // Uses name matching so ID divergence between offer and received item never blocks valid trades.
  const tradeItemsMissing = (entry: TradeHistoryEntry): boolean => {
    const myItems = isMe(entry.from.name) ? entry.fromItems : entry.toItems;
    return myItems.some((item) => !userItemNames.has(item.name));
  };

  // Recent activity — last 3 unique, non-dismissed entries
  // Demo account includes mock staticHistory; real users see only real trades.
  const recentActivity = useMemo(() => {
    const seen = new Set<string>();
    return [
      ...tradeHistoryEntries,
      ...(isDemo ? staticHistory.map(toEntry) : []),
    ]
      .filter((t) => {
        if (seen.has(t.id) || dismissedIds.has(t.id)) return false;
        seen.add(t.id);
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [tradeHistoryEntries, dismissedIds, isDemo]);

  // ── Early return — MUST come after all hooks ─────────────────────────────
  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  const handlePartyClick = (name: string) => {
    if (!isMe(name)) router.push(`/u/${name.toLowerCase()}`);
  };

  // Accept a pending offer: persist as accepted entry, lock the user's items, remove from pending view
  const handleAcceptOffer = (entry: TradeHistoryEntry) => {
    addTradeHistory({ ...entry, status: "accepted" });
    const myItems = isMe(entry.from.name) ? entry.fromItems : entry.toItems;
    // Look up real IDs by name — trade offer IDs may differ from local inventory IDs
    const realIds = myItems
      .map((tradeItem) => items.find((i) => i.name === tradeItem.name)?.id)
      .filter((id): id is string => !!id);
    if (realIds.length > 0) {
      lockItems(realIds, "Deal accepted · Awaiting fulfillment", "accepted");
    }
    dismiss(entry.id);
    showToast("Trade accepted! Mark as complete once pieces have been exchanged.");
  };

  // Complete an accepted trade: atomic inventory swap + persist completion timestamp
  const handleCompleteTrade = (trade: TradeHistoryEntry) => {
    if (completingIds.current.has(trade.id)) return;
    if (trade.completedAt || completedAtMap[trade.id]) return;

    completingIds.current.add(trade.id);

    const now = new Date().toISOString();
    const iAmOfferer    = isMe(trade.from.name);
    const itemsToRemove = iAmOfferer ? trade.fromItems : trade.toItems;
    const itemsToAdd    = iAmOfferer ? trade.toItems   : trade.fromItems;

    // Remove items we gave away — look up the REAL inventory ID by name so
    // items received with a deterministic ID (or any catalog-* ID) are found correctly.
    itemsToRemove.forEach((tradeItem) => {
      const real = items.find((i) => i.name === tradeItem.name);
      if (real) removeItem(real.id);
    });
    itemsToAdd.forEach((item) => {
      const newItem: CollectibleItem = {
        id:             item.id,
        name:           item.name,
        category:       (item.category ?? "Other") as Category,
        imageUrl:       item.imageUrl,
        estimatedValue: item.estimatedValue,
        upForTrade:     false,
      };
      addRawItem(newItem);
    });

    updateTradeHistory(trade.id, { completedAt: now });
    try { localStorage.setItem(`trade_completed_${trade.id}`, now); } catch { /* quota */ }
    setCompletedAtMap((prev) => ({ ...prev, [trade.id]: now }));

    // ── Achievement triggers ───────────────────────────────────────────────
    const catalystItem = itemsToAdd[0]
      ? { name: itemsToAdd[0].name, imageUrl: itemsToAdd[0].imageUrl }
      : undefined;

    // First-blood: first ever completed trade
    if (!isUnlocked("first-blood")) {
      unlockAchievement("first-blood", catalystItem);
    }

    // Dealmaker: 10 completed trades
    const completedCount =
      tradeHistoryEntries.filter((e) => e.completedAt || completedAtMap[e.id]).length + 1;
    if (completedCount >= 10 && !isUnlocked("dealmaker")) {
      unlockAchievement("dealmaker", catalystItem);
    }

    // Heavyweight: collection value ≥ $50,000
    const newTotalValue = totalValue + itemsToAdd.reduce((sum, i) => sum + (i.estimatedValue ?? 0), 0);
    if (newTotalValue >= 50000 && !isUnlocked("heavyweight")) {
      unlockAchievement("heavyweight", catalystItem);
    }

    showToast("🎉 Trade completed! Your vault has been updated.");
  };

  return (
    <div className="min-h-screen pb-20">
      <Suspense>
        <TabRedirect />
      </Suspense>
      <Header />

      <main className="max-w-lg mx-auto pt-6">

        {/* ── New-user empty state — shown when there's nothing to act on ── */}
        {actionEntries.length === 0 && (
          <div className="mx-5 mb-6 pt-5 flex flex-col items-center text-center animate-slide-up">
            <p className="text-base font-extrabold text-cream/80 mb-1">Grail Quest Starts Here.</p>
            <p className="text-xs text-cream/35 mb-4 max-w-[240px] leading-relaxed">
              Discover rare pieces, propose your first trade, and build a vault worth coveting.
            </p>
            <button
              onClick={() => router.push("/search")}
              className="bg-primary text-charcoal-dark text-xs font-bold px-5 py-2.5 rounded-full shadow-[0_0_16px_rgba(202,230,206,0.3)] active:scale-95 transition-all"
            >
              Explore Trending Grails
            </button>
          </div>
        )}

        {/* ── Action Required — only rendered when there is something to act on ── */}
        {actionEntries.length > 0 && (
          <div className="mb-6 pt-3">
            <div className="px-5 flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] text-cream/30 font-bold uppercase tracking-widest">Action Required</p>
                {pendingEntries.length > 0 && (
                  <p className="text-[10px] text-amber-400/70 font-semibold mt-0.5">
                    {pendingEntries.length} offer{pendingEntries.length !== 1 ? "s" : ""} waiting for your response
                  </p>
                )}
                {acceptedPending.length > 0 && (
                  <p className="text-[10px] text-surface/70 font-semibold mt-0.5">
                    {acceptedPending.length} trade{acceptedPending.length !== 1 ? "s" : ""} awaiting fulfillment
                  </p>
                )}
              </div>
              <button
                onClick={() => router.push("/history")}
                className="text-[10px] text-primary/70 font-semibold hover:text-primary transition-colors"
              >
                View all →
              </button>
            </div>
            <div className="px-5 space-y-3">
              {actionEntries.map((entry, i) => (
                <TradeCard
                  key={entry.id}
                  trade={entry}
                  index={i}
                  onAccept={
                    entry.status === "pending"
                      ? () => handleAcceptOffer(entry)
                      : undefined
                  }
                  onCancel={
                    entry.status === "pending"
                      ? () => { addTradeHistory({ ...entry, status: "declined" }); dismiss(entry.id); }
                      : undefined
                  }
                  onCounter={
                    entry.status === "pending"
                      ? () => setCounterTradeEntry(entry)
                      : undefined
                  }
                  onMessage={
                    entry.status === "pending"
                      ? () => {
                          const other = isMe(entry.from.name) ? entry.to : entry.from;
                          router.push(`/inbox/${other.name.toLowerCase()}`);
                        }
                      : undefined
                  }
                  onComplete={
                    entry.status === "accepted" && !entry.completedAt && !completedAtMap[entry.id]
                      ? () => handleCompleteTrade(entry)
                      : undefined
                  }
                  itemsMissing={tradeItemsMissing(entry)}
                  onPartyClick={handlePartyClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Trending Grails — Stories carousel ── */}
        <div className="mb-6" data-tour="home-feed">
          <div className="px-5 mb-3">
            <p className="text-[10px] text-cream/30 font-bold uppercase tracking-widest">Trending Grails</p>
            <p className="text-[10px] text-cream/20 mt-0.5 font-medium">Pieces with the most views in the last 24 hours.</p>
          </div>
          <div className="flex gap-4 pb-4 no-scrollbar px-5 overflow-x-auto flex-nowrap snap-x snap-mandatory" style={{ scrollPaddingLeft: "1.25rem" }}>
            {COMMUNITY_HIGHLIGHTS.map((item, i) => (
              <div
                key={item.id}
                className="flex-shrink-0 w-40 rounded-2xl bg-background-light shadow-soft overflow-hidden text-left animate-slide-up snap-start"
                style={{ animationDelay: `${i * 0.07}s`, animationFillMode: "both" }}
              >
                {/* Item image — click opens offer modal */}
                <button
                  onClick={() => setFeedOfferTarget({
                    user: { name: item.ownerName, avatar: item.ownerAvatar },
                    item: { id: item.id, name: item.name, category: item.category as Category, imageUrl: item.imageUrl, estimatedValue: item.estimatedValue, upForTrade: true },
                  })}
                  className="relative h-40 w-full overflow-hidden bg-charcoal-dark/40 block active:brightness-90 transition-all"
                >
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  {/* Views badge */}
                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 z-10">
                    <Eye className="w-3 h-3" />
                    {item.views}
                  </div>
                </button>
                <div className="p-2.5">
                  <p className="text-[10px] text-cream/70 line-clamp-2 leading-snug font-semibold mb-1.5">{item.name}</p>
                  {/* Owner — click navigates to profile */}
                  <Link href={`/u/${item.ownerHandle}`} className="flex items-center gap-1.5 mb-1.5 hover:opacity-70 transition-opacity w-fit">
                    <div className="w-4 h-4 rounded-full overflow-hidden bg-surface/20 flex-shrink-0">
                      <img src={item.ownerAvatar} alt={item.ownerName} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[9px] text-cream/35 font-medium">{item.ownerName}</span>
                  </Link>
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <span className="text-[10px] font-extrabold text-primary">{formatValue(item.estimatedValue)}</span>
                    <span className="text-[8px] text-cream/25 font-semibold bg-white/[0.06] px-1.5 py-0.5 rounded-full whitespace-nowrap">{item.wantsTag}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Feed toggle + posts ── */}
        <div className="mb-8">

          {/* Sticky tab bar */}
          <div className="sticky top-0 z-20 bg-[#221F1F]/90 backdrop-blur-md border-b border-white/[0.08] px-5 flex gap-6">
            <button
              onClick={() => setFeedTab("foryou")}
              className={`text-sm font-bold pb-3 pt-4 px-1 border-b-2 transition-colors ${
                feedTab === "foryou"
                  ? "text-[#CAE6CE] border-[#CAE6CE]"
                  : "text-[#787569] border-transparent hover:text-[#FCF9D5]"
              }`}
            >
              For You
            </button>
            <button
              onClick={() => setFeedTab("following")}
              className={`text-sm font-bold pb-3 pt-4 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
                feedTab === "following"
                  ? "text-[#CAE6CE] border-[#CAE6CE]"
                  : "text-[#787569] border-transparent hover:text-[#FCF9D5]"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Following
            </button>
          </div>

          <div className="px-5 pt-4 space-y-4">
            {visiblePosts.map((event, i) => {
              const meta          = EVENT_META[event.type];
              const isLiked       = likedIds.has(event.id);
              const likes         = (DUMMY_LIKES[event.id] ?? 0) + (isLiked ? 1 : 0);
              const commentsCount = DUMMY_FEED_COMMENTS[event.id]?.length ?? 0;
              const isMilestone   = event.type === "milestone";
              const isRadar       = event.type === "updated_radar";

              return (
                <div
                  key={event.id}
                  className={`rounded-2xl border overflow-hidden animate-slide-up ${
                    isMilestone
                      ? "bg-gradient-to-br from-[#D4AF37]/5 to-[#2C2929] border-[#D4AF37]/20"
                      : "bg-[#2C2929] border-white/[0.05]"
                  }`}
                  style={{ animationDelay: `${i * 0.06}s`, animationFillMode: "both" }}
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                    <Link href={`/u/${event.user.handle}`} className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 block hover:opacity-80 transition-opacity">
                      <img src={event.user.avatar} alt={event.user.name} className="w-full h-full object-cover" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      {event.suggested && (
                        <div className="flex items-center gap-1 text-[9px] text-[#AA95C5] font-bold uppercase tracking-wider mb-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                          Suggested for you
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link href={`/u/${event.user.handle}`} className="text-sm font-bold text-cream hover:text-primary transition-colors">
                          {event.user.name}
                        </Link>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5 ${meta.cls}`}>
                          {isRadar && <Bell className="w-2.5 h-2.5" />}
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-cream/40 mt-0.5 leading-snug">{event.action}</p>
                    </div>
                    <span className="text-[10px] text-cream/25 font-medium flex-shrink-0">{event.timestamp}</span>
                  </div>

                  {/* Media — milestone achievement card */}
                  {isMilestone && (
                    <div className="mx-4 h-48 rounded-xl overflow-hidden relative flex flex-col items-center justify-center bg-[#1A1608]"
                      style={{ background: "radial-gradient(ellipse at 50% 60%, rgba(212,175,55,0.18) 0%, rgba(26,22,8,0.95) 70%)" }}
                    >
                      <Trophy className="w-14 h-14 text-[#D4AF37] mb-3 drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]" />
                      <p className="text-[#FDE047] text-lg font-black tracking-tight drop-shadow-[0_0_12px_rgba(253,224,71,0.4)]">
                        Hit $10K Value
                      </p>
                      <p className="text-[#D4AF37]/50 text-[10px] font-semibold mt-1 uppercase tracking-widest">Vault Milestone</p>
                    </div>
                  )}

                  {/* Media — Radar horizontal scroll */}
                  {isRadar && (
                    <div className="overflow-x-auto flex gap-3 pb-2 no-scrollbar px-4 mt-1">
                      {RADAR_IMAGES.map((src, idx) => (
                        <div key={idx} className="flex-shrink-0 w-24 rounded-xl bg-white/[0.05] overflow-hidden border border-white/[0.06]">
                          <div className="h-20 overflow-hidden">
                            <img src={src} alt="Want" className="w-full h-full object-cover" loading="lazy" />
                          </div>
                          <p className="text-[9px] text-cream/50 font-medium px-2 py-1.5 truncate">Grail #{idx + 1}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Media — standard item image (click opens offer modal) */}
                  {!isMilestone && !isRadar && event.item && (
                    <>
                      <button
                        onClick={() => event.item && setFeedOfferTarget({
                          user: { name: event.user.name, avatar: event.user.avatar },
                          item: { id: event.id, name: event.item.name, category: "Other", imageUrl: event.item.imageUrl, estimatedValue: event.item.estimatedValue, upForTrade: true },
                        })}
                        className="mx-4 rounded-xl overflow-hidden bg-white/[0.04] h-48 w-[calc(100%-2rem)] block active:brightness-90 transition-all"
                      >
                        <img src={event.item.imageUrl} alt={event.item.name} className="w-full h-full object-cover" loading="lazy" />
                      </button>
                      <div className="px-4 pt-3">
                        <p className="text-sm font-bold text-cream leading-tight truncate">{event.item.name}</p>
                        {event.item.estimatedValue && (
                          <p className="text-xs text-[#CAE6CE] font-bold mt-0.5">{formatValue(event.item.estimatedValue)}</p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Engagement bar */}
                  <div className="flex items-center gap-1 px-3 py-3 mt-1">
                    <button
                      onClick={(e) => toggleLike(event.id, e)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors active:scale-95"
                    >
                      <Heart className={`w-4 h-4 transition-all duration-150 ${isLiked ? "fill-red-500 text-red-500" : "text-cream/30"}`} />
                      <span className="text-[11px] text-cream/40 font-medium">{likes}</span>
                    </button>
                    <button
                      onClick={() => setActiveCommentPost(event.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors active:scale-95 text-cream/30"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-[11px] text-cream/40 font-medium">
                        {commentsCount + (postedComments[event.id]?.length ?? 0)}
                      </span>
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors active:scale-95 text-cream/30">
                      <Share className="w-4 h-4" />
                    </button>
                    {(event.item || isRadar) && (
                      <button
                        onClick={() => setFeedOfferTarget({
                          user: { name: event.user.name, avatar: event.user.avatar },
                          item: event.item
                            ? { id: event.id, name: event.item.name, category: "Other", imageUrl: event.item.imageUrl, estimatedValue: event.item.estimatedValue, upForTrade: true }
                            : undefined,
                        })}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#CAE6CE]/10 border border-[#CAE6CE]/20 text-[#CAE6CE] text-[11px] font-semibold hover:bg-[#CAE6CE]/20 transition-colors active:scale-95"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        {isRadar ? "Propose Trade" : "Make Offer"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sentinel + feed footer */}
          <div ref={sentinelRef} className="px-5">
            {hasMore ? (
              <div className="py-10 flex flex-col items-center justify-center gap-2">
                <Loader2 className={`w-5 h-5 text-[#CAE6CE] ${isInfiniteLoading ? "animate-spin opacity-60" : "opacity-20"}`} />
                <span className="text-[10px] text-[#787569] opacity-60">
                  {isInfiniteLoading ? "Loading more grails…" : "Scroll for more"}
                </span>
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-[11px] text-[#787569]">You&apos;re all caught up.</p>
                <p className="text-[10px] text-[#787569]/50 mt-1">Check back later for new drops.</p>
              </div>
            )}
          </div>
        </div>

      </main>

      <BottomNav />

      {/* ── Counter / Edit Offer modal ── */}
      {counterTradeEntry && counterPrefill && (
        <ProposeTradeModal
          isOpen
          onClose={() => setCounterTradeEntry(null)}
          targetUser={counterPrefill.counterUser}
          prefill={{
            targetItem:     counterPrefill.targetItem,
            selectedIds:    counterPrefill.selectedIds,
            cashOffer:      counterPrefill.cashOffer,
            theirCashOffer: counterPrefill.theirCashOffer,
          }}
          onTradeSent={() => {
            dismiss(counterTradeEntry.id);
            setCounterTradeEntry(null);
            showToast(isMe(counterTradeEntry.from.name) ? "Offer updated and sent!" : "Counter offer sent!");
          }}
        />
      )}

      {/* ── Feed Offer modal (Make Offer / Propose Trade from feed) ── */}
      {feedOfferTarget && (
        <ProposeTradeModal
          isOpen
          onClose={() => setFeedOfferTarget(null)}
          targetUser={feedOfferTarget.user}
          prefill={feedOfferTarget.item ? { targetItem: feedOfferTarget.item } : undefined}
          skipNavigation
          onTradeSent={() => {
            setFeedOfferTarget(null);
            showToast("Offer sent!");
          }}
        />
      )}

      {/* ── Comments Modal ── */}
      {activeCommentPost && (() => {
        const activeEvent   = ALL_EVENTS.find((e) => e.id === activeCommentPost);
        if (!activeEvent) return null;
        const isMilestone   = activeEvent.type === "milestone";
        const isRadar       = activeEvent.type === "updated_radar";
        const meta          = EVENT_META[activeEvent.type];
        const isLiked       = likedIds.has(activeCommentPost);
        const modalLikes    = (DUMMY_LIKES[activeCommentPost] ?? 0) + (isLiked ? 1 : 0);
        const likedBy       = DUMMY_LIKED_BY[activeCommentPost] ?? [];
        const totalComments = sortedComments.length;
        const replyingTo    = replyingToId ? modalComments.find((c) => c.id === replyingToId) : null;

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
            onClick={(e) => { if (e.target === e.currentTarget) closeCommentModal(); }}
          >
            <div
              className="bg-[#2C2929] w-full max-w-md rounded-3xl flex flex-col overflow-hidden border border-white/[0.07] shadow-2xl"
              style={{ maxHeight: "85vh" }}
            >
              {/* ── Header ── */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] flex-shrink-0">
                <p className="text-sm font-bold text-cream">
                  {showLikesList ? "Liked by" : "Comments"}
                </p>
                <div className="flex items-center gap-2.5">
                  {!showLikesList && (
                    <select
                      value={sortMode}
                      onChange={(e) => setSortMode(e.target.value as "top" | "fresh")}
                      className="text-[11px] font-semibold bg-[#2C2929] text-[#FCF9D5] border border-white/10 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
                    >
                      <option value="top">🔥 Top Hype</option>
                      <option value="fresh">✨ Fresh Drops</option>
                    </select>
                  )}
                  <button
                    onClick={closeCommentModal}
                    className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5 text-cream/60" />
                  </button>
                </div>
              </div>

              {/* ── Scrollable body ── */}
              <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">

                {/* ── Post hero ── */}
                <div className="px-4 pt-4 pb-3 border-b border-white/[0.05]">
                  {/* Poster identity — avatar + name link to profile */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <Link href={`/u/${activeEvent.user.handle}`} onClick={closeCommentModal}
                      className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-surface/20 hover:opacity-80 transition-opacity block"
                    >
                      <img src={activeEvent.user.avatar} alt={activeEvent.user.name} className="w-full h-full object-cover" />
                    </Link>
                    <div>
                      <Link href={`/u/${activeEvent.user.handle}`} onClick={closeCommentModal}
                        className="text-sm font-bold text-cream hover:text-[#CAE6CE] transition-colors leading-tight block"
                      >
                        {activeEvent.user.name}
                      </Link>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5 ${meta.cls}`}>
                          {isRadar && <Bell className="w-2.5 h-2.5" />}
                          {meta.label}
                        </span>
                        <span className="text-[10px] text-cream/30">{activeEvent.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  {/* Item visual — tall & full width */}
                  {isMilestone && (
                    <div className="w-full h-[260px] rounded-xl overflow-hidden flex flex-col items-center justify-center mt-1"
                      style={{ background: "radial-gradient(ellipse at 50% 60%, rgba(212,175,55,0.22) 0%, rgba(26,22,8,0.97) 70%)" }}
                    >
                      <Trophy className="w-16 h-16 text-[#D4AF37] mb-3 drop-shadow-[0_0_24px_rgba(212,175,55,0.55)]" />
                      <p className="text-[#FDE047] text-xl font-black tracking-tight drop-shadow-[0_0_14px_rgba(253,224,71,0.4)]">Hit $10K Value</p>
                      <p className="text-[#D4AF37]/50 text-[10px] font-semibold mt-1.5 uppercase tracking-widest">Vault Milestone</p>
                    </div>
                  )}
                  {isRadar && (
                    <div className="overflow-x-auto flex gap-3 pb-1 no-scrollbar mt-1">
                      {RADAR_IMAGES.map((src, idx) => (
                        <div key={idx} className="flex-shrink-0 w-32 rounded-xl bg-white/[0.05] overflow-hidden border border-white/[0.06]">
                          <div className="h-28 overflow-hidden">
                            <img src={src} alt="Want" className="w-full h-full object-cover" />
                          </div>
                          <p className="text-[9px] text-cream/50 font-medium px-2 py-1.5 truncate">Grail #{idx + 1}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {!isMilestone && !isRadar && activeEvent.item && (
                    <div className="w-full h-[280px] rounded-xl overflow-hidden bg-white/[0.04] mt-1">
                      <img src={activeEvent.item.imageUrl} alt={activeEvent.item.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}

                  {/* Item details + CTA */}
                  {!isMilestone && activeEvent.item && (
                    <div className="flex items-center justify-between mt-3">
                      <div className="min-w-0 mr-3">
                        <p className="text-sm font-bold text-cream leading-tight">{activeEvent.item.name}</p>
                        {activeEvent.item.estimatedValue && (
                          <p className="text-xs text-[#CAE6CE] font-bold mt-0.5">{formatValue(activeEvent.item.estimatedValue)}</p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          closeCommentModal();
                          activeEvent.item && setFeedOfferTarget({
                            user: { name: activeEvent.user.name, avatar: activeEvent.user.avatar },
                            item: { id: activeEvent.id, name: activeEvent.item.name, category: "Other", imageUrl: activeEvent.item.imageUrl, estimatedValue: activeEvent.item.estimatedValue, upForTrade: true },
                          });
                        }}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#CAE6CE]/10 border border-[#CAE6CE]/20 text-[#CAE6CE] text-[11px] font-bold hover:bg-[#CAE6CE]/20 transition-colors active:scale-95"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        {isRadar ? "Propose Trade" : "Make Offer"}
                      </button>
                    </div>
                  )}

                  {/* Engagement row — likes count opens who-liked-it view */}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.05]">
                    <button onClick={(e) => toggleLike(activeCommentPost, e)} className="active:scale-95 transition-transform">
                      <Heart className={`w-4 h-4 transition-all duration-150 ${isLiked ? "fill-red-500 text-red-500" : "text-cream/30"}`} />
                    </button>
                    <button
                      onClick={() => setShowLikesList((v) => !v)}
                      className="text-[11px] font-semibold text-cream/50 hover:text-cream/80 transition-colors underline-offset-2 hover:underline"
                    >
                      {modalLikes.toLocaleString()} {modalLikes === 1 ? "like" : "likes"}
                    </button>
                    <span className="text-cream/20">·</span>
                    <span className="text-[11px] text-cream/30">{totalComments} comment{totalComments !== 1 ? "s" : ""}</span>
                  </div>
                </div>

                {/* ── Likes list view ── */}
                {showLikesList ? (
                  <div className="px-4 pt-3 pb-4">
                    <button
                      onClick={() => setShowLikesList(false)}
                      className="flex items-center gap-1 text-[11px] text-[#CAE6CE] font-semibold mb-4 hover:opacity-70 transition-opacity"
                    >
                      ← Back to comments
                    </button>
                    {likedBy.length === 0 ? (
                      <p className="text-sm text-cream/20 text-center py-6">No likes yet — be the first!</p>
                    ) : (
                      <>
                        <p className="text-[12px] text-cream/40 mb-3 leading-relaxed">
                          Liked by{" "}
                          <span className="font-bold text-cream/70">{likedBy[0]}</span>
                          {likedBy[1] && <>, <span className="font-bold text-cream/70">{likedBy[1]}</span></>}
                          {likedBy.length > 2 && <> and <span className="font-bold text-cream/70">{likedBy.length - 2} others</span></>}
                        </p>
                        <div className="space-y-0.5">
                          {likedBy.map((name) => {
                            const handle = name.toLowerCase();
                            return (
                              <Link
                                key={name}
                                href={`/u/${handle}`}
                                onClick={closeCommentModal}
                                className="flex items-center gap-3 py-2 rounded-xl hover:bg-white/[0.04] px-2 transition-colors"
                              >
                                <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-surface/20">
                                  <img
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}&backgroundColor=B5EAD7`}
                                    alt={name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <p className="text-sm font-semibold text-cream/80 flex-1">{name}</p>
                                <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                              </Link>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  /* ── Comments list ── */
                  <div className="px-4 pt-4 pb-4 space-y-5">
                    {sortedComments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-2 text-cream/20">
                        <MessageCircle className="w-8 h-8" />
                        <p className="text-sm font-semibold">No comments yet</p>
                        <p className="text-xs">Be the first to drop a thought!</p>
                      </div>
                    ) : (
                      sortedComments.map((c) => {
                        const cLiked       = commentLikedIds.has(c.id);
                        const displayLikes = c.likes + (cLiked ? 1 : 0);
                        return (
                          <div key={c.id}>
                            {/* Top-level comment */}
                            <div className="flex gap-3">
                              <Link href={`/u/${c.user.handle}`} onClick={closeCommentModal}
                                className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 bg-surface/20 hover:opacity-80 transition-opacity block"
                              >
                                <img src={c.user.avatar} alt={c.user.name} className="w-full h-full object-cover" />
                              </Link>
                              <div className="flex-1 min-w-0">
                                <div className="bg-white/[0.04] rounded-2xl rounded-tl-sm px-3 py-2.5">
                                  <Link href={`/u/${c.user.handle}`} onClick={closeCommentModal}
                                    className="text-[11px] font-bold text-cream hover:text-[#CAE6CE] transition-colors inline-block mb-1"
                                  >
                                    {c.user.name}
                                  </Link>
                                  <p className="text-[12px] text-cream/75 leading-snug">{c.text}</p>
                                </div>
                                <div className="flex items-center gap-3 mt-1.5 px-1">
                                  <span className="text-[10px] text-cream/25">{c.time}</span>
                                  <button
                                    onClick={() => toggleCommentLike(c.id)}
                                    className="flex items-center gap-1 text-[10px] font-semibold active:scale-95 transition-transform"
                                  >
                                    <Heart className={`w-3 h-3 ${cLiked ? "fill-red-500 text-red-500" : "text-cream/30"}`} />
                                    {displayLikes > 0 && <span className={cLiked ? "text-red-400" : "text-cream/30"}>{displayLikes}</span>}
                                  </button>
                                  <button
                                    onClick={() => handleReply(c.id)}
                                    className={`text-[10px] font-semibold transition-colors ${replyingToId === c.id ? "text-[#CAE6CE]" : "text-cream/30 hover:text-[#CAE6CE]"}`}
                                  >
                                    {replyingToId === c.id ? "Replying…" : "Reply"}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Threaded replies */}
                            {c.replies.length > 0 && (
                              <div className="ml-11 mt-3 space-y-3 pl-3 border-l-2 border-white/[0.06]">
                                {c.replies.map((r) => {
                                  const rLiked = commentLikedIds.has(r.id);
                                  const rLikes = r.likes + (rLiked ? 1 : 0);
                                  return (
                                    <div key={r.id} className="flex gap-2.5">
                                      <Link href={`/u/${r.user.handle}`} onClick={closeCommentModal}
                                        className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 bg-surface/20 hover:opacity-80 transition-opacity block"
                                      >
                                        <img src={r.user.avatar} alt={r.user.name} className="w-full h-full object-cover" />
                                      </Link>
                                      <div className="flex-1 min-w-0">
                                        <div className="bg-white/[0.03] rounded-2xl rounded-tl-sm px-3 py-2">
                                          <Link href={`/u/${r.user.handle}`} onClick={closeCommentModal}
                                            className="text-[10px] font-bold text-cream/80 hover:text-[#CAE6CE] transition-colors inline-block mb-0.5"
                                          >
                                            {r.user.name}
                                          </Link>
                                          <p className="text-[11px] text-cream/65 leading-snug">{r.text}</p>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 px-1">
                                          <span className="text-[9px] text-cream/20">{r.time}</span>
                                          <button
                                            onClick={() => toggleCommentLike(r.id)}
                                            className="flex items-center gap-1 text-[9px] font-semibold active:scale-95 transition-transform"
                                          >
                                            <Heart className={`w-2.5 h-2.5 ${rLiked ? "fill-red-500 text-red-500" : "text-cream/25"}`} />
                                            {rLikes > 0 && <span className={rLiked ? "text-red-400" : "text-cream/25"}>{rLikes}</span>}
                                          </button>
                                          <button
                                            onClick={() => handleReply(c.id)}
                                            className="text-[9px] text-cream/25 font-semibold hover:text-[#CAE6CE] transition-colors"
                                          >
                                            Reply
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* ── Input footer ── */}
              <div className="flex-shrink-0 border-t border-white/[0.07]">

                {/* Emoji picker panel — slides in above the input row */}
                {showCommentEmoji && !showLikesList && (
                  <div ref={commentEmojiRef} className="border-b border-white/[0.06] flex flex-col animate-slide-up">
                    {/* Search */}
                    <div className="px-4 pt-3 pb-2">
                      <input
                        type="search"
                        value={commentEmojiSearch}
                        onChange={(e) => setCommentEmojiSearch(e.target.value)}
                        placeholder="Search emojis…"
                        className="w-full px-3 py-1.5 rounded-xl bg-[#221F1F] text-xs text-cream placeholder:text-cream/25 focus:outline-none focus:ring-1 focus:ring-[#AA95C5]/30 transition-all"
                      />
                    </div>
                    {/* Emoji grid */}
                    <div className="overflow-y-auto no-scrollbar" style={{ maxHeight: "13rem" }}>
                      {filteredCommentEmojis ? (
                        <div className="px-4 pb-4">
                          {filteredCommentEmojis.length === 0 ? (
                            <p className="text-center text-xs text-cream/25 py-5">No results for &ldquo;{commentEmojiSearch}&rdquo;</p>
                          ) : (
                            <div className="grid grid-cols-8 gap-1">
                              {filteredCommentEmojis.map(({ e }) => (
                                <button key={e} onClick={() => appendCommentEmoji(e)}
                                  className="text-xl h-9 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors active:scale-90"
                                >{e}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        EMOJI_CATEGORIES.map((cat) => (
                          <div key={cat.name}>
                            <div className="sticky top-0 z-10 px-4 py-1.5 bg-[#2C2929]/95 backdrop-blur-sm border-b border-white/[0.04]">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-cream/30">{cat.name}</p>
                            </div>
                            <div className="px-4 py-2 grid grid-cols-8 gap-1">
                              {cat.emojis.map(({ e, n }) => (
                                <button key={e} onClick={() => appendCommentEmoji(e)} title={n}
                                  className="text-xl h-9 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors active:scale-90"
                                >{e}</button>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Replying-to context bar */}
                {replyingTo && (
                  <div className="flex items-center justify-between px-5 py-2 bg-[#CAE6CE]/5 border-b border-[#CAE6CE]/10">
                    <p className="text-[11px] text-[#CAE6CE]/70 font-medium truncate">
                      Replying to <span className="font-bold text-[#CAE6CE]">{replyingTo.user.name}</span>
                    </p>
                    <button
                      onClick={() => { setReplyingToId(null); setCommentText(""); }}
                      className="text-[10px] text-cream/30 hover:text-cream/60 font-semibold ml-3 flex-shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Input row */}
                <div className="flex items-center gap-2 px-4 py-3">
                  <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 bg-surface/20">
                    <img src={CURRENT_USER.avatar} alt={CURRENT_USER.name} className="w-full h-full object-cover" />
                  </div>
                  {/* Emoji toggle */}
                  <button
                    ref={commentSmileRef}
                    onClick={() => {
                      if (showLikesList) return;
                      setShowCommentEmoji((v) => { if (v) setCommentEmojiSearch(""); return !v; });
                    }}
                    disabled={showLikesList}
                    className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                      showCommentEmoji ? "bg-[#CAE6CE]/20 text-[#CAE6CE]" : "text-cream/30 hover:text-cream/60 hover:bg-white/[0.06]"
                    } disabled:opacity-30`}
                    aria-label="Emoji picker"
                  >
                    <Smile className="w-4.5 h-4.5" />
                  </button>
                  <input
                    ref={commentInputRef}
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePostComment()}
                    placeholder={
                      showLikesList ? "Switch to comments to reply…" :
                      replyingTo    ? `Replying to ${replyingTo.user.name}…` :
                                      "Add a comment…"
                    }
                    disabled={showLikesList}
                    className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-2.5 text-sm text-cream placeholder:text-cream/20 focus:outline-none focus:ring-1 focus:ring-[#CAE6CE]/30 transition-all disabled:opacity-40"
                  />
                  <button
                    onClick={handlePostComment}
                    disabled={!commentText.trim() || showLikesList}
                    className="px-3 py-2.5 rounded-2xl bg-[#CAE6CE]/10 border border-[#CAE6CE]/20 text-[#CAE6CE] text-xs font-bold hover:bg-[#CAE6CE]/20 transition-colors active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
