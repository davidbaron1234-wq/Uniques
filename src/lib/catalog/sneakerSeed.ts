import { MasterItem } from "./types";

// ── Sneaker Seed Data ──────────────────────────────────────────────────────
// Real sneakers with approximate market values from StockX/GOAT (2025-2026)

type S = [string, string, string, string, number]; // [slug, name, brand, silhouette, price]

const img = (query: string) =>
  `https://images.unsplash.com/photo-1542291026616-b53d9907b4f2?w=400&h=400&fit=crop&auto=format&q=80&sig=${encodeURIComponent(query)}`;

function sneakers(entries: S[]): MasterItem[] {
  return entries.map(([slug, name, brand, silhouette, price]) => ({
    id: `snkr-${slug}`,
    name,
    category: "Sneakers" as const,
    subCategory: brand,
    set: silhouette,
    rarity: price >= 10000 ? "Grail" : price >= 1000 ? "Premium" : price >= 300 ? "Hype" : "General Release",
    imageSmall: img(slug),
    imageLarge: img(slug),
    marketPrice: price,
  }));
}

export const sneakerSeedData: MasterItem[] = sneakers([
  // ── Grails ($10,000+) ──────────────────────────────────────────────────
  ["yeezy1-grammy", "Nike Air Yeezy 1 Grammy Prototype", "Nike", "Air Yeezy 1", 1800000],
  ["mag-2016", "Nike MAG 2016 (Auto-Lacing)", "Nike", "MAG", 100000],
  ["sb-flom", "Nike SB Dunk High Pro FLOM", "Nike", "SB Dunk High", 55000],
  ["aj4-eminem", "Air Jordan 4 Retro Eminem Encore", "Jordan", "Air Jordan 4", 45000],
  ["sb-paris", "Nike SB Dunk Low Paris", "Nike", "SB Dunk Low", 30000],
  ["yeezy2-redoct", "Nike Air Yeezy 2 Red October", "Nike", "Air Yeezy 2", 15000],
  ["aj1-dior-high", "Air Jordan 1 Retro High Dior", "Jordan", "Air Jordan 1 High", 12000],
  ["lv-kanye-jasper", "Louis Vuitton x Kanye West Jasper", "Louis Vuitton", "Jasper", 15000],
  ["aj3-djkhaled", "Air Jordan 3 DJ Khaled Grateful", "Jordan", "Air Jordan 3", 12000],
  ["aj12-flu-game", "Air Jordan 12 Flu Game (Game-Worn)", "Jordan", "Air Jordan 12", 1300000],
  ["moonshoe", "Nike Moon Shoe (1972)", "Nike", "Moon Shoe", 437500],
  ["lv-af1-virgil", "Louis Vuitton x Nike Air Force 1 (Virgil)", "Nike", "Air Force 1", 25000],

  // ── Premium ($1,000-$10,000) ───────────────────────────────────────────
  ["ow-aj1-chicago", "Off-White x Air Jordan 1 Retro High Chicago", "Jordan", "Air Jordan 1 High", 5800],
  ["ow-aj1-unc", "Off-White x Air Jordan 1 Retro High UNC", "Jordan", "Air Jordan 1 High", 3500],
  ["ow-presto-og", "Off-White x Nike Air Presto (OG)", "Nike", "Air Presto", 2800],
  ["aj1-chicago-2015", "Air Jordan 1 Retro High OG Chicago (2015)", "Jordan", "Air Jordan 1 High", 2200],
  ["ts-aj1-high", "Travis Scott x Air Jordan 1 Retro High", "Jordan", "Air Jordan 1 High", 1800],
  ["ts-aj1-low-mocha", "Travis Scott x Air Jordan 1 Low Reverse Mocha", "Jordan", "Air Jordan 1 Low", 1400],
  ["ts-aj4-purple", "Travis Scott x Air Jordan 4 Purple", "Jordan", "Air Jordan 4", 1200],
  ["sacai-ldwaffle-green", "Nike x Sacai LDWaffle Green Gusto", "Nike", "LDWaffle", 1100],
  ["aj1-bred-toe", "Air Jordan 1 Retro High OG Bred Toe", "Jordan", "Air Jordan 1 High", 1000],
  ["mars-yard-3", "Nike Mars Yard 3.0 (Tom Sachs)", "Nike", "Mars Yard", 800],
  ["ow-aj4-sail", "Off-White x Air Jordan 4 Sail", "Jordan", "Air Jordan 4", 1500],

  // ── Hype ($300-$1,000) ─────────────────────────────────────────────────
  ["aj1-lost-found", "Air Jordan 1 Retro High OG Lost & Found", "Jordan", "Air Jordan 1 High", 300],
  ["aj3-reimagined", "Air Jordan 3 Retro White Cement Reimagined", "Jordan", "Air Jordan 3", 250],
  ["aj4-military-black", "Air Jordan 4 Retro Military Black", "Jordan", "Air Jordan 4", 280],
  ["aj4-bred-reimagined", "Air Jordan 4 Retro Bred Reimagined", "Jordan", "Air Jordan 4", 350],
  ["aj11-bred", "Air Jordan 11 Retro Bred (2019)", "Jordan", "Air Jordan 11", 350],
  ["aj11-concord", "Air Jordan 11 Retro Concord (2018)", "Jordan", "Air Jordan 11", 320],
  ["kobe6-grinch", "Nike Kobe 6 Protro Grinch", "Nike", "Kobe 6", 350],
  ["kobe8-whatthe", "Nike Kobe 8 Protro What The", "Nike", "Kobe 8", 250],
  ["nb-2002r-protection", "New Balance 2002R Protection Pack Rain Cloud", "New Balance", "2002R", 300],
  ["ow-dunk-lot1", "Off-White x Nike Dunk Low Lot 1 of 50", "Nike", "Dunk Low", 450],
  ["yeezy350-zebra", "Yeezy Boost 350 V2 Zebra", "Adidas", "Yeezy Boost 350 V2", 280],
  ["yeezy350-beluga", "Yeezy Boost 350 V2 Beluga", "Adidas", "Yeezy Boost 350 V2", 350],
  ["yeezy700-waverunner", "Yeezy 700 Wave Runner", "Adidas", "Yeezy 700", 380],
  ["ts-aj6-olive", "Travis Scott x Air Jordan 6 Olive", "Jordan", "Air Jordan 6", 400],
  ["aj4-sb-pine-green", "Nike SB x Air Jordan 4 Pine Green", "Jordan", "Air Jordan 4", 500],

  // ── General Release / Popular ($50-$300) ───────────────────────────────
  ["dunk-panda", "Nike Dunk Low Panda", "Nike", "Dunk Low", 120],
  ["af1-white", "Nike Air Force 1 Low White", "Nike", "Air Force 1", 90],
  ["am90-infrared", "Nike Air Max 90 Infrared", "Nike", "Air Max 90", 200],
  ["am1-patta-monarq", "Nike Air Max 1 Patta Monarch", "Nike", "Air Max 1", 250],
  ["nb550-white-green", "New Balance 550 White Green", "New Balance", "550", 110],
  ["nb530-white-silver", "New Balance 530 White Silver", "New Balance", "530", 95],
  ["samba-og-white", "Adidas Samba OG White", "Adidas", "Samba", 100],
  ["samba-jane", "Adidas Samba Jane", "Adidas", "Samba Jane", 120],
  ["gazelle-bold-black", "Adidas Gazelle Bold Black", "Adidas", "Gazelle Bold", 110],
  ["asics1130-black", "ASICS Gel-1130 Black Pure Silver", "ASICS", "Gel-1130", 120],
  ["asics2160-cream", "ASICS Gel-2160 Cream", "ASICS", "Gel-2160", 130],
  ["nb204l-grey", "New Balance 204L Grey", "New Balance", "204L", 140],
  ["onitsuka-mexico66-white", "Onitsuka Tiger Mexico 66 White Blue", "Onitsuka Tiger", "Mexico 66", 100],
  ["salomon-xt6-black", "Salomon XT-6 Black", "Salomon", "XT-6", 180],
  ["nb9060-sea-salt", "New Balance 9060 Sea Salt", "New Balance", "9060", 200],
  ["aj1-low-vintage-grey", "Air Jordan 1 Low OG Vintage Grey", "Jordan", "Air Jordan 1 Low", 150],
  ["dunk-high-panda", "Nike Dunk High Panda", "Nike", "Dunk High", 110],
  ["am97-silver", "Nike Air Max 97 Silver Bullet", "Nike", "Air Max 97", 200],
  ["converse-shai001", "Converse Shai 001", "Converse", "Shai 001", 130],
  ["aj1-mid-chicago", "Air Jordan 1 Mid Chicago (2022)", "Jordan", "Air Jordan 1 Mid", 130],
]);
