import { Category, CollectibleItem, TradeOffer, User } from "./types";

export const currentUser: User = {
  id: "user-1",
  name: "You",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=CAE6CE",
};

export const otherUsers: User[] = [
  {
    id: "user-2",
    name: "Alex",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=AA95C5",
  },
  {
    id: "user-3",
    name: "Sam",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam&backgroundColor=FCF9D5",
  },
  {
    id: "user-4",
    name: "Jordan",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan&backgroundColor=CAE6CE",
  },
  {
    id: "user-5",
    name: "Riley",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Riley&backgroundColor=AA95C5",
  },
];

export const categories: Category[] = [
  "Comics",
  "Funko Pop",
  "Trading Cards",
  "Shoes",
  "Coins",
  "Figures",
];

// Placeholder images using colored SVG placeholders
function itemImg(seed: string, bg: string = "4A3535") {
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&backgroundColor=${bg}&shape1Color=CAE6CE&shape2Color=AA95C5&shape3Color=FCF9D5`;
}

export const inventoryItems: CollectibleItem[] = [
  // Comics
  { id: "c1", name: "Spider-Man #1", category: "Comics", imageUrl: itemImg("spiderman1", "2d1a1a"), upForTrade: true, estimatedValue: 250 },
  { id: "c2", name: "Batman #404", category: "Comics", imageUrl: itemImg("batman404", "1a2d1a"), upForTrade: true, estimatedValue: 180 },
  { id: "c3", name: "X-Men #141", category: "Comics", imageUrl: itemImg("xmen141", "1a1a2d"), upForTrade: false, estimatedValue: 320 },
  { id: "c4", name: "Wolverine #1", category: "Comics", imageUrl: itemImg("wolverine1", "2d2d1a"), upForTrade: true, estimatedValue: 150 },
  // Funko Pop
  { id: "f1", name: "Darth Vader", category: "Funko Pop", imageUrl: itemImg("darthvader", "1a1a1a"), upForTrade: true, estimatedValue: 45 },
  { id: "f2", name: "Iron Man", category: "Funko Pop", imageUrl: itemImg("ironman", "2d1a1a"), upForTrade: false, estimatedValue: 35 },
  { id: "f3", name: "Pikachu", category: "Funko Pop", imageUrl: itemImg("pikachu", "2d2d1a"), upForTrade: true, estimatedValue: 55 },
  { id: "f4", name: "Naruto", category: "Funko Pop", imageUrl: itemImg("naruto", "2d1a2d"), upForTrade: true, estimatedValue: 40 },
  // Trading Cards
  { id: "t1", name: "Charizard Holo", category: "Trading Cards", imageUrl: itemImg("charizard", "2d1a1a"), upForTrade: true, estimatedValue: 500 },
  { id: "t2", name: "Black Lotus", category: "Trading Cards", imageUrl: itemImg("blacklotus", "1a2d1a"), upForTrade: false, estimatedValue: 2500 },
  { id: "t3", name: "Rookie Card", category: "Trading Cards", imageUrl: itemImg("rookiecard", "1a1a2d"), upForTrade: true, estimatedValue: 175 },
  { id: "t4", name: "Holographic Rare", category: "Trading Cards", imageUrl: itemImg("holorare", "2d2d2d"), upForTrade: true, estimatedValue: 90 },
  // Shoes
  { id: "s1", name: "Jordan 1 Retro", category: "Shoes", imageUrl: itemImg("jordan1", "2d1a1a"), upForTrade: true, estimatedValue: 350 },
  { id: "s2", name: "Yeezy 350", category: "Shoes", imageUrl: itemImg("yeezy350", "1a2d1a"), upForTrade: true, estimatedValue: 280 },
  { id: "s3", name: "Dunk Low", category: "Shoes", imageUrl: itemImg("dunklow", "1a1a2d"), upForTrade: false, estimatedValue: 160 },
  { id: "s4", name: "Air Max 90", category: "Shoes", imageUrl: itemImg("airmax90", "2d2d1a"), upForTrade: true, estimatedValue: 200 },
  // Coins
  { id: "co1", name: "1909 VDB Penny", category: "Coins", imageUrl: itemImg("1909penny", "2d2d1a"), upForTrade: true, estimatedValue: 1200 },
  { id: "co2", name: "Morgan Dollar", category: "Coins", imageUrl: itemImg("morgan", "1a1a2d"), upForTrade: true, estimatedValue: 400 },
  { id: "co3", name: "Gold Eagle", category: "Coins", imageUrl: itemImg("goldeagle", "2d2d1a"), upForTrade: false, estimatedValue: 1800 },
  { id: "co4", name: "Silver Quarter", category: "Coins", imageUrl: itemImg("silverquarter", "1a2d2d"), upForTrade: true, estimatedValue: 85 },
  // Figures
  { id: "fi1", name: "Goku SSJ", category: "Figures", imageUrl: itemImg("goku", "2d1a1a"), upForTrade: true, estimatedValue: 120 },
  { id: "fi2", name: "Master Chief", category: "Figures", imageUrl: itemImg("masterchief", "1a2d1a"), upForTrade: true, estimatedValue: 95 },
  { id: "fi3", name: "Link Amiibo", category: "Figures", imageUrl: itemImg("linkamiibo", "1a1a2d"), upForTrade: false, estimatedValue: 60 },
  { id: "fi4", name: "Optimus Prime", category: "Figures", imageUrl: itemImg("optimus", "2d1a2d"), upForTrade: true, estimatedValue: 200 },
];

export const tradeOffers: TradeOffer[] = [
  {
    id: "trade-1",
    from: otherUsers[0],
    to: currentUser,
    fromItems: [
      { id: "ext-1", name: "Hulk #181", category: "Comics", imageUrl: itemImg("hulk181", "1a2d1a"), upForTrade: true, estimatedValue: 300 },
    ],
    toItems: [inventoryItems[0]],
    fromCash: 50,
    toCash: 0,
    status: "pending",
    createdAt: "2026-02-12T10:30:00Z",
  },
  {
    id: "trade-2",
    from: otherUsers[1],
    to: currentUser,
    fromItems: [
      { id: "ext-2", name: "Mewtwo GX", category: "Trading Cards", imageUrl: itemImg("mewtwo", "1a1a2d"), upForTrade: true, estimatedValue: 220 },
    ],
    toItems: [inventoryItems[8]],
    fromCash: 0,
    toCash: 75,
    status: "pending",
    createdAt: "2026-02-11T14:15:00Z",
  },
  {
    id: "trade-3",
    from: otherUsers[2],
    to: currentUser,
    fromItems: [
      { id: "ext-3", name: "Travis Scott AJ1", category: "Shoes", imageUrl: itemImg("travisaj1", "2d1a2d"), upForTrade: true, estimatedValue: 450 },
    ],
    toItems: [inventoryItems[12]],
    fromCash: 0,
    toCash: 100,
    status: "pending",
    createdAt: "2026-02-10T09:45:00Z",
  },
  {
    id: "trade-4",
    from: otherUsers[3],
    to: currentUser,
    fromItems: [
      { id: "ext-4", name: "Vegeta Figure", category: "Figures", imageUrl: itemImg("vegeta", "1a2d2d"), upForTrade: true, estimatedValue: 110 },
    ],
    toItems: [inventoryItems[20]],
    fromCash: 25,
    toCash: 0,
    status: "pending",
    createdAt: "2026-02-09T16:20:00Z",
  },
];

export const tradeHistory: (TradeOffer & { completedAt: string })[] = [
  {
    id: "hist-1",
    from: otherUsers[0],
    to: currentUser,
    fromItems: [
      { id: "hist-ext-1", name: "Amazing Fantasy #15", category: "Comics", imageUrl: itemImg("af15", "2d1a1a"), upForTrade: false, estimatedValue: 500 },
    ],
    toItems: [
      { id: "hist-my-1", name: "Detective Comics #27", category: "Comics", imageUrl: itemImg("dc27", "1a2d1a"), upForTrade: false, estimatedValue: 450 },
    ],
    fromCash: 50,
    toCash: 0,
    status: "accepted",
    createdAt: "2026-01-15T10:30:00Z",
    completedAt: "2026-01-16T08:00:00Z",
  },
  {
    id: "hist-2",
    from: currentUser,
    to: otherUsers[1],
    fromItems: [
      { id: "hist-my-2", name: "Luffy Figure", category: "Figures", imageUrl: itemImg("luffy", "1a1a2d"), upForTrade: false, estimatedValue: 80 },
    ],
    toItems: [
      { id: "hist-ext-2", name: "Zoro Figure", category: "Figures", imageUrl: itemImg("zoro", "2d2d1a"), upForTrade: false, estimatedValue: 85 },
    ],
    fromCash: 0,
    toCash: 0,
    status: "accepted",
    createdAt: "2026-01-10T14:00:00Z",
    completedAt: "2026-01-11T12:00:00Z",
  },
  {
    id: "hist-3",
    from: otherUsers[2],
    to: currentUser,
    fromItems: [
      { id: "hist-ext-3", name: "Yeezy 700", category: "Shoes", imageUrl: itemImg("yeezy700", "1a2d1a"), upForTrade: false, estimatedValue: 320 },
    ],
    toItems: [
      { id: "hist-my-3", name: "New Balance 550", category: "Shoes", imageUrl: itemImg("nb550", "2d1a2d"), upForTrade: false, estimatedValue: 150 },
    ],
    fromCash: 0,
    toCash: 170,
    status: "declined",
    createdAt: "2026-01-05T09:00:00Z",
    completedAt: "2026-01-05T15:00:00Z",
  },
];
