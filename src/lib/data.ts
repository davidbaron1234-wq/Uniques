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
  tier: "free",
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

// Unsplash images by category for realistic look (used by socialUsers & tradeHistory)
const cardImg  = (seed: number) => `https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=400&h=400&fit=crop&auto=format&q=80&seed=${seed}`;
const funkoImg = (seed: number) => `https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&h=400&fit=crop&auto=format&q=80&seed=${seed}`;
const comicImg = (seed: number) => `https://images.unsplash.com/photo-1612036782180-f82956ef2431?w=400&h=400&fit=crop&auto=format&q=80&seed=${seed}`;

// ── QA Test Inventory: single Erika card ────────────────────────────────────
// This is the canonical starting state for trade-completion testing.
// Drew will offer "Mew ex SAR" in exchange for this card.
export const inventoryItems: CollectibleItem[] = [
  {
    id: "tc-erika",
    masterId: "ptcg-sv3pt5-160",
    name: "Erika's Invitation (Pokémon 151)",
    category: "Pokémon TCG",
    imageUrl: "https://images.pokemontcg.io/sv3pt5/160.png",
    upForTrade: true,
    estimatedValue: 85,
    condition: "Near Mint",
  },
  {
    id: "test-ghost-rider",
    name: "Freddy Funko as Ghost Rider Metallic (SDCC 2013)",
    category: "Funko Pop",
    imageUrl: funkoImg(5),
    upForTrade: true,
    estimatedValue: 33500,
  },
  {
    id: "test-keroppi",
    name: "Funko Pop Sanrio Keroppi #02",
    category: "Funko Pop",
    imageUrl: funkoImg(7),
    upForTrade: true,
    estimatedValue: 45,
  },
];

function inv(id: string) {
  return inventoryItems.find((i) => i.id === id)!;
}

// ── Social / Public Profiles ──────────────────────────────────────────────
// Each SocialUser has their own inventory and a list of their top grail IDs.
// URL routing: /u/{user.handle}

export interface SocialUser {
  user: User;
  inventory: CollectibleItem[];
  grailIds: string[];
}

