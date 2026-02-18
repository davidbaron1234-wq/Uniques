import { CollectibleItem, TradeOffer, User } from "./types";
import { CATEGORIES, Category } from "./constants";

export const currentUser: User = {
  id: "user-1",
  name: "You",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=CAE6CE",
  bio: "Collector of rare Pokémon cards and vintage sneakers. Always looking for fair trades!",
  trustScore: 4.8,
  totalTrades: 47,
  memberSince: "2024-03-15",
  deliveryPreference: "Tracked shipping with insurance",
  paymentPreference: "PayPal / Venmo",
};

export const otherUsers: User[] = [
  { id: "user-2", name: "Alex", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=AA95C5", bio: "Funko Pop hunter since 2019", trustScore: 4.5, totalTrades: 32, memberSince: "2024-06-01" },
  { id: "user-3", name: "Sam", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam&backgroundColor=FCF9D5", bio: "Vintage card enthusiast", trustScore: 5.0, totalTrades: 89, memberSince: "2023-11-10" },
  { id: "user-4", name: "Jordan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan&backgroundColor=CAE6CE", bio: "Sneakerhead & coin collector", trustScore: 3.9, totalTrades: 15, memberSince: "2025-01-20" },
  { id: "user-5", name: "Riley", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Riley&backgroundColor=AA95C5", bio: "New collector, looking to trade!", trustScore: 4.2, totalTrades: 8, memberSince: "2025-08-05" },
];

export const categories: readonly Category[] = CATEGORIES;

// Unsplash images by category for realistic look
const cardImg = (seed: number) =>
  `https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=400&h=400&fit=crop&auto=format&q=80&seed=${seed}`;
const funkoImg = (seed: number) =>
  `https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&h=400&fit=crop&auto=format&q=80&seed=${seed}`;
const shoeImg = (seed: number) =>
  `https://images.unsplash.com/photo-1542291026616-b53d9907b4f2?w=400&h=400&fit=crop&auto=format&q=80&seed=${seed}`;
const coinImg = (seed: number) =>
  `https://images.unsplash.com/photo-1621761311883-7afb4d616a72?w=400&h=400&fit=crop&auto=format&q=80&seed=${seed}`;
const figureImg = (seed: number) =>
  `https://images.unsplash.com/photo-1594736797933-d3b5e3c22c1a?w=400&h=400&fit=crop&auto=format&q=80&seed=${seed}`;
const comicImg = (seed: number) =>
  `https://images.unsplash.com/photo-1612036782180-f82956ef2431?w=400&h=400&fit=crop&auto=format&q=80&seed=${seed}`;

export const inventoryItems: CollectibleItem[] = [
  // ── Pokémon TCG ────────────────────────────────────────────────
  // 🔥 הוספתי כאן graded: true כדי שתראה את התג החדש עובד
  { id: "tc-1",  masterId: "ptcg-base1-4",    name: "Charizard (Base Set)",                category: "Pokémon TCG", imageUrl: "https://images.pokemontcg.io/base1/4.png",        upForTrade: false, estimatedValue: 350, graded: true, grader: "PSA", gradeNum: "9", condition: "Mint" },
  { id: "tc-2",  masterId: "ptcg-base1-2",    name: "Blastoise (Base Set)",                category: "Pokémon TCG", imageUrl: "https://images.pokemontcg.io/base1/2.png",        upForTrade: false, estimatedValue: 120, condition: "Near Mint" },
  { id: "tc-3",  masterId: "ptcg-base1-15",   name: "Venusaur (Base Set)",                 category: "Pokémon TCG", imageUrl: "https://images.pokemontcg.io/base1/15.png",       upForTrade: true,  estimatedValue: 100, condition: "Lightly Played" },
  { id: "tc-4",  masterId: "ptcg-base1-10",   name: "Mewtwo (Base Set)",                   category: "Pokémon TCG", imageUrl: "https://images.pokemontcg.io/base1/10.png",       upForTrade: false, estimatedValue: 45, condition: "Near Mint" },
  { id: "tc-5",  masterId: "ptcg-neo1-9",     name: "Lugia (Neo Genesis)",                 category: "Pokémon TCG", imageUrl: "https://images.pokemontcg.io/neo1/9.png",         upForTrade: true,  estimatedValue: 200, graded: true, grader: "CGC", gradeNum: "8.5" },
  { id: "tc-6",  masterId: "ptcg-swsh7-215",  name: "Umbreon VMAX Alt Art",                category: "Pokémon TCG", imageUrl: "https://images.pokemontcg.io/swsh7/215.png",      upForTrade: true,  estimatedValue: 300, condition: "Mint" },
  { id: "tc-7",  masterId: "ptcg-swsh7-218",  name: "Rayquaza VMAX Alt Art",               category: "Pokémon TCG", imageUrl: "https://images.pokemontcg.io/swsh7/218.png",      upForTrade: false, estimatedValue: 250 },
  { id: "tc-8",  masterId: "ptcg-swsh9-174",  name: "Charizard VSTAR",                     category: "Pokémon TCG", imageUrl: "https://images.pokemontcg.io/swsh9/174.png",      upForTrade: true,  estimatedValue: 90 },
  { id: "tc-9",  masterId: "ptcg-sv3pt5-183", name: "Charizard ex (151 SAR)",              category: "Pokémon TCG", imageUrl: cardImg(9),  upForTrade: true,  estimatedValue: 80 },
  { id: "tc-10", masterId: "ptcg-sv8pt5-187", name: "Umbreon ex SIR (Prismatic Evo)",      category: "Pokémon TCG", imageUrl: cardImg(10), upForTrade: true,  estimatedValue: 300 },
  { id: "tc-11", masterId: "ptcg-base5-4",    name: "Dark Charizard",                      category: "Pokémon TCG", imageUrl: "https://images.pokemontcg.io/base5/4.png",        upForTrade: true,  estimatedValue: 120 },
  { id: "tc-12", masterId: "ptcg-neo4-107",   name: "Shining Charizard (Neo Destiny)",     category: "Pokémon TCG", imageUrl: cardImg(12), upForTrade: false, estimatedValue: 500, graded: true, grader: "BGS", gradeNum: "9.5" },
  { id: "tc-13", masterId: "ptcg-neo2-13",    name: "Umbreon (Neo Discovery)",             category: "Pokémon TCG", imageUrl: "https://images.pokemontcg.io/neo2/13.png",        upForTrade: true,  estimatedValue: 120 },
  { id: "tc-14", masterId: "ptcg-ecard3-146", name: "Charizard (Skyridge)",                category: "Pokémon TCG", imageUrl: cardImg(14), upForTrade: false, estimatedValue: 500 },
  { id: "tc-15", masterId: "ptcg-sv8-248",    name: "Pikachu ex SAR (Surging Sparks)",     category: "Pokémon TCG", imageUrl: cardImg(15), upForTrade: true,  estimatedValue: 100 },

  // ── Funko Pop ────────────────────────────────────────────────
  { id: "fp-1",  name: "Willy Wonka & Oompa Loompa (Golden Ticket 2-Pack)", category: "Funko Pop", imageUrl: funkoImg(1),  upForTrade: false, estimatedValue: 210000, condition: "Mint Box" },
  { id: "fp-2",  name: "Alex DeLarge (Glow-in-the-Dark Chase)",             category: "Funko Pop", imageUrl: funkoImg(2),  upForTrade: false, estimatedValue: 60000, condition: "Damaged Box" },
  { id: "fp-3",  name: "Freddy Funko as Iron Man (Metallic) SDCC 2012",     category: "Funko Pop", imageUrl: funkoImg(3),  upForTrade: true,  estimatedValue: 43000 },
  { id: "fp-4",  name: "Alex DeLarge (Standard)",                           category: "Funko Pop", imageUrl: funkoImg(4),  upForTrade: true,  estimatedValue: 35000 },
  { id: "fp-5",  name: "Freddy Funko as Ghost Rider (Metallic) SDCC 2013",  category: "Funko Pop", imageUrl: funkoImg(5),  upForTrade: true,  estimatedValue: 33500 },

  // ── Sneakers ──────────────────────────────────────────────────
  { id: "s1", masterId: "snkr-aj1-chicago-2015",   name: "Jordan 1 Retro High OG Chicago",  category: "Sneakers", imageUrl: shoeImg(1), upForTrade: true,  estimatedValue: 2200, condition: "Deadstock", year: "2015" },
  { id: "s2", masterId: "snkr-yeezy350-zebra",     name: "Yeezy Boost 350 V2 Zebra",        category: "Sneakers", imageUrl: shoeImg(2), upForTrade: true,  estimatedValue: 280, condition: "Used" },
  { id: "s3", masterId: "snkr-dunk-panda",         name: "Nike Dunk Low Panda",             category: "Sneakers", imageUrl: shoeImg(3), upForTrade: false, estimatedValue: 120 },
  { id: "s4", masterId: "snkr-am90-infrared",      name: "Air Max 90 Infrared",             category: "Sneakers", imageUrl: shoeImg(4), upForTrade: true,  estimatedValue: 200, year: "2020" },

  // ── Coins ─────────────────────────────────────────────────────
  { id: "co1", masterId: "coin-1909svdb-penny",    name: "1909-S VDB Lincoln Penny",    category: "Coins", imageUrl: coinImg(1), upForTrade: true,  estimatedValue: 1200, graded: true, grader: "PCGS", gradeNum: "MS64" },
  { id: "co2", masterId: "coin-1881s-morgan",      name: "1881-S Morgan Silver Dollar", category: "Coins", imageUrl: coinImg(2), upForTrade: true,  estimatedValue: 400 },
  { id: "co3", masterId: "coin-gold-eagle-1oz",    name: "American Gold Eagle 1oz",     category: "Coins", imageUrl: coinImg(3), upForTrade: false, estimatedValue: 2100, condition: "Bullion" },

  // ── Comics ───────────────────────────────────────────────────
  { id: "c1", name: "Spider-Man #1 (1990, McFarlane)",  category: "Comics", imageUrl: comicImg(1), upForTrade: true,  estimatedValue: 250, condition: "Near Mint" },
  { id: "c2", name: "Batman #404 (Year One)",           category: "Comics", imageUrl: comicImg(2), upForTrade: true,  estimatedValue: 180 },
  { id: "c3", name: "X-Men #141 (Days of Future Past)", category: "Comics", imageUrl: comicImg(3), upForTrade: false, estimatedValue: 320 },

  // ── Other ───────────────────────────────────────────────────
  { id: "fi1", name: "Monkey D. Luffy (Gear 5) S.H.Figuarts", category: "Other", imageUrl: figureImg(1), upForTrade: true,  estimatedValue: 120 },
  { id: "fi2", name: "Optimus Prime (MPX-1 Masterpiece)",     category: "Other", imageUrl: figureImg(2), upForTrade: true,  estimatedValue: 200 },

  // ── Lego (Added for testing new fields!) ──────────────────────
  { 
    id: "lg-1", 
    masterId: "lego-75192",
    name: "LEGO Star Wars Millennium Falcon", 
    category: "Lego", 
    imageUrl: "https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=800&q=80",
    estimatedValue: 850,
    condition: "Sealed",
    status: "Showcase",
    upForTrade: false,
    year: "2017",
    pieces: "7541"
  }
];

function inv(id: string) {
  return inventoryItems.find((i) => i.id === id)!;
}

export const tradeOffers: TradeOffer[] = [
  {
    id: "trade-1",
    from: otherUsers[0], to: currentUser,
    fromItems: [{ id: "ext-1", name: "Espeon ex SIR (Prismatic Evolutions)", category: "Pokémon TCG", imageUrl: cardImg(21), upForTrade: true, estimatedValue: 250 }],
    toItems: [inv("tc-10")],
    fromCash: 50, toCash: 0, status: "pending", createdAt: "2026-02-12T10:30:00Z",
  },
  {
    id: "trade-2",
    from: otherUsers[1], to: currentUser,
    fromItems: [{ id: "ext-2", name: "Monkey D. Luffy (Glossy Black Hair)", category: "Funko Pop", imageUrl: funkoImg(21), upForTrade: true, estimatedValue: 810 }],
    toItems: [inv("fp-5")],
    fromCash: 0, toCash: 5800, status: "pending", createdAt: "2026-02-11T14:15:00Z",
  },
  {
    id: "trade-3",
    from: otherUsers[2], to: currentUser,
    fromItems: [{ id: "ext-3", masterId: "ptcg-swsh7-203", name: "Espeon VMAX Alt Art", category: "Pokémon TCG", imageUrl: "https://images.pokemontcg.io/swsh7/203.png", upForTrade: true, estimatedValue: 80 }],
    toItems: [inv("tc-8")],
    fromCash: 10, toCash: 0, status: "pending", createdAt: "2026-02-10T09:45:00Z",
  },
  {
    id: "trade-4",
    from: otherUsers[3], to: currentUser,
    fromItems: [{ id: "ext-4", name: "Metallic Loki (Exclusive)", category: "Funko Pop", imageUrl: funkoImg(22), upForTrade: true, estimatedValue: 800 }],
    toItems: [inv("s1")],
    fromCash: 0, toCash: 1400, status: "pending", createdAt: "2026-02-09T16:20:00Z",
  },
];

export const tradeHistory: (TradeOffer & { completedAt: string })[] = [
  {
    id: "hist-1", from: otherUsers[0], to: currentUser,
    fromItems: [{ id: "hist-ext-1", masterId: "ptcg-base3-5", name: "Gengar (Fossil)", category: "Pokémon TCG", imageUrl: "https://images.pokemontcg.io/base3/5.png", upForTrade: false, estimatedValue: 50 }],
    toItems: [{ id: "hist-my-1", name: "Reshiram ex SIR (White Flare)", category: "Pokémon TCG", imageUrl: cardImg(24), upForTrade: false, estimatedValue: 195 }],
    fromCash: 0, toCash: 145, status: "accepted", createdAt: "2026-01-15T10:30:00Z", completedAt: "2026-01-16T08:00:00Z",
  },
  {
    id: "hist-2", from: currentUser, to: otherUsers[1],
    fromItems: [{ id: "hist-my-2", name: "Eustass Kid Funko Pop", category: "Funko Pop", imageUrl: funkoImg(23), upForTrade: false, estimatedValue: 595 }],
    toItems: [{ id: "hist-ext-2", name: "Nico Robin Funko Pop (Misprint)", category: "Funko Pop", imageUrl: funkoImg(24), upForTrade: false, estimatedValue: 800 }],
    fromCash: 200, toCash: 0, status: "accepted", createdAt: "2026-01-10T14:00:00Z", completedAt: "2026-01-11T12:00:00Z",
  },
  {
    id: "hist-3", from: otherUsers[2], to: currentUser,
    fromItems: [{ id: "hist-ext-3", name: "Pikachu with Grey Felt Hat (Van Gogh)", category: "Pokémon TCG", imageUrl: cardImg(25), upForTrade: false, estimatedValue: 400 }],
    toItems: [{ id: "hist-my-3", name: "Jolteon ex SIR (Prismatic Evolutions)", category: "Pokémon TCG", imageUrl: cardImg(26), upForTrade: false, estimatedValue: 210 }],
    fromCash: 0, toCash: 190, status: "declined", createdAt: "2026-01-05T09:00:00Z", completedAt: "2026-01-05T15:00:00Z",
  },
];