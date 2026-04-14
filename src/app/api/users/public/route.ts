export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";

// Derives the URL handle from a display name — must match the logic in /api/users
function deriveHandle(name: string, userId: string): string {
  let handle = (name || "").toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  if (handle.length < 2) handle = `user_${userId.replace(/-/g, "").slice(0, 8)}`;
  return handle;
}

// GET /api/users/public?handle=xxx  OR  ?userId=xxx
// Public endpoint — returns a single user's profile + vault items.
// No auth required (profiles are public).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const handle  = (searchParams.get("handle") ?? "").toLowerCase().trim();
    const userId  = (searchParams.get("userId")  ?? "").trim();

    if (!handle && !userId) {
      return Response.json({ error: "handle or userId is required" }, { status: 400 });
    }

    let profile: Awaited<ReturnType<typeof prisma.profile.findUnique>> | null = null;

    if (userId) {
      // Direct userId lookup — always up-to-date regardless of handle changes
      profile = await prisma.profile.findUnique({ where: { userId } });
    } else {
      // Handle lookup: check stored handle first, then fall back to derived handle
      const byHandle = await prisma.profile.findFirst({ where: { handle } });
      if (byHandle) {
        profile = byHandle;
      } else {
        const profiles = await prisma.profile.findMany({ take: 500 });
        profile = profiles.find((p) => deriveHandle(p.name, p.userId) === handle) ?? null;
      }
    }

    if (!profile) {
      return Response.json({ found: false }, { status: 404 });
    }

    const [items, achievementRecords] = await Promise.all([
      prisma.item.findMany({
        where: { userId: profile.userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.userAchievement.findMany({
        where: { userId: profile.userId },
      }),
    ]);

    return Response.json({
      found: true,
      profile: {
        userId:              profile.userId,
        name:                profile.name,
        handle:              profile.handle ?? null,
        avatar:              profile.avatar,
        bio:                 profile.bio,
        interests:           profile.interests,
        pinnedItemIds:       profile.pinnedItemIds,
        paymentMethods:      profile.paymentMethods,
        shippingPreferences: profile.shippingPreferences,
        tier:                profile.tier ?? "free",
      },
      items: items.map((i) => ({
        id:             i.id,
        title:          i.title,
        category:       i.category,
        imageUrl:       i.imageUrl,
        estimatedValue: i.estimatedValue,
        upForTrade:     i.upForTrade,
      })),
      achievements: achievementRecords.map((a) => ({
        achievementId: a.achievementId,
        unlockedAt:    a.unlockedAt.toISOString(),
        catalystName:  a.catalystName  ?? null,
        catalystImage: a.catalystImage ?? null,
      })),
    });
  } catch (err) {
    console.error("[GET /api/users/public]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
