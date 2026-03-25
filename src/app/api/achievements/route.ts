import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { ACHIEVEMENT_META } from "@/lib/checkUserAchievements";

// GET /api/achievements — returns the current user's unlocked achievements from DB
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const records = await prisma.userAchievement.findMany({
      where: { userId: session.user.id },
    });
    return Response.json({ achievements: records });
  } catch (err) {
    console.error("[GET /api/achievements]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/achievements/unlock — idempotent client-triggered unlock
// Creates UserAchievement + Activity record. Never duplicates.
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      achievementId: string;
      catalystName?:  string;
      catalystImage?: string;
    };
    if (!body.achievementId) {
      return Response.json({ error: "achievementId required" }, { status: 400 });
    }

    const userId = session.user.id;

    // Idempotent guard
    const existing = await prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId: body.achievementId } },
    });
    if (existing) return Response.json({ isNew: false });

    await prisma.userAchievement.create({
      data: {
        userId,
        achievementId: body.achievementId,
        catalystName:  body.catalystName  ?? null,
        catalystImage: body.catalystImage ?? null,
      },
    });

    // Post to social "My Activity" feed
    const meta = ACHIEVEMENT_META[body.achievementId];
    if (meta) {
      prisma.activity.create({
        data: {
          userId,
          type:     "achievement_unlocked",
          title:    `Unlocked: ${meta.title}`,
          imageUrl: body.catalystImage ?? "",
          metadata: { achievementId: body.achievementId, description: meta.description },
        },
      }).catch(() => {});
    }

    return Response.json({ isNew: true });
  } catch (err) {
    console.error("[POST /api/achievements]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