export const socialUsers: SocialUser[] = [
  // ── Drew — vintage Pokémon collector ──────────────────────────────────
  {
    user: {
      id: "user-drew",
      name: "Drew",
      handle: "drew",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Drew&backgroundColor=B5EAD7",
      bio: "Vintage Pokémon hunter. Base Set is life. Always chasing alt arts & holo rares.",
      trustScore: 4.9,
      totalTrades: 63,
      memberSince: "2023-05-12",
      tier: "pro",
    },
    inventory: [
      { id: "d-1", masterId: "ptcg-sv3pt5-183", name: "Charizard ex SAR (151)", category: "Pokémon TCG", imageUrl: "https://images.pokemontcg.io/sv3pt5/183.png", upForTrade: false, estimatedValue: 380, graded: true, grader: "PSA", gradeNum: "10" },
      { id: "d-2", masterId: "ptcg-swsh7-215", name: "Umbreon VMAX Alt Art",    category: "Pokémon TCG", imageUrl: "https://images.pokemontcg.io/swsh7/215.png", upForTrade: true,  estimatedValue: 310, condition: "Mint" },
      { id: "d-3", masterId: "ptcg-swsh7-218", name: "Rayquaza VMAX Alt Art",   category: "Pokémon TCG", imageUrl: "https://images.pokemontcg.io/swsh7/218.png", upForTrade: true,  estimatedValue: 260 },
      { id: "d-4", masterId: "ptcg-swsh6-157", name: "Gengar VMAX Alt Art",     category: "Pokémon TCG", imageUrl: "https://images.pokemontcg.io/swsh6/157.png", upForTrade: false, estimatedValue: 180 },
      { id: "d-5", masterId: "ptcg-neo1-9",    name: "Lugia (Neo Genesis)",     category: "Pokémon TCG", imageUrl: "https://images.pokemontcg.io/neo1/9.png",   upForTrade: false, estimatedValue: 490, graded: true, grader: "BGS", gradeNum: "9" },
      { id: "d-6", masterId: "ptcg-base1-4",   name: "Charizard (Base Set)",   category: "Pokémon TCG", imageUrl: "https://images.pokemontcg.io/base1/4.png",  upForTrade: false, estimatedValue: 420, graded: true, grader: "PSA", gradeNum: "8" },
      { id: "d-7",                              name: "Naruto Uzumaki (Hokage)", category: "Funko Pop",   imageUrl: funkoImg(31), upForTrade: true,  estimatedValue: 85 },
      { id: "d-8",                              name: "Gengar (Team Rocket Returns) Rev Holo", category: "Pokémon TCG", imageUrl: cardImg(33), upForTrade: true, estimatedValue: 95 },
    ],
    grailIds: ["d-1", "d-5", "d-4"],
  },

  // ── Newbie — empty account for PM testing ─────────────────────────────
  {
    user: {
      id: "user-newbie",
      name: "Newbie",
      handle: "newbie",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Newbie&backgroundColor=B0E0E6",
      bio: "Just getting started!",
      trustScore: 0.0,
      totalTrades: 0,
      memberSince: "2026-03-17",
      tier: "free",
    },
    inventory: [],
    grailIds: [],
  },

  // ── Ethan — sports cards & premium Funko ──────────────────────────────
  {
    user: {
      id: "user-ethan",
      name: "Ethan",
      handle: "ethan",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan&backgroundColor=FFDAC1",
      bio: "Sports cards & high-end Funko. PSA 10 only. Open to all fair trades!",
      trustScore: 4.6,
      totalTrades: 38,
      memberSince: "2024-01-08",
    },
    inventory: [
      { id: "e-1", name: "Michael Jordan 1986 Fleer Rookie #57",      category: "Sports Cards", imageUrl: cardImg(40), upForTrade: false, estimatedValue: 3200, graded: true, grader: "PSA", gradeNum: "8" },
      { id: "e-2", name: "Shohei Ohtani 2018 Topps Update RC",         category: "Sports Cards", imageUrl: cardImg(41), upForTrade: true,  estimatedValue: 1400, graded: true, grader: "PSA", gradeNum: "10" },
      { id: "e-3", name: "LeBron James 2003 Topps Chrome Rookie",      category: "Sports Cards", imageUrl: cardImg(42), upForTrade: false, estimatedValue: 1800, condition: "Near Mint" },
      { id: "e-4", name: "Giannis 2013 Panini Prizm RC",               category: "Sports Cards", imageUrl: cardImg(43), upForTrade: true,  estimatedValue: 650 },
      { id: "e-5", name: "Freddy Funko as Batman (SDCC 2016)",         category: "Funko Pop",    imageUrl: funkoImg(41), upForTrade: false, estimatedValue: 18000 },
      { id: "e-6", name: "Superman #1 Gold Foil Reprint",              category: "Comics",       imageUrl: comicImg(10), upForTrade: true,  estimatedValue: 320 },
      { id: "e-7", name: "Batman Chrome Foil (SDCC Exclusive)",        category: "Funko Pop",    imageUrl: funkoImg(42), upForTrade: true,  estimatedValue: 4500 },
      { id: "e-8", name: "Patrick Mahomes 2017 Panini Prizm RC",       category: "Sports Cards", imageUrl: cardImg(44), upForTrade: true,  estimatedValue: 780 },
      { id: "e-9", name: "LEGO Technic Bugatti Chiron #42083",         category: "Lego",         imageUrl: "https://cdn.rebrickable.com/media/sets/42083-1.jpg", upForTrade: false, estimatedValue: 420, condition: "Sealed", year: "2018", pieces: "3599" },
      { id: "e-10", name: "LEGO Star Wars AT-AT #75313",               category: "Lego",         imageUrl: "https://cdn.rebrickable.com/media/sets/75313-1.jpg", upForTrade: true,  estimatedValue: 850, condition: "Sealed", year: "2021", pieces: "6785" },
    ],
    grailIds: ["e-1", "e-3", "e-10"],
  },
];

