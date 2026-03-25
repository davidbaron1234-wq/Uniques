/**
 * POST /api/feed/seed
 *
 * Seeds the MarketItem table with real eBay listings.
 * Safe to call multiple times — uses upsert (idempotent).
 * Called automatically by /api/feed/discover when the DB pool is thin.
 */

import { NextRequest, NextResponse } from "next/server";
import { ALL_CATEGORIES, CATEGORY_QUERIES, seedCategories } from "@/lib/feedSeeder";

export const runtime     = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { categories?: string[] };
  const cats  = (body.categories ?? ALL_CATEGORIES).filter((c) => CATEGORY_QUERIES[c]);
  const seeded = await seedCategories(cats);
  return NextResponse.json({ seeded, categories: cats });
}
