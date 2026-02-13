import { Category, CollectibleItem, TradeOffer, User } from "./types";

export const currentUser: User = {
  id: "user-1",
  name: "You",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=CAE6CE",
};

export const otherUsers: User[] = [
  { id: "user-2", name: "Alex", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=AA95C5" },
  { id: "user-3", name: "Sam", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam&backgroundColor=FCF9D5" },
  { id: "user-4", name: "Jordan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan&backgroundColor=CAE6CE" },
  { id: "user-5", name: "Riley", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Riley&backgroundColor=AA95C5" },
];

export const categories: Category[] = [
  "Comics",
  "Funko Pop",
  "Trading Cards",
  "Shoes",
  "Coins",
  "Figures",
];

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
  // ── Trading Cards — Top 20 Pokémon Cards ──────────────────
  { id: "tc-1",  name: "Pikachu Illustrator (PSA 10)",           category: "Trading Cards", imageUrl: cardImg(1),  upForTrade: false, estimatedValue: 5275000 },
  { id: "tc-2",  name: "Pikachu Illustrator (PSA 9)",            category: "Trading Cards", imageUrl: cardImg(2),  upForTrade: false, estimatedValue: 1275000 },
  { id: "tc-3",  name: "1st Ed. Shadowless Charizard (PSA 10)",  category: "Trading Cards", imageUrl: cardImg(3),  upForTrade: true,  estimatedValue: 550000 },
  { id: "tc-4",  name: "Trophy Pikachu No. 1 Trainer (PSA 10)",  category: "Trading Cards", imageUrl: cardImg(4),  upForTrade: false, estimatedValue: 900000 },
  { id: "tc-5",  name: "1st Ed. Base Set Blastoise (PSA 10)",    category: "Trading Cards", imageUrl: cardImg(5),  upForTrade: true,  estimatedValue: 88000 },
  { id: "tc-6",  name: "Gold Star Charizard (PSA 10)",           category: "Trading Cards", imageUrl: cardImg(6),  upForTrade: true,  estimatedValue: 60000 },
  { id: "tc-7",  name: "Umbreon Gold Star (PSA 10)",             category: "Trading Cards", imageUrl: cardImg(7),  upForTrade: false, estimatedValue: 48500 },
  { id: "tc-8",  name: "Shining Mew (CoroCoro Promo)",           category: "Trading Cards", imageUrl: cardImg(8),  upForTrade: true,  estimatedValue: 33000 },
  { id: "tc-9",  name: "Neo Genesis 1st Ed. Lugia (PSA 10)",     category: "Trading Cards", imageUrl: cardImg(9),  upForTrade: true,  estimatedValue: 45000 },
  { id: "tc-10", name: "1st Ed. Shining Charizard (PSA 10)",     category: "Trading Cards", imageUrl: cardImg(10), upForTrade: false, estimatedValue: 15000 },
  { id: "tc-11", name: "Umbreon VMAX Alt Art (Moonbreon)",       category: "Trading Cards", imageUrl: cardImg(11), upForTrade: true,  estimatedValue: 2000 },
  { id: "tc-12", name: "Latias & Latios GX Alt Art",             category: "Trading Cards", imageUrl: cardImg(12), upForTrade: true,  estimatedValue: 1500 },
  { id: "tc-13", name: "Umbreon ex SIR (Prismatic Evolutions)",  category: "Trading Cards", imageUrl: cardImg(13), upForTrade: true,  estimatedValue: 950 },
  { id: "tc-14", name: "Mega Lucario ex SIR",                    category: "Trading Cards", imageUrl: cardImg(14), upForTrade: false, estimatedValue: 600 },
  { id: "tc-15", name: "Mega Charizard X ex SIR",                category: "Trading Cards", imageUrl: cardImg(15), upForTrade: true,  estimatedValue: 450 },
  { id: "tc-16", name: "Team Rocket's Mewtwo ex SIR",            category: "Trading Cards", imageUrl: cardImg(16), upForTrade: true,  estimatedValue: 350 },
  { id: "tc-17", name: "Sylveon ex SIR (Prismatic Evolutions)",  category: "Trading Cards", imageUrl: cardImg(17), upForTrade: true,  estimatedValue: 320 },
  { id: "tc-18", name: "Mega Gardevoir ex Hyper Rare",           category: "Trading Cards", imageUrl: cardImg(18), upForTrade: false, estimatedValue: 300 },
  { id: "tc-19", name: "Jolteon ex SIR (Prismatic Evolutions)",  category: "Trading Cards", imageUrl: cardImg(19), upForTrade: true,  estimatedValue: 210 },
  { id: "tc-20", name: "Reshiram ex SIR (White Flare)",          category: "Trading Cards", imageUrl: cardImg(20), upForTrade: true,  estimatedValue: 195 },

  // ── Funko Pop — Top 20 ────────────────────────────────────
  { id: "fp-1",  name: "Willy Wonka & Oompa Loompa (Golden Ticket 2-Pack)", category: "Funko Pop", imageUrl: funkoImg(1),  upForTrade: false, estimatedValue: 210000 },
  { id: "fp-2",  name: "Alex DeLarge (Glow-in-the-Dark Chase)",              category: "Funko Pop", imageUrl: funkoImg(2),  upForTrade: false, estimatedValue: 60000 },
  { id: "fp-3",  name: "Freddy Funko as Iron Man (Metallic) SDCC 2012",      category: "Funko Pop", imageUrl: funkoImg(3),  upForTrade: true,  estimatedValue: 43000 },
  { id: "fp-4",  name: "Alex DeLarge (Standard)",                             category: "Funko Pop", imageUrl: funkoImg(4),  upForTrade: true,  estimatedValue: 35000 },
  { id: "fp-5",  name: "Freddy Funko as Buzz Lightyear (GITD) SDCC 2011",    category: "Funko Pop", imageUrl: funkoImg(5),  upForTrade: false, estimatedValue: 35000 },
  { id: "fp-6",  name: "Freddy Funko as Ghost Rider (Metallic) SDCC 2013",   category: "Funko Pop", imageUrl: funkoImg(6),  upForTrade: true,  estimatedValue: 33500 },
  { id: "fp-7",  name: "Boo Berry (Glow-in-the-Dark) SDCC 2011",             category: "Funko Pop", imageUrl: funkoImg(7),  upForTrade: true,  estimatedValue: 32000 },
  { id: "fp-8",  name: "Freddy Funko as Venom SE (SDCC Fundays 2019)",       category: "Funko Pop", imageUrl: funkoImg(8),  upForTrade: false, estimatedValue: 30800 },
  { id: "fp-9",  name: "Stan Lee (Platinum Metallic Superhero)",              category: "Funko Pop", imageUrl: funkoImg(9),  upForTrade: true,  estimatedValue: 30800 },
  { id: "fp-10", name: "Freddy Funko as V (Metallic) SDCC 2012",             category: "Funko Pop", imageUrl: funkoImg(10), upForTrade: true,  estimatedValue: 24000 },
  { id: "fp-11", name: "Freddy Funko as Jaime Lannister (Bloody) SDCC 2013", category: "Funko Pop", imageUrl: funkoImg(11), upForTrade: false, estimatedValue: 24000 },
  { id: "fp-12", name: "Freddy Funko as Beetlejuice (GITD) SDCC 2012",       category: "Funko Pop", imageUrl: funkoImg(12), upForTrade: true,  estimatedValue: 20000 },
  { id: "fp-13", name: "Buzz & Woody 2-Pack (Vaulted)",                       category: "Funko Pop", imageUrl: funkoImg(13), upForTrade: true,  estimatedValue: 14600 },
  { id: "fp-14", name: "Freddy Funko as Boba Fett (Red Hair)",                category: "Funko Pop", imageUrl: funkoImg(14), upForTrade: true,  estimatedValue: 13320 },
  { id: "fp-15", name: "Freddy Funko (Black Suit) SDCC 2013",                 category: "Funko Pop", imageUrl: funkoImg(15), upForTrade: false, estimatedValue: 12390 },
  { id: "fp-16", name: "Freddy Funko / Count Chocula (GITD) SDCC 2011",      category: "Funko Pop", imageUrl: funkoImg(16), upForTrade: true,  estimatedValue: 10000 },
  { id: "fp-17", name: "Freddy Funko as Joker (Dark Knight) SDCC 2014",      category: "Funko Pop", imageUrl: funkoImg(17), upForTrade: true,  estimatedValue: 10000 },
  { id: "fp-18", name: "The Thing (Metallic, Black Eyes) SDCC",               category: "Funko Pop", imageUrl: funkoImg(18), upForTrade: false, estimatedValue: 11500 },
  { id: "fp-19", name: "Planet Arlia Vegeta (NYCC Exclusive)",                category: "Funko Pop", imageUrl: funkoImg(19), upForTrade: true,  estimatedValue: 9000 },
  { id: "fp-20", name: "Dumbo (Clown) SDCC 2013",                             category: "Funko Pop", imageUrl: funkoImg(20), upForTrade: true,  estimatedValue: 6640 },

  // ── Comics ────────────────────────────────────────────────
  { id: "c1", name: "Spider-Man #1 (1990, McFarlane)",  category: "Comics", imageUrl: comicImg(1), upForTrade: true,  estimatedValue: 250 },
  { id: "c2", name: "Batman #404 (Year One)",           category: "Comics", imageUrl: comicImg(2), upForTrade: true,  estimatedValue: 180 },
  { id: "c3", name: "X-Men #141 (Days of Future Past)", category: "Comics", imageUrl: comicImg(3), upForTrade: false, estimatedValue: 320 },
  { id: "c4", name: "Wolverine #1 (1988, 1st Patch)",   category: "Comics", imageUrl: comicImg(4), upForTrade: true,  estimatedValue: 150 },

  // ── Shoes ─────────────────────────────────────────────────
  { id: "s1", name: "Jordan 1 Retro High OG Chicago", category: "Shoes", imageUrl: shoeImg(1), upForTrade: true,  estimatedValue: 350 },
  { id: "s2", name: "Yeezy Boost 350 V2 Zebra",       category: "Shoes", imageUrl: shoeImg(2), upForTrade: true,  estimatedValue: 280 },
  { id: "s3", name: "Nike Dunk Low Panda",             category: "Shoes", imageUrl: shoeImg(3), upForTrade: false, estimatedValue: 160 },
  { id: "s4", name: "Air Max 90 Infrared",             category: "Shoes", imageUrl: shoeImg(4), upForTrade: true,  estimatedValue: 200 },

  // ── Coins ─────────────────────────────────────────────────
  { id: "co1", name: "1909-S VDB Lincoln Penny",    category: "Coins", imageUrl: coinImg(1), upForTrade: true,  estimatedValue: 1200 },
  { id: "co2", name: "1881-S Morgan Silver Dollar", category: "Coins", imageUrl: coinImg(2), upForTrade: true,  estimatedValue: 400 },
  { id: "co3", name: "American Gold Eagle 1oz",     category: "Coins", imageUrl: coinImg(3), upForTrade: false, estimatedValue: 1800 },
  { id: "co4", name: "1932-D Washington Quarter",   category: "Coins", imageUrl: coinImg(4), upForTrade: true,  estimatedValue: 85 },

  // ── Figures ───────────────────────────────────────────────
  { id: "fi1", name: "Monkey D. Luffy (Gear 5) S.H.Figuarts", category: "Figures", imageUrl: figureImg(1), upForTrade: true,  estimatedValue: 120 },
  { id: "fi2", name: "Master Chief (Halo Infinite) Jazwares",  category: "Figures", imageUrl: figureImg(2), upForTrade: true,  estimatedValue: 95 },
  { id: "fi3", name: "Link (Tears of the Kingdom) Amiibo",     category: "Figures", imageUrl: figureImg(3), upForTrade: false, estimatedValue: 60 },
  { id: "fi4", name: "Optimus Prime (MPX-1 Masterpiece)",      category: "Figures", imageUrl: figureImg(4), upForTrade: true,  estimatedValue: 200 },
];

function inv(id: string) {
  return inventoryItems.find((i) => i.id === id)!;
}

export const tradeOffers: TradeOffer[] = [
  {
    id: "trade-1",
    from: otherUsers[0], to: currentUser,
    fromItems: [{ id: "ext-1", name: "Espeon ex SIR (Prismatic Evolutions)", category: "Trading Cards", imageUrl: cardImg(21), upForTrade: true, estimatedValue: 250 }],
    toItems: [inv("tc-19")],
    fromCash: 50, toCash: 0, status: "pending", createdAt: "2026-02-12T10:30:00Z",
  },
  {
    id: "trade-2",
    from: otherUsers[1], to: currentUser,
    fromItems: [{ id: "ext-2", name: "Monkey D. Luffy (Glossy Black Hair)", category: "Funko Pop", imageUrl: funkoImg(21), upForTrade: true, estimatedValue: 810 }],
    toItems: [inv("fp-20")],
    fromCash: 0, toCash: 5800, status: "pending", createdAt: "2026-02-11T14:15:00Z",
  },
  {
    id: "trade-3",
    from: otherUsers[2], to: currentUser,
    fromItems: [{ id: "ext-3", name: "Cynthia & Garchomp ex SIR", category: "Trading Cards", imageUrl: cardImg(22), upForTrade: true, estimatedValue: 200 }],
    toItems: [inv("tc-17")],
    fromCash: 120, toCash: 0, status: "pending", createdAt: "2026-02-10T09:45:00Z",
  },
  {
    id: "trade-4",
    from: otherUsers[3], to: currentUser,
    fromItems: [{ id: "ext-4", name: "Metallic Loki (Exclusive)", category: "Funko Pop", imageUrl: funkoImg(22), upForTrade: true, estimatedValue: 800 }],
    toItems: [inv("fp-19")],
    fromCash: 0, toCash: 8200, status: "pending", createdAt: "2026-02-09T16:20:00Z",
  },
];

export const tradeHistory: (TradeOffer & { completedAt: string })[] = [
  {
    id: "hist-1", from: otherUsers[0], to: currentUser,
    fromItems: [{ id: "hist-ext-1", name: "Alt Art Gengar & Mimikyu GX", category: "Trading Cards", imageUrl: cardImg(23), upForTrade: false, estimatedValue: 500 }],
    toItems: [{ id: "hist-my-1", name: "Reshiram ex SIR (White Flare)", category: "Trading Cards", imageUrl: cardImg(24), upForTrade: false, estimatedValue: 195 }],
    fromCash: 0, toCash: 305, status: "accepted", createdAt: "2026-01-15T10:30:00Z", completedAt: "2026-01-16T08:00:00Z",
  },
  {
    id: "hist-2", from: currentUser, to: otherUsers[1],
    fromItems: [{ id: "hist-my-2", name: "Eustass Kid Funko Pop", category: "Funko Pop", imageUrl: funkoImg(23), upForTrade: false, estimatedValue: 595 }],
    toItems: [{ id: "hist-ext-2", name: "Nico Robin Funko Pop (Misprint)", category: "Funko Pop", imageUrl: funkoImg(24), upForTrade: false, estimatedValue: 800 }],
    fromCash: 200, toCash: 0, status: "accepted", createdAt: "2026-01-10T14:00:00Z", completedAt: "2026-01-11T12:00:00Z",
  },
  {
    id: "hist-3", from: otherUsers[2], to: currentUser,
    fromItems: [{ id: "hist-ext-3", name: "Pikachu with Grey Felt Hat (Van Gogh)", category: "Trading Cards", imageUrl: cardImg(25), upForTrade: false, estimatedValue: 400 }],
    toItems: [{ id: "hist-my-3", name: "Jolteon ex SIR (Prismatic Evolutions)", category: "Trading Cards", imageUrl: cardImg(26), upForTrade: false, estimatedValue: 210 }],
    fromCash: 0, toCash: 190, status: "declined", createdAt: "2026-01-05T09:00:00Z", completedAt: "2026-01-05T15:00:00Z",
  },
];
