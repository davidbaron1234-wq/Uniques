import { Category } from "@/lib/types";

export interface DatabaseCollectible {
  name: string;
  category: Category;
  estimatedValue: number;
  imageUrl: string;
}

// Unsplash photo IDs for realistic images
const img = (id: string, w = 400) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${w}&fit=crop&auto=format&q=80`;

export const collectiblesDatabase: DatabaseCollectible[] = [
  // ── Trading Cards (15) ────────────────────────────────────
  { name: "Pikachu Illustrator (PSA 10)", category: "Trading Cards", estimatedValue: 5275000, imageUrl: img("1613771404784-3a5686aa2be3") },
  { name: "1st Ed. Shadowless Charizard", category: "Trading Cards", estimatedValue: 550000, imageUrl: img("1613771404784-3a5686aa2be3") },
  { name: "Umbreon VMAX Alt Art (Moonbreon)", category: "Trading Cards", estimatedValue: 2000, imageUrl: img("1613771404784-3a5686aa2be3") },
  { name: "Umbreon ex SIR (Prismatic Evolutions)", category: "Trading Cards", estimatedValue: 950, imageUrl: img("1613771404784-3a5686aa2be3") },
  { name: "Gold Star Charizard (PSA 10)", category: "Trading Cards", estimatedValue: 60000, imageUrl: img("1613771404784-3a5686aa2be3") },
  { name: "Mega Charizard X ex SIR", category: "Trading Cards", estimatedValue: 450, imageUrl: img("1613771404784-3a5686aa2be3") },
  { name: "Team Rocket's Mewtwo ex SIR", category: "Trading Cards", estimatedValue: 350, imageUrl: img("1613771404784-3a5686aa2be3") },
  { name: "Sylveon ex SIR (Prismatic Evolutions)", category: "Trading Cards", estimatedValue: 320, imageUrl: img("1613771404784-3a5686aa2be3") },
  { name: "Neo Genesis 1st Ed. Lugia (PSA 10)", category: "Trading Cards", estimatedValue: 45000, imageUrl: img("1613771404784-3a5686aa2be3") },
  { name: "Latias & Latios GX Alt Art", category: "Trading Cards", estimatedValue: 1500, imageUrl: img("1613771404784-3a5686aa2be3") },
  { name: "Reshiram ex SIR (White Flare)", category: "Trading Cards", estimatedValue: 195, imageUrl: img("1613771404784-3a5686aa2be3") },
  { name: "Jolteon ex SIR (Prismatic Evolutions)", category: "Trading Cards", estimatedValue: 210, imageUrl: img("1613771404784-3a5686aa2be3") },
  { name: "Pikachu with Grey Felt Hat (Van Gogh)", category: "Trading Cards", estimatedValue: 400, imageUrl: img("1613771404784-3a5686aa2be3") },
  { name: "Shining Mew (CoroCoro Promo)", category: "Trading Cards", estimatedValue: 33000, imageUrl: img("1613771404784-3a5686aa2be3") },
  { name: "Trophy Pikachu No. 1 Trainer", category: "Trading Cards", estimatedValue: 900000, imageUrl: img("1613771404784-3a5686aa2be3") },

  // ── Funko Pop (12) ────────────────────────────────────────
  { name: "Freddy Funko as Iron Man (Metallic)", category: "Funko Pop", estimatedValue: 43000, imageUrl: img("1608889825205-eebdb9fc5806") },
  { name: "Alex DeLarge (Glow-in-the-Dark Chase)", category: "Funko Pop", estimatedValue: 60000, imageUrl: img("1608889825205-eebdb9fc5806") },
  { name: "Stan Lee (Platinum Metallic)", category: "Funko Pop", estimatedValue: 30800, imageUrl: img("1608889825205-eebdb9fc5806") },
  { name: "Freddy Funko as Ghost Rider", category: "Funko Pop", estimatedValue: 33500, imageUrl: img("1608889825205-eebdb9fc5806") },
  { name: "Boo Berry (GITD) SDCC 2011", category: "Funko Pop", estimatedValue: 32000, imageUrl: img("1608889825205-eebdb9fc5806") },
  { name: "Planet Arlia Vegeta (NYCC)", category: "Funko Pop", estimatedValue: 9000, imageUrl: img("1608889825205-eebdb9fc5806") },
  { name: "Freddy Funko as Joker (Dark Knight)", category: "Funko Pop", estimatedValue: 10000, imageUrl: img("1608889825205-eebdb9fc5806") },
  { name: "Buzz & Woody 2-Pack (Vaulted)", category: "Funko Pop", estimatedValue: 14600, imageUrl: img("1608889825205-eebdb9fc5806") },
  { name: "Freddy Funko as Boba Fett", category: "Funko Pop", estimatedValue: 13320, imageUrl: img("1608889825205-eebdb9fc5806") },
  { name: "The Thing (Metallic, Black Eyes)", category: "Funko Pop", estimatedValue: 11500, imageUrl: img("1608889825205-eebdb9fc5806") },
  { name: "Dumbo (Clown) SDCC 2013", category: "Funko Pop", estimatedValue: 6640, imageUrl: img("1608889825205-eebdb9fc5806") },
  { name: "Willy Wonka & Oompa Loompa 2-Pack", category: "Funko Pop", estimatedValue: 210000, imageUrl: img("1608889825205-eebdb9fc5806") },

  // ── Shoes (10) ────────────────────────────────────────────
  { name: "Jordan 1 Retro High OG Chicago", category: "Shoes", estimatedValue: 2200, imageUrl: img("1542291026616-b53d9907b4f2") },
  { name: "Yeezy Boost 350 V2 Zebra", category: "Shoes", estimatedValue: 280, imageUrl: img("1542291026616-b53d9907b4f2") },
  { name: "Nike Dunk Low Panda", category: "Shoes", estimatedValue: 120, imageUrl: img("1542291026616-b53d9907b4f2") },
  { name: "Air Max 90 Infrared", category: "Shoes", estimatedValue: 200, imageUrl: img("1542291026616-b53d9907b4f2") },
  { name: "Travis Scott x AJ1 Low Reverse Mocha", category: "Shoes", estimatedValue: 1450, imageUrl: img("1542291026616-b53d9907b4f2") },
  { name: "Off-White x Air Jordan 1 Chicago", category: "Shoes", estimatedValue: 5800, imageUrl: img("1542291026616-b53d9907b4f2") },
  { name: "Nike SB Dunk Low Paris", category: "Shoes", estimatedValue: 30000, imageUrl: img("1542291026616-b53d9907b4f2") },
  { name: "New Balance 550 White Green", category: "Shoes", estimatedValue: 110, imageUrl: img("1542291026616-b53d9907b4f2") },
  { name: "Adidas Samba OG White", category: "Shoes", estimatedValue: 100, imageUrl: img("1542291026616-b53d9907b4f2") },
  { name: "Nike Air Force 1 Low White", category: "Shoes", estimatedValue: 90, imageUrl: img("1542291026616-b53d9907b4f2") },

  // ── Coins (5) ─────────────────────────────────────────────
  { name: "1909-S VDB Lincoln Penny", category: "Coins", estimatedValue: 1200, imageUrl: img("1621761311883-7afb4d616a72") },
  { name: "1881-S Morgan Silver Dollar", category: "Coins", estimatedValue: 400, imageUrl: img("1621761311883-7afb4d616a72") },
  { name: "American Gold Eagle 1oz", category: "Coins", estimatedValue: 2100, imageUrl: img("1621761311883-7afb4d616a72") },
  { name: "1932-D Washington Quarter", category: "Coins", estimatedValue: 85, imageUrl: img("1621761311883-7afb4d616a72") },
  { name: "1955 Double Die Lincoln Penny", category: "Coins", estimatedValue: 1800, imageUrl: img("1621761311883-7afb4d616a72") },

  // ── Figures (4) ───────────────────────────────────────────
  { name: "Monkey D. Luffy (Gear 5) S.H.Figuarts", category: "Figures", estimatedValue: 120, imageUrl: img("1594736797933-d3b5e3c22c1a") },
  { name: "Master Chief (Halo Infinite)", category: "Figures", estimatedValue: 95, imageUrl: img("1594736797933-d3b5e3c22c1a") },
  { name: "Optimus Prime (MPX-1 Masterpiece)", category: "Figures", estimatedValue: 200, imageUrl: img("1594736797933-d3b5e3c22c1a") },
  { name: "Link (Tears of the Kingdom) Amiibo", category: "Figures", estimatedValue: 60, imageUrl: img("1594736797933-d3b5e3c22c1a") },

  // ── Comics (4) ────────────────────────────────────────────
  { name: "Spider-Man #1 (1990, McFarlane)", category: "Comics", estimatedValue: 250, imageUrl: img("1612036782180-f82956ef2431") },
  { name: "Batman #404 (Year One)", category: "Comics", estimatedValue: 180, imageUrl: img("1612036782180-f82956ef2431") },
  { name: "X-Men #141 (Days of Future Past)", category: "Comics", estimatedValue: 320, imageUrl: img("1612036782180-f82956ef2431") },
  { name: "Amazing Fantasy #15 (CGC 5.0)", category: "Comics", estimatedValue: 120000, imageUrl: img("1612036782180-f82956ef2431") },
];

export function searchCollectibles(query: string): DatabaseCollectible[] {
  if (!query || query.length < 2) return [];
  const lower = query.toLowerCase();
  return collectiblesDatabase
    .filter(
      (item) =>
        item.name.toLowerCase().includes(lower) ||
        item.category.toLowerCase().includes(lower)
    )
    .slice(0, 8);
}
