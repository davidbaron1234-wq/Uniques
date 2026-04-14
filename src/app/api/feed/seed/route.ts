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

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false; // require secret to be set
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({})) as { categories?: string[] };
  const cats  = (body.categories ?? ALL_CATEGORIES).filter((c) => CATEGORY_QUERIES[c]);
  const result = await seedCategories(cats);
  return NextResponse.json({ seeded: result.total, categories: cats, details: result.details });
}
