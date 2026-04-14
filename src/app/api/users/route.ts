export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

// GET /api/users — collector directory for the Explore tab
// Queries the Profile table (keyed by Supabase Auth UUID), NOT the legacy User table.
// Every authenticated user gets a Profile record created on sign-in (see authOptions.ts).
//
// ?search=    filter by name (case-insensitive)
// ?category=  filter by profile interest category
// ?minValue=  minimum vault value (sum of non-traded items)
// ?proOnly=   "true" to show Pro members only
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search   = searchParams.get("search")   ?? "";
    const category = searchParams.get("category") ?? "";
    const minValue = Number(searchParams.get("minValue") ?? 0);
    const proOnly  = searchParams.get("proOnly")  === "true";

    // Query Profile table — userId = Supabase Auth UUID (same as session.user.id)
    const profiles = await prisma.profile.findMany({
      where: {
        userId: { not: session.user.id }, // exclude self
        ...(search.trim() && {
          name: { contains: search, mode: "insensitive" },
        }),
      },
      take: 60,
      orderBy: { id: "desc" },
      select: {
        userId: true, name: true, handle: true, avatar: true,
        paymentMethods: true, shippingPreferences: true, interests: true,
        createdAt: true,
      },
    });

    if (profiles.length === 0) {
      return Response.json({ collectors: [] });
    }

    const userIds = profiles.map((p) => p.userId);

    // Aggregate vault values per user in one query
    const aggs = await prisma.item.groupBy({
      by:    ["userId"],
      where: { userId: { in: userIds }, status: { not: "TRADED" } },
      _sum:  { estimatedValue: true },
      _count: { id: true },
    });
    const aggMap: Record<string, { value: number; count: number }> = {};
    for (const a of aggs) {
      aggMap[a.userId] = { value: a._sum.estimatedValue ?? 0, count: a._count.id };
    }

    const collectors = profiles
      .map((p) => {
        const displayName = p.name.trim() || "Collector";
        // Use the DB handle if the user has set one; otherwise derive from name.
        // This ensures handle changes don't lose the user's vault/inventory/achievements.
        let handle: string;
        if (p.handle) {
          handle = p.handle;
        } else {
          handle = displayName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
          if (handle.length < 2) handle = `user_${p.userId.replace(/-/g, "").slice(0, 8)}`;
        }
        // Collector joined within the last 3 days → flag as "new"
        const joinedMsAgo = Date.now() - new Date(p.createdAt).getTime();
        const isNew = joinedMsAgo < 3 * 24 * 60 * 60 * 1000;
        return {
          id:                  p.userId,
          name:                displayName,
          handle,
          avatar:              p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.userId)}&backgroundColor=b6e3f4,c0aede,ffd5dc`,
          categories:          p.interests          ?? [],
          paymentMethods:      p.paymentMethods     ?? [],
          shippingPreferences: p.shippingPreferences ?? [],
          collectionValue:     aggMap[p.userId]?.value ?? 0,
          itemCount:           aggMap[p.userId]?.count ?? 0,
          trades:              0,
          trustScore:          0,
          online:              false,
          isPro:               false, // tier lives in session JWT; default false for directory
          isNew,
        };
      })
      .filter((c) => {
        if (category.trim() && !c.categories.some((i) => i.toLowerCase().includes(category.toLowerCase()))) return false;
        if (minValue > 0 && c.collectionValue < minValue) return false;
        if (proOnly && !c.isPro) return false;
        return true;
      });

    return Response.json({ collectors });
  } catch (err) {
    console.error("[GET /api/users]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
