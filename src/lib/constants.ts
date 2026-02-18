export const CATEGORIES = [
  "Pokémon TCG",
  "Sports Cards",
  "Other TCG", // הקטגוריה החדשה!
  "Funko Pop",
  "Lego",
  "Sneakers",
  "Video Games",
  "Comics",
  "Watches",
  "Coins",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const mapCatalogCategory = (catalogCat: string): Category => {
  const cat = catalogCat.toLowerCase();
  if (cat.includes("pokemon") || cat.includes("pokémon")) return "Pokémon TCG";
  if (cat.includes("sport") || cat.includes("baseball") || cat.includes("basketball") || cat.includes("football") || cat.includes("soccer")) return "Sports Cards";
  if (cat.includes("magic") || cat.includes("mtg") || cat.includes("yugioh") || cat.includes("yu-gi-oh")) return "Other TCG";
  if (cat.includes("funko") || cat.includes("pop!")) return "Funko Pop";
  if (cat.includes("lego")) return "Lego";
  if (cat.includes("video game") || cat.includes("console")) return "Video Games";
  if (cat.includes("sneaker") || cat.includes("shoe")) return "Sneakers";
  if (cat.includes("comic")) return "Comics";
  if (cat.includes("watch")) return "Watches";
  if (cat.includes("coin") || cat.includes("currency")) return "Coins";
  return "Other";
};