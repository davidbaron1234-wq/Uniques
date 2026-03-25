/**
 * Market feed seeder — shared between /api/feed/seed and /api/feed/discover.
 * Fetches real eBay listings and upserts them into the MarketItem table.
 */

import { searchEbayItems } from "@/lib/ebay";
import { prisma } from "@/lib/prisma";

export const CATEGORY_QUERIES: Record<string, { query: string; minPrice: number }> = {
  "Pokémon TCG":  { query: "Pokemon card PSA graded rare holo",           minPrice: 50   },
  "Sports Cards": { query: "sports card PSA 10 graded rookie auto",        minPrice: 150  },
  "Watches":      { query: "luxury watch Rolex Omega Seiko vintage",       minPrice: 1000 },
  "Sneakers":     { query: "Nike Jordan Yeezy deadstock DS sneaker",       minPrice: 120  },
  "Lego":         { query: "Lego set sealed new unopened rare retired",    minPrice: 80   },
  "Funko Pop":    { query: "Funko Pop vinyl exclusive convention limited",  minPrice: 50   },
  "Comics":       { query: "comic book CGC graded key issue first app",    minPrice: 200  },
  "Coins":        { query: "rare coin silver gold graded MS uncirculated", minPrice: 100  },
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_QUERIES);

/** Fetch eBay items for a set of categories and upsert into MarketItem. */
export async function seedCategories(categories: string[]): Promise<number> {
  let total = 0;

  await Promise.allSettled(
    categories.map(async (cat) => {
      const cfg = CATEGORY_QUERIES[cat];
      if (!cfg) return;

      let data: Awaited<ReturnType<typeof searchEbayItems>>;
      try {
        data = await searchEbayItems(cfg.query, { limit: 20, minPrice: cfg.minPrice });
      } catch {
        console.warn(`[seed] eBay fetch failed for "${cat}"`);
        return;
      }

      for (const item of data.items) {
        const imageUrl = item.imageLarge ?? item.imageSmall ?? "";
        // Only store authentic eBay CDN images
        if (!imageUrl.includes("ebayimg.com")) continue;

        try {
          await prisma.marketItem.upsert({
            where:  { ebayId: item.id },
            create: { ebayId: item.id, title: item.name, imageUrl, price: item.marketPrice, category: cat },
            update: { title: item.name, imageUrl, price: item.marketPrice },
          });
          total++;
        } catch { /* duplicate key or constraint — skip */ }
      }
    }),
  );

  console.log(`[seed] Upserted ${total} MarketItems across ${categories.length} categories.`);
  return total;
}
