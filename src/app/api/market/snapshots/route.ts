/**
 * GET /api/market/snapshots
 *
 * Query params:
 *   type=user&refId=<userId>&days=30      → portfolio net-worth history
 *   type=catalog&refId=<marketItemId>&days=30 → official item price history (cron-written)
 *   type=catalog&ebayId=<ebayId>&days=30  → lookup by ebayId then return catalog history
 *
 * Returns { snapshots: [{ bucket: ISO string, value: number }] }
 * sorted oldest → newest so Recharts renders left-to-right.
 *
 * No auth required for catalog lookups (public market data).
 * User portfolio requires the caller to be the owner (returns 403 otherwise).
 */

import { getServerSession } from "next-auth";
import { authOptions }       from "@/lib/authOptions";
import { prisma }            from "@/lib/prisma";
import { NextRequest }       from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type   = searchParams.get("type");    // "user" | "catalog"
  const refId  = searchParams.get("refId");
  const ebayId = searchParams.get("ebayId"); // alternative: lookup by eBay/catalog ID
  const days   = Math.min(parseInt(searchParams.get("days") ?? "90", 10), 365);

  if (!type) {
    return Response.json({ error: "type is required" }, { status: 400 });
  }

  // Protect user portfolio data — only the owner may fetch it
  if (type === "user") {
    if (!refId) return Response.json({ error: "refId required for type=user" }, { status: 400 });
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.id !== refId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // If ebayId provided, resolve to MarketItem.id first
  let resolvedRefId = refId;
  if (type === "catalog" && ebayId && !refId) {
    const mi = await prisma.marketItem.findUnique({
      where:  { ebayId },
      select: { id: true },
    });
    if (!mi) return Response.json({ snapshots: [] });
    resolvedRefId = mi.id;
  }

  if (!resolvedRefId) {
    return Response.json({ error: "refId or ebayId required" }, { status: 400 });
  }

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  since.setUTCHours(0, 0, 0, 0);

  const rows = await prisma.marketSnapshot.findMany({
    where:   { type, refId: resolvedRefId, bucket: { gte: since } },
    orderBy: { bucket: "asc" },
    select:  { bucket: true, value: true },
  });

  return Response.json({
    snapshots: rows.map((r) => ({
      bucket: r.bucket.toISOString(),
      value:  r.value,
    })),
    resolvedRefId,
  });
}
