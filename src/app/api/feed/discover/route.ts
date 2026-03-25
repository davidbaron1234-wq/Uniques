/**
 * GET /api/feed/discover?categories=Pokémon TCG,Watches&page=1&pageSize=20
 *
 * Returns socially-wrapped feed events from the MarketItem DB pool.
 * On first call (pool thin), seeds from eBay synchronously — subsequent calls
 * are instant DB reads with proper pagination for infinite scroll.
 *
 * Each item is assigned a deterministic mock user + event type via hash so the
 * same grail always appears under the same "collector" across refreshes.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ALL_CATEGORIES, CATEGORY_QUERIES, seedCategories } from "@/app/api/feed/seed/route";

export const runtime = "nodejs";

// ── Social context pools ──────────────────────────────────────────────────────

const SOCIAL_USERS = [
  { name: "Drew",   handle: "drew",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Drew&backgroundColor=B5EAD7"   },
  { name: "Alex",   handle: "alex",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=AA95C5"   },
  { name: "Morgan", handle: "morgan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Morgan&backgroundColor=FFDAC1" },
  { name: "Sam",    handle: "sam",    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam&backgroundColor=C7CEEA"    },
  { name: "Ethan",  handle: "ethan",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan&backgroundColor=FFDAC1" },
  { name: "Maya",   handle: "maya",   avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maya&backgroundColor=FFB7B2"  },
  { name: "Riley",  handle: "riley",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Riley&backgroundColor=E2D9F3" },
  { name: "Jordan", handle: "jordan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan&backgroundColor=C7CEEA"},
  { name: "Casey",  handle: "casey",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Casey&backgroundColor=BAFCA2" },
  { name: "Blake",  handle: "blake",  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Blake&backgroundColor=B5EAD7" },
];

// Only types that render item images correctly in FeedCard (no radar carousel)
const SOCIAL_EVENTS = [
  { type: "added_grail",     action: "added a grail to their vault"          },
  { type: "new_listing",     action: "listed this for trade"                 },
  { type: "added_grail",     action: "just added this to their collection"   },
  { type: "completed_trade", action: "just acquired this piece in a trade"   },
  { type: "new_listing",     action: "is looking to move this — make an offer"},
  { type: "added_grail",     action: "dropped this in their vault today"     },
];

const TIMESTAMPS = [
  "Just now", "2m ago", "8m ago", "22m ago", "45m ago",
  "1h ago",   "2h ago", "4h ago", "6h ago",  "10h ago",
  "14h ago",  "18h ago","1d ago", "2d ago",
];

// ── Deterministic hash ────────────────────────────────────────────────────────

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pick<T>(arr: T[], key: string): T {
  return arr[hashCode(key) % arr.length];
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const requestedCats = (searchParams.get("categories") ?? "")
    .split(",").map((c) => c.trim()).filter((c) => CATEGORY_QUERIES[c]);
  const cats     = requestedCats.length > 0 ? requestedCats : ALL_CATEGORIES;
  const page     = Math.max(1, parseInt(searchParams.get("page")     ?? "1"));
  const pageSize = Math.min(20, parseInt(searchParams.get("pageSize") ?? "20"));

  // ── Ensure DB pool is populated ────────────────────────────────────────────
  // Count how many categories have at least 5 items in the DB
  const catCounts = await Promise.all(
    cats.map((c) => prisma.marketItem.count({ where: { category: c } })),
  );
  const thinCats = cats.filter((_, i) => catCounts[i] < 5);

  if (thinCats.length > 0) {
    // Seed missing/thin categories synchronously so this request returns real data.
    // Subsequent requests for the same categories will hit the DB directly.
    console.log(`[discover] Seeding thin categories: ${thinCats.join(", ")}`);
    await seedCategories(thinCats);
  }

  // ── Balanced pagination ────────────────────────────────────────────────────
  // Fetch perCat items per category, then interleave so every category appears
  // equally: cat1[0], cat2[0], cat3[0], cat1[1], cat2[1], ...
  const perCat  = Math.ceil(pageSize / cats.length);
  const catSkip = (page - 1) * perCat;

  const catRows = await Promise.all(
    cats.map((cat) =>
      prisma.marketItem.findMany({
        where:   { category: cat },
        orderBy: { createdAt: "desc" },
        skip:    catSkip,
        take:    perCat,
      }),
    ),
  );

  // Interleave
  const interleaved: { id: string; ebayId: string; title: string; imageUrl: string; price: number; category: string }[] = [];
  const maxLen = Math.max(0, ...catRows.map((r) => r.length));
  for (let i = 0; i < maxLen; i++) {
    for (const row of catRows) {
      if (i < row.length) interleaved.push(row[i]);
    }
  }
  const pageItems = interleaved.slice(0, pageSize);

  // ── Social wrapping ────────────────────────────────────────────────────────
  const events = pageItems.map((item) => {
    const user  = pick(SOCIAL_USERS,  item.ebayId);
    const evt   = pick(SOCIAL_EVENTS, item.ebayId + "type");
    const ts    = pick(TIMESTAMPS,    item.ebayId + "ts");
    return {
      id:         `fy-${item.id}`,
      user,
      type:       evt.type,
      action:     evt.action,
      item:       { name: item.title, imageUrl: item.imageUrl, estimatedValue: item.price },
      timestamp:  ts,
      suggested:  true as const,
      categories: [item.category],
    };
  });

  // ── hasMore: are there more items beyond this page? ───────────────────────
  // Use the smallest per-cat count to be conservative
  const minCatCount = Math.min(...catCounts.map((c, i) => thinCats.includes(cats[i]) ? 0 : c));
  const hasMore = catSkip + perCat < minCatCount;

  // ── Verification log ──────────────────────────────────────────────────────
  const domains = Array.from(new Set(events.map((e) => {
    try { return new URL(e.item.imageUrl).hostname; } catch { return "invalid"; }
  })));
  console.log(`[discover] page=${page} cats=[${cats.join(",")}] returning ${events.length} events. Image domains: ${domains.join(", ")}`);

  return NextResponse.json({ events, hasMore, page });
}
