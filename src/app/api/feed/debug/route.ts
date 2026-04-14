/**
 * GET /api/feed/debug
 *
 * Returns raw DB counts per category and a sample of stored items.
 * Helps diagnose why certain categories have no items in the MarketItem table.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ALL_CATEGORIES } from "@/lib/feedSeeder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Count per expected category
  const categoryCounts = await Promise.all(
    ALL_CATEGORIES.map(async (cat) => {
      const count = await prisma.marketItem.count({ where: { category: cat } });
      return { category: cat, count };
    }),
  );

  // All distinct categories actually stored in the DB
  const allStored = await prisma.marketItem.groupBy({
    by: ["category"],
    _count: { id: true },
  });

  // Total item count
  const total = await prisma.marketItem.count();

  // Sample of 5 items (any category)
  const sample = await prisma.marketItem.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { id: true, ebayId: true, title: true, imageUrl: true, price: true, category: true, createdAt: true },
  });

  return NextResponse.json({
    total,
    expectedCategories: categoryCounts,
    storedCategories: allStored.map((r) => ({ category: r.category, count: r._count.id })),
    recentSample: sample,
  });
}
