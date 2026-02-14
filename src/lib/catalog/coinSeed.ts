import { MasterItem } from "./types";

type C = [string, string, string, string, number]; // [slug, name, series, rarity, price]

const img = (query: string) =>
  `https://images.unsplash.com/photo-1621761311883-7afb4d616a72?w=400&h=400&fit=crop&auto=format&q=80&sig=${encodeURIComponent(query)}`;

function coins(entries: C[]): MasterItem[] {
  return entries.map(([slug, name, series, rarity, price]) => ({
    id: `coin-${slug}`,
    name,
    category: "Coins" as const,
    subCategory: "US Coins",
    set: series,
    rarity,
    imageSmall: img(slug),
    imageLarge: img(slug),
    marketPrice: price,
  }));
}

export const coinSeedData: MasterItem[] = coins([
  // ── Ultra-Premium ────────────────────────────────────────────────────
  ["1794-flowing-hair", "1794 Flowing Hair Dollar", "Flowing Hair", "Key Date", 10000000],
  ["1804-bust-dollar", "1804 Draped Bust Dollar (Class I)", "Draped Bust", "Key Date", 4000000],
  ["1933-double-eagle", "1933 Saint-Gaudens Double Eagle", "Saint-Gaudens", "Key Date", 18900000],
  ["1913-liberty-nickel", "1913 Liberty Head Nickel", "Liberty Nickel", "Key Date", 4500000],

  // ── Premium ($10,000+) ──────────────────────────────────────────────
  ["1943-copper-penny", "1943 Copper Lincoln Penny", "Lincoln Cents", "Error", 200000],
  ["1916d-mercury", "1916-D Mercury Dime", "Mercury Dime", "Key Date", 5000],
  ["1893s-morgan", "1893-S Morgan Silver Dollar", "Morgan Dollar", "Key Date", 5000],
  ["1909svdb-penny", "1909-S VDB Lincoln Penny", "Lincoln Cents", "Key Date", 1200],
  ["1955-dbl-die", "1955 Double Die Lincoln Penny", "Lincoln Cents", "Error", 1800],
  ["1885cc-morgan", "1885-CC Morgan Silver Dollar", "Morgan Dollar", "Key Date", 800],
  ["1937-3leg-buffalo", "1937 3-Legged Buffalo Nickel", "Buffalo Nickel", "Error", 1500],

  // ── Investment Grade ($500-$10,000) ─────────────────────────────────
  ["1921-morgan", "1921 Morgan Silver Dollar", "Morgan Dollar", "Common Date", 30],
  ["1881s-morgan", "1881-S Morgan Silver Dollar", "Morgan Dollar", "Semi-Key", 400],
  ["1878-morgan-8tf", "1878 Morgan Dollar (8 Tail Feathers)", "Morgan Dollar", "Variety", 250],
  ["1932d-quarter", "1932-D Washington Quarter", "Washington Quarter", "Key Date", 85],
  ["1950d-nickel", "1950-D Jefferson Nickel", "Jefferson Nickel", "Key Date", 25],
  ["1916-standing-lib", "1916 Standing Liberty Quarter (Type 1)", "Standing Liberty", "First Year", 600],
  ["1838o-half-dollar", "1838-O Capped Bust Half Dollar", "Capped Bust", "Key Date", 3000],
  ["2000-sacagawea-cheerios", "2000 Sacagawea Dollar (Cheerios)", "Sacagawea", "Variety", 1500],

  // ── Modern Bullion & Popular ────────────────────────────────────────
  ["gold-eagle-1oz", "American Gold Eagle 1oz (2026)", "American Eagle", "Bullion", 2100],
  ["gold-eagle-half", "American Gold Eagle 1/2oz (2026)", "American Eagle", "Bullion", 1050],
  ["gold-eagle-quarter", "American Gold Eagle 1/4oz (2026)", "American Eagle", "Bullion", 530],
  ["gold-eagle-tenth", "American Gold Eagle 1/10oz (2026)", "American Eagle", "Bullion", 220],
  ["silver-eagle-1oz", "American Silver Eagle 1oz (2026)", "American Eagle", "Bullion", 35],
  ["gold-buffalo-1oz", "American Gold Buffalo 1oz (2026)", "American Buffalo", "Bullion", 2150],
  ["platinum-eagle-1oz", "American Platinum Eagle 1oz (2026)", "American Eagle", "Bullion", 1000],
  ["gold-maple-1oz", "Canadian Gold Maple Leaf 1oz", "Maple Leaf", "Bullion", 2100],
  ["silver-maple-1oz", "Canadian Silver Maple Leaf 1oz", "Maple Leaf", "Bullion", 33],
  ["gold-krugerrand", "South African Gold Krugerrand 1oz", "Krugerrand", "Bullion", 2080],
  ["silver-philharmonic", "Austrian Silver Philharmonic 1oz", "Philharmonic", "Bullion", 32],

  // ── Classic US Coins ────────────────────────────────────────────────
  ["1921-peace-dollar", "1921 Peace Dollar (High Relief)", "Peace Dollar", "First Year", 250],
  ["1964-kennedy-half", "1964 Kennedy Half Dollar (90% Silver)", "Kennedy Half", "First Year", 12],
  ["1942-s-mercury", "1942/1 Mercury Dime (Overdate)", "Mercury Dime", "Error", 600],
  ["1969s-dbl-die-penny", "1969-S Doubled Die Lincoln Penny", "Lincoln Cents", "Error", 50000],
  ["2004-wisconsin-extra-leaf", "2004-D Wisconsin Quarter (Extra Leaf)", "State Quarter", "Error", 300],
  ["barber-half-dollar-1892", "1892 Barber Half Dollar", "Barber Half", "First Year", 40],
  ["seated-liberty-1840", "1840 Seated Liberty Dollar", "Seated Liberty", "Semi-Key", 500],
  ["trade-dollar-1878s", "1878-S Trade Dollar", "Trade Dollar", "Common Date", 150],
]);
