export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

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

    // Fetch their vault items — userId is the source of truth for ownership.
    // status:"TRADED" items transferred to this user still belong to them
    // (userId was updated to the new owner on trade completion).
    // Look up tier via email: Profile.userId = Supabase UUID ≠ User.id = Prisma CUID.
    // We must resolve email via Supabase admin, then query Prisma by email.
    let userRecord: { tier: string } | null = null;
    try {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(profile.userId);
      const email = authData?.user?.email;
      if (email) {
        userRecord = await prisma.user.findUnique({ where: { email }, select: { tier: true } });
      }
    } catch {
      // Non-fatal: fall back to "free" if admin lookup fails (missing key, etc.)
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
        tier:                userRecord?.tier ?? "free",
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
