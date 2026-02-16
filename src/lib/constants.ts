// ── Single Source of Truth for Categories ─────────────────────────────────
// Every page (Search, Add Item, Profile) imports from here.

export const CATEGORIES = [
  "Pokémon TCG",
  "Sports Cards",
  "Sneakers",
  "Funko Pop",
  "Comics",
  "Watches",
  "Coins",
  "Lego",
  "Video Games",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

// Maps catalog categories (from MasterItem) to app categories
export function mapCatalogCategory(cat: string): Category {
  if (cat === "Pokémon TCG") return "Pokémon TCG";
  if (cat === "Trading Cards") return "Pokémon TCG";
  if (cat === "Sneakers") return "Sneakers";
  if (cat === "Coins") return "Coins";
  return "Other";
}
