/**
 * Dynamic mock feed generator.
 * Produces realistic NetworkEvent-compatible objects per category without
 * bloating the codebase with hundreds of hardcoded items.
 */

export type FeedEventType = "added_grail" | "completed_trade" | "updated_radar" | "new_listing" | "milestone";

export interface GeneratedFeedEvent {
  id:         string;
  user:       { name: string; handle: string; avatar: string };
  type:       FeedEventType;
  action:     string;
  item:       { name: string; imageUrl: string; estimatedValue?: number } | null;
  timestamp:  string;
  suggested:  true;
  categories: string[];
}

// ── Per-category item templates ────────────────────────────────────────────────

const POKEMON_ITEMS = [
  { name: "Charizard VMAX Rainbow Rare",         img: "https://images.pokemontcg.io/swsh3/74.png",    value: 280  },
  { name: "Umbreon VMAX Alt Art",                img: "https://images.pokemontcg.io/swsh7/215.png",   value: 310  },
  { name: "Rayquaza VMAX Alt Art",               img: "https://images.pokemontcg.io/swsh7/218.png",   value: 195  },
  { name: "Lugia V Alt Art",                     img: "https://images.pokemontcg.io/swsh12pt5/186.png", value: 160 },
  { name: "Mew ex SAR 151",                      img: "https://images.pokemontcg.io/sv3pt5/205.png",  value: 420  },
  { name: "Charizard ex SAR 151",                img: "https://images.pokemontcg.io/sv3pt5/183.png",  value: 380  },
  { name: "Eevee VMAX SAR",                      img: "https://images.pokemontcg.io/swsh12pt5/203.png", value: 340 },
  { name: "Pikachu VMAX Rainbow",                img: "https://images.pokemontcg.io/swsh4/188.png",   value: 210  },
  { name: "Gengar VMAX Alt Art",                 img: "https://images.pokemontcg.io/swsh6/271.png",   value: 185  },
  { name: "Mewtwo VSTAR SAR",                    img: "https://images.pokemontcg.io/swsh12pt5/202.png", value: 260 },
  { name: "Charizard (Base Set) BGS 9.5",        img: "https://images.pokemontcg.io/base1/4.png",     value: 6800 },
  { name: "Blastoise (1st Ed) PSA 8",            img: "https://images.pokemontcg.io/base1/2.png",     value: 1800 },
  { name: "Pikachu Illustrator PSA 7",           img: "https://images.pokemontcg.io/swsh12pt5/67.png", value: 120000 },
  { name: "Shiny Charizard V Alt Art",           img: "https://images.pokemontcg.io/swsh45sv/79.png", value: 480  },
  { name: "Kyogre ex SAR",                       img: "https://images.pokemontcg.io/sv3pt5/234.png",  value: 95   },
];

const SPORTS_ITEMS = [
  { name: "LeBron James 2003 Topps Chrome RC PSA 10",      img: "https://images.unsplash.com/photo-1546519638405-a4de03a3504d?w=400&h=400&fit=crop", value: 8500  },
  { name: "Michael Jordan 1986 Fleer #57 BGS 9",           img: "https://images.unsplash.com/photo-1546519638405-a4de03a3504d?w=400&h=400&fit=crop&seed=mj", value: 14000 },
  { name: "Patrick Mahomes 2017 Panini Prizm RC PSA 10",   img: "https://images.unsplash.com/photo-1612404819070-1b5e6791e6ad?w=400&h=400&fit=crop", value: 3200  },
  { name: "Shohei Ohtani 2018 Topps Update RC PSA 10",     img: "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=400&h=400&fit=crop", value: 1400  },
  { name: "Tom Brady 2000 Playoff Contenders RC Auto PSA 9", img: "https://images.unsplash.com/photo-1612404819070-1b5e6791e6ad?w=400&h=400&fit=crop&seed=tb", value: 22000 },
  { name: "Kobe Bryant 1996 Topps Chrome RC PSA 10",       img: "https://images.unsplash.com/photo-1546519638405-a4de03a3504d?w=400&h=400&fit=crop&seed=kb", value: 5800  },
  { name: "Luka Doncic 2018 Select Tri-Color Prizm",       img: "https://images.unsplash.com/photo-1546519638405-a4de03a3504d?w=400&h=400&fit=crop&seed=ld", value: 2100  },
  { name: "Fernando Tatis Jr. 2019 Topps Chrome Auto PSA 10", img: "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=400&h=400&fit=crop&seed=ft", value: 950 },
  { name: "Wembanyama 2023 Prizm Silver RC BGS 10",        img: "https://images.unsplash.com/photo-1546519638405-a4de03a3504d?w=400&h=400&fit=crop&seed=wem", value: 4400 },
  { name: "Honus Wagner T206 GD Condition",                img: "https://images.unsplash.com/photo-1612404819070-1b5e6791e6ad?w=400&h=400&fit=crop&seed=hw", value: 12000 },
];

