/**
 * Market feed seeder — shared between /api/feed/seed and /api/feed/discover.
 * Fetches real eBay listings and upserts them into the MarketItem table.
 */

import { searchEbayItems } from "@/lib/ebay";
import { prisma } from "@/lib/prisma";

// Note: eBay Browse API uses AND logic for multi-word queries.
// Queries must be single-brand or single-attribute to return results.
export const CATEGORY_QUERIES: Record<string, { query: string; minPrice: number }> = {
  "Pokémon TCG":  { query: "Pokemon card PSA graded holo rare",    minPrice: 50   },
  "Sports Cards": { query: "PSA graded rookie card",               minPrice: 100  },
  "Watches":      { query: "Rolex Submariner watch",               minPrice: 3000 },
  "Sneakers":     { query: "Air Jordan 1 sneaker",                 minPrice: 150  },
  "Lego":         { query: "Lego Star Wars set sealed",            minPrice: 60   },
  "Funko Pop":    { query: "Funko Pop exclusive limited",          minPrice: 30   },
  "Comics":       { query: "CGC graded comic key issue",           minPrice: 100  },
  "Coins":        { query: "Morgan silver dollar coin",            minPrice: 50   },
  "Other TCG":    { query: "Magic The Gathering rare foil card",   minPrice: 30   },
  "Video Games":  { query: "PS5 sealed game collector limited",    minPrice: 50   },
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_QUERIES);

export interface SeedCategoryResult {
  category: string;
  ebayReturned: number;
  upserted: number;
  rejected: number;
  rejectedSampleUrls: string[];
  error?: string;
}

/** Fetch eBay items for a set of categories and upsert into MarketItem. */
export async function seedCategories(
  categories: string[],
): Promise<{ total: number; details: SeedCategoryResult[] }> {
  let total = 0;
  const details: SeedCategoryResult[] = [];

  await Promise.allSettled(
    categories.map(async (cat) => {
      const cfg = CATEGORY_QUERIES[cat];
      if (!cfg) return;

      let data: Awaited<ReturnType<typeof searchEbayItems>>;
      try {
        data = await searchEbayItems(cfg.query, { limit: 20, minPrice: cfg.minPrice });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[seed] eBay fetch failed for "${cat}": ${msg}`);
        details.push({ category: cat, ebayReturned: 0, upserted: 0, rejected: 0, rejectedSampleUrls: [], error: msg });
        return;
      }

      // Trusted image CDNs: eBay CDN + enriched sources (Pokemon TCG API, Rebrickable)
      const VALID_CDNS = ["ebayimg.com", "pokemontcg.io", "rebrickable.com"];

      const rawCount = data.items.length;
      let catUpserted = 0;
      const rejectedUrls: string[] = [];

      for (const item of data.items) {
        const imageUrl = item.imageLarge ?? item.imageSmall ?? "";
        if (!imageUrl || !VALID_CDNS.some((cdn) => imageUrl.includes(cdn))) {
          rejectedUrls.push(imageUrl || "(empty)");
          continue;
        }

        try {
          await prisma.marketItem.upsert({
            where:  { ebayId: item.id },
            create: { ebayId: item.id, title: item.name, imageUrl, price: item.marketPrice, category: cat },
            update: { title: item.name, imageUrl, price: item.marketPrice },
          });
          total++;
          catUpserted++;
        } catch { /* duplicate key or constraint — skip */ }
      }

      console.log(`[seed] "${cat}": eBay returned ${rawCount}, ${catUpserted} upserted, ${rejectedUrls.length} rejected.`);
      if (rejectedUrls.length > 0) console.log(`[seed] "${cat}" rejected sample:`, rejectedUrls.slice(0, 3));

      details.push({ category: cat, ebayReturned: rawCount, upserted: catUpserted, rejected: rejectedUrls.length, rejectedSampleUrls: rejectedUrls.slice(0, 3) });
    }),
  );

  console.log(`[seed] Total: ${total} upserted across ${categories.length} categories.`);
  return { total, details };
}
