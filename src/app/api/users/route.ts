import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

// GET /api/users — collector directory for the Explore tab
// ?search=    filter by name (case-insensitive)
// ?category=  filter by profile interest category
// ?minValue=  minimum vault value (sum of non-traded items)
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

    const profiles = await prisma.profile.findMany({
      where: {
        userId: { not: session.user.id }, // exclude self
        ...(search.trim() && {
          name: { contains: search, mode: "insensitive" },
        }),
        ...(category.trim() && {
          interests: { has: category },
        }),
      },
      take: 60,
      orderBy: { createdAt: "desc" },
    });

    if (profiles.length === 0) {
      return Response.json({ collectors: [] });
    }

    // Aggregate vault values per user in one query
    const userIds = profiles.map((p) => p.userId);
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
      .map((p) => ({
        id:              p.userId,
        name:            p.name || "Collector",
        handle:          (p.name || "collector").toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
        avatar:          p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.name || p.userId)}&backgroundColor=b6e3f4,c0aede,ffd5dc`,
        categories:      p.interests,
        collectionValue: aggMap[p.userId]?.value  ?? 0,
        itemCount:       aggMap[p.userId]?.count  ?? 0,
        trades:          0,
        trustScore:      4.5,
        online:          false,
      }))
      .filter((c) => minValue === 0 || c.collectionValue >= minValue);

    return Response.json({ collectors });
  } catch (err) {
    console.error("[GET /api/users]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