const WATCHES_ITEMS = [
  { name: "Rolex Submariner Date Ref. 126610LN",     img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop", value: 14800 },
  { name: "Patek Philippe Nautilus Ref. 5711/1A",    img: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=400&h=400&fit=crop", value: 140000 },
  { name: "Audemars Piguet Royal Oak 15500ST",       img: "https://images.unsplash.com/photo-1548171916-c8fd8b6b8670?w=400&h=400&fit=crop", value: 48000 },
  { name: "Rolex GMT-Master II Pepsi 126710BLRO",    img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&seed=gmt", value: 19500 },
  { name: "Omega Speedmaster Professional Moonwatch", img: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=400&h=400&fit=crop&seed=om", value: 5800 },
  { name: "IWC Schaffhausen Big Pilot Ref. 5002",    img: "https://images.unsplash.com/photo-1548171916-c8fd8b6b8670?w=400&h=400&fit=crop&seed=iwc", value: 9200 },
  { name: "Rolex Daytona 116500LN Panda",            img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&seed=day", value: 34000 },
  { name: "Vacheron Constantin Overseas Perpetual",  img: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=400&h=400&fit=crop&seed=vc", value: 62000 },
];

const SNEAKERS_ITEMS = [
  { name: "Nike Air Jordan 1 Retro High OG 'Chicago' (2015)", img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop", value: 2800  },
  { name: "Nike Dunk Low 'Panda' DS Size 10",                 img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop&seed=pd", value: 240   },
  { name: "Adidas Yeezy Boost 350 V2 'Zebra'",               img: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=400&h=400&fit=crop", value: 320    },
  { name: "Nike Air Max 1 'Anniversary' OG",                  img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop&seed=am1", value: 480 },
  { name: "New Balance 550 'White Green'",                    img: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=400&h=400&fit=crop&seed=nb", value: 190 },
  { name: "Nike SB Dunk Low 'Tiffany & Co' Size 9",          img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop&seed=tc", value: 2100 },
  { name: "Jordan 4 Retro 'Military Blue' 2024",             img: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=400&h=400&fit=crop&seed=mb", value: 560  },
  { name: "Nike Air Force 1 Low Off-White 'Volt'",           img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop&seed=ow", value: 1400 },
];

const LEGO_ITEMS = [
  { name: "LEGO Star Wars Millennium Falcon #75192",    img: "https://cdn.rebrickable.com/media/sets/75192-1.jpg",  value: 890  },
  { name: "LEGO Art World Map #31203",                  img: "https://cdn.rebrickable.com/media/sets/31203-1.jpg",  value: 280  },
  { name: "LEGO Icons Eiffel Tower #10307",             img: "https://cdn.rebrickable.com/media/sets/10307-1.jpg",  value: 630  },
  { name: "LEGO Technic Bugatti Chiron #42083",         img: "https://cdn.rebrickable.com/media/sets/42083-1.jpg",  value: 480  },
  { name: "LEGO Star Wars AT-AT #75313",                img: "https://cdn.rebrickable.com/media/sets/75313-1.jpg",  value: 850  },
  { name: "LEGO Creator Colosseum #10276",              img: "https://cdn.rebrickable.com/media/sets/10276-1.jpg",  value: 560  },
  { name: "LEGO Harry Potter Diagon Alley #75978",      img: "https://cdn.rebrickable.com/media/sets/75978-1.jpg",  value: 420  },
  { name: "LEGO Technic Porsche 911 RSR #42096",        img: "https://cdn.rebrickable.com/media/sets/42096-1.jpg",  value: 280  },
];

const FUNKO_ITEMS = [
  { name: "Freddy Funko Ghost Rider Metallic (SDCC 2013)",  img: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&h=400&fit=crop", value: 33500 },
  { name: "Freddy Funko Space Suit (SDCC 2015)",            img: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&h=400&fit=crop&seed=fs", value: 9800 },
  { name: "Stan Lee Superhero #03 Convention Excl",         img: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&h=400&fit=crop&seed=sl", value: 1200 },
  { name: "Batman Impopster (SDCC 2019) /800",              img: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&h=400&fit=crop&seed=bm", value: 480  },
  { name: "The Mandalorian Chrome #345 1:6",                img: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&h=400&fit=crop&seed=mn", value: 320  },
];

const COMICS_ITEMS = [
  { name: "Amazing Fantasy #15 (Spider-Man 1st App) CGC 4.0", img: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&h=400&fit=crop&seed=af15", value: 28000 },
  { name: "X-Men #1 (1963) CGC 6.5",                          img: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&h=400&fit=crop&seed=xm1", value: 12500 },
  { name: "Batman #1 (1940) CGC 3.0",                         img: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&h=400&fit=crop&seed=bm1", value: 45000 },
  { name: "Incredible Hulk #181 (Wolverine) CGC 9.0",         img: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&h=400&fit=crop&seed=ih181", value: 9800 },
  { name: "Giant-Size X-Men #1 CGC 9.4",                      img: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&h=400&fit=crop&seed=gx1", value: 6200  },
];

const COINS_ITEMS = [
  { name: "1933 Saint-Gaudens Double Eagle MS64",    img: "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400&h=400&fit=crop", value: 18750000 },
  { name: "1804 Silver Dollar (Class I) PR62",       img: "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400&h=400&fit=crop&seed=1804", value: 3600000 },
  { name: "1913 Liberty Nickel (Olsen specimen) PR64", img: "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400&h=400&fit=crop&seed=1913", value: 4200000 },
  { name: "1794 Flowing Hair Silver Dollar SP66",    img: "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400&h=400&fit=crop&seed=1794", value: 10000000 },
  { name: "American Gold Eagle 1 oz MS70 (2023)",    img: "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400&h=400&fit=crop&seed=age", value: 2400 },
];

const CATEGORY_POOLS: Record<string, typeof POKEMON_ITEMS> = {
  "Pokémon TCG":   POKEMON_ITEMS,
  "Sports Cards":  SPORTS_ITEMS,
  "Watches":       WATCHES_ITEMS,
  "Sneakers":      SNEAKERS_ITEMS,
  "Lego":          LEGO_ITEMS,
  "Funko Pop":     FUNKO_ITEMS,
  "Comics":        COMICS_ITEMS,
  "Coins":         COINS_ITEMS,
};

const FEED_USERS = [
  { name: "Maya",   handle: "maya",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maya&backgroundColor=FFB7B2"   },
  { name: "Jordan", handle: "jordan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan&backgroundColor=C7CEEA" },
  { name: "Casey",  handle: "casey",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Casey&backgroundColor=BAFCA2"  },
  { name: "Riley",  handle: "riley",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Riley&backgroundColor=E2D9F3"  },
  { name: "Morgan", handle: "morgan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Morgan&backgroundColor=FFDAC1" },
  { name: "Sam",    handle: "sam",    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam&backgroundColor=C7CEEA"    },
  { name: "Blake",  handle: "blake",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Blake&backgroundColor=B5EAD7"  },
  { name: "Kai",    handle: "kai",    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kai&backgroundColor=FFB7B2"    },
  { name: "Alex",   handle: "alex",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=AA95C5"   },
];

const EVENT_TYPES: FeedEventType[] = ["added_grail", "new_listing", "completed_trade"];
const ACTIONS: Record<FeedEventType, string> = {
  added_grail:     "added a new grail to their vault",
  new_listing:     "listed a new item for trade",
  completed_trade: "just completed a trade",
  updated_radar:   "updated their want radar",
  milestone:       "hit a milestone",
};

const TIMESTAMPS = ["2m ago", "8m ago", "22m ago", "45m ago", "1h ago", "2h ago", "4h ago", "6h ago", "10h ago", "14h ago", "1d ago", "2d ago"];

/** Seeded pseudo-random number (deterministic for given seed) */
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 4294967296;
  };
}

/**
 * Generate N suggested feed events for the given categories.
 * Pass interests=[] to generate across all categories.
 * Events are deterministic for a given seed so the feed is stable across renders.
 */
export function generateFeedEvents(
  interests: string[],
  count: number = 20,
  seed: number = 42,
): GeneratedFeedEvent[] {
  const rand = seededRand(seed);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

  // Pick categories to draw from
  const cats = interests.length > 0
    ? interests.filter((c) => CATEGORY_POOLS[c])
    : Object.keys(CATEGORY_POOLS);

  if (cats.length === 0) return [];

  const events: GeneratedFeedEvent[] = [];
  for (let i = 0; i < count; i++) {
    const category = pick(cats);
    const pool     = CATEGORY_POOLS[category];
    const template = pick(pool);
    const user     = pick(FEED_USERS);
    const type     = pick(EVENT_TYPES);

    events.push({
      id:         `gen-${seed}-${i}`,
      user,
      type,
      action:     ACTIONS[type],
      item:       { name: template.name, imageUrl: template.img, estimatedValue: template.value },
      timestamp:  TIMESTAMPS[i % TIMESTAMPS.length],
      suggested:  true,
      categories: [category],
    });
  }

  return events;
}

/** Map of category name → canonical display name (for filtering) */
export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  Object.keys(CATEGORY_POOLS).map((k) => [k, k])
);