// ── QA Trade Offers ───────────────────────────────────────────────────────────
export const tradeOffers: TradeOffer[] = [
  {
    // Drew wants your Erika, offers Mew ex + $50 cash
    id: "offer-drew-mew",
    from: socialUsers[0].user,  // Drew
    to: currentUser,
    fromItems: [{
      id: "drew-mew-offer",
      masterId: "ptcg-sv3pt5-205",
      name: "Mew ex SAR (Pokémon 151)",
      category: "Pokémon TCG",
      imageUrl: "https://images.pokemontcg.io/sv3pt5/205.png",
      upForTrade: true,
      estimatedValue: 120,
    }],
    toItems: [inv("tc-erika")],
    fromCash: 50,
    toCash: 0,
    status: "pending",
    createdAt: "2026-02-21T10:30:00Z",
  },
  {
    // Drew wants your Keroppi Funko, offers Charizard Base Set PSA 9.
    // Lock-mechanism QA test: accepting should move test-keroppi to "In Trade".
    id: "offer-drew-keroppi",
    from: socialUsers[0].user,  // Drew
    to: currentUser,
    fromItems: [{
      id: "drew-charizard-base",
      masterId: "ptcg-base1-4",
      name: "Charizard (Base Set) PSA 9",
      category: "Pokémon TCG",
      imageUrl: "https://images.pokemontcg.io/base1/4.png",
      upForTrade: true,
      estimatedValue: 1200,
      graded: true,
      grader: "PSA",
      gradeNum: "9",
    }],
    toItems: [{
      id: "test-keroppi",
      name: "Funko Pop Sanrio Keroppi #02",
      category: "Funko Pop",
      imageUrl: funkoImg(7),
      upForTrade: true,
      estimatedValue: 45,
    }],
    fromCash: 0,
    toCash: 0,
    status: "pending",
    createdAt: "2026-02-23T11:00:00Z",
  },
  {
    // Ethan wants your Ghost Rider Funko, offers Pikachu Illustrator BGS 9.
    // Lock-mechanism QA test: accepting should move test-ghost-rider to "In Trade".
    id: "offer-ethan-pikachu",
    from: socialUsers[1].user,  // Ethan
    to: currentUser,
    fromItems: [{
      id: "ethan-pikachu-illustrator",
      name: "Pikachu Illustrator BGS 9",
      category: "Pokémon TCG",
      imageUrl: cardImg(99),
      upForTrade: true,
      estimatedValue: 35000,
      graded: true,
      grader: "BGS",
      gradeNum: "9",
    }],
    toItems: [{
      id: "test-ghost-rider",
      name: "Freddy Funko as Ghost Rider Metallic (SDCC 2013)",
      category: "Funko Pop",
      imageUrl: funkoImg(5),
      upForTrade: true,
      estimatedValue: 33500,
    }],
    fromCash: 0,
    toCash: 0,
    status: "pending",
    createdAt: "2026-02-23T09:00:00Z",
  },
  {
    // Alex wants your Mew ex SAR (you receive it after completing hist-4).
    // Guard test: itemsMissing fires until hist-4 is completed with deterministic IDs.
    id: "offer-alex-mew",
    from: otherUsers[0],  // Alex
    to: currentUser,
    fromItems: [{
      id: "alex-ghost-rider",
      name: "Freddy Funko as Ghost Rider Metallic (SDCC 2013)",
      category: "Funko Pop",
      imageUrl: funkoImg(27),
      upForTrade: true,
      estimatedValue: 33500,
    }],
    toItems: [{
      id: "drew-mew-ex",
      masterId: "ptcg-sv3pt5-205",
      name: "Mew ex SAR (Pokémon 151)",
      category: "Pokémon TCG",
      imageUrl: "https://images.pokemontcg.io/sv3pt5/205.png",
      upForTrade: false,
      estimatedValue: 120,
    }],
    fromCash: 0,
    toCash: 0,
    status: "pending",
    createdAt: "2026-02-22T08:00:00Z",
  },
];

export const tradeHistory: (TradeOffer & { completedAt?: string })[] = [
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
  {
    // ✅ QA Test case: Drew accepted your Erika for his Mew ex + $50 cash.
    // status="accepted" + no completedAt → "Mark as Done" button is visible.
    // Clicking it MUST: remove tc-erika from inventory, add Mew ex. No duplicates.
    id: "hist-4",
    from: socialUsers[0].user,  // Drew
    to: currentUser,
    fromItems: [{
      id: "drew-mew-ex",
      masterId: "ptcg-sv3pt5-205",
      name: "Mew ex SAR (Pokémon 151)",
      category: "Pokémon TCG",
      imageUrl: "https://images.pokemontcg.io/sv3pt5/205.png",
      upForTrade: true,
      estimatedValue: 120,
    }],
    toItems: [{
      id: "tc-erika",
      masterId: "ptcg-sv3pt5-160",
      name: "Erika's Invitation (Pokémon 151)",
      category: "Pokémon TCG",
      imageUrl: "https://images.pokemontcg.io/sv3pt5/160.png",
      upForTrade: true,
      estimatedValue: 85,
    }],
    fromCash: 50, toCash: 0, status: "accepted", createdAt: "2026-02-20T10:00:00Z",
    // No completedAt — awaiting user to click "Mark as Done"
  },
];