/**
 * GET /api/feed/discover?categories=Sports+Cards,Watches&count=20
 *
 * Returns real eBay-backed feed events for the "For You" tab.
 * Results are cached server-side per category for 1 hour so the home feed
 * stays fast after the first cold hit.
 */

import { NextRequest, NextResponse } from "next/server";
import { searchEbayItems } from "@/lib/ebay";

export const runtime = "nodejs";

// ── Per-category eBay query config ────────────────────────────────────────────

const CATEGORY_QUERIES: Record<string, { query: string; minPrice: number }> = {
  "Pokémon TCG":  { query: "Pokemon card PSA graded rare holo",    minPrice: 50   },
  "Sports Cards": { query: "sports card PSA 10 graded rookie",      minPrice: 150  },
  "Watches":      { query: "luxury watch Rolex Omega Seiko",         minPrice: 1000 },
  "Sneakers":     { query: "Nike Jordan Yeezy deadstock DS",         minPrice: 120  },
  "Lego":         { query: "Lego set sealed new unopened",           minPrice: 80   },
  "Funko Pop":    { query: "Funko Pop vinyl exclusive convention",   minPrice: 50   },
  "Comics":       { query: "comic book CGC graded key issue",        minPrice: 200  },
  "Coins":        { query: "rare coin silver gold graded MS",        minPrice: 100  },
};

// ── Module-level TTL cache ────────────────────────────────────────────────────

type CacheEntry = {
  events:    DiscoverEvent[];
  expiresAt: number;
};

export type DiscoverEvent = {
  id:        string;
  type:      "new_listing";
  title:     string;
  imageUrl:  string;
  price:     number;
  category:  string;
  suggested: true;
};

const CACHE = new Map<string, CacheEntry>();
const TTL   = 60 * 60 * 1000; // 1 hour
// Cache version — bump to invalidate stale entries after a deploy
const CACHE_VERSION = "v2";

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoriesParam  = searchParams.get("categories") ?? "";
  const categories       = categoriesParam.split(",").map((c) => c.trim()).filter(Boolean);
  const count            = Math.min(parseInt(searchParams.get("count") ?? "20"), 50);

  if (categories.length === 0) return NextResponse.json({ events: [] });

  const now = Date.now();
  const results: DiscoverEvent[] = [];
  const perCat = Math.max(Math.ceil(count / categories.length), 5);

  await Promise.allSettled(
    categories.map(async (cat) => {
      const cached = CACHE.get(`${CACHE_VERSION}:${cat}`);
      if (cached && now < cached.expiresAt) {
        results.push(...cached.events.slice(0, perCat));
        return;
      }

      const qConfig = CATEGORY_QUERIES[cat];
      if (!qConfig) return;

      const data = await searchEbayItems(qConfig.query, {
        limit:    12,
        minPrice: qConfig.minPrice,
      });

      const events: DiscoverEvent[] = data.items.slice(0, 10).map((item) => ({
        id:        `discover-${item.id}`,
        type:      "new_listing",
        title:     item.name,
        imageUrl:  item.imageLarge ?? item.imageSmall,
        price:     item.marketPrice,
        category:  cat,
        suggested: true,
      }));

      // Verification: every image must come from a real eBay CDN domain
      const badUrls = events.filter((e) => !e.imageUrl?.includes("ebayimg.com"));
      if (badUrls.length > 0) {
        console.warn(`[discover] Non-eBay image URLs for "${cat}":`, badUrls.map((e) => e.imageUrl));
      } else {
        console.log(`[discover] ✓ ${cat}: ${events.length} items, all from i.ebayimg.com`);
      }

      CACHE.set(`${CACHE_VERSION}:${cat}`, { events, expiresAt: now + TTL });
      results.push(...events.slice(0, perCat));
    }),
  );

  // Emit a summary for verification in Vercel logs
  const domainSet = new Set(results.map((e) => { try { return new URL(e.imageUrl).hostname; } catch { return "invalid"; } }));
  const domains = Array.from(domainSet);
  console.log(`[discover] Returning ${results.length} events. Image domains: ${domains.join(", ")}`);

  return NextResponse.json({ events: results.slice(0, count) });
}
