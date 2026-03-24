import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? session.user.id;
  const type   = searchParams.get("type") ?? undefined;

  const activities = await prisma.activity.findMany({
    where: { userId, ...(type ? { type } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Hydrate poster's profile (real name + avatar from DB)
  const profile = await prisma.profile.findUnique({
    where:  { userId },
    select: { name: true, avatar: true },
  });

  // Like counts + whether the requesting user liked each post
  const ids = activities.map((a) => a.id);
  const [likeCounts, userLikes] = await Promise.all([
    prisma.like.groupBy({
      by:    ["targetId"],
      where: { targetId: { in: ids } },
      _count: { id: true },
    }),
    prisma.like.findMany({
      where:  { userId: session.user.id, targetId: { in: ids } },
      select: { targetId: true },
    }),
  ]);

  const likeMap  = Object.fromEntries(likeCounts.map((lc) => [lc.targetId, lc._count.id]));
  const likedSet = new Set(userLikes.map((l) => l.targetId));

  const enriched = activities.map((a) => ({
    id:          a.id,
    type:        a.type,
    title:       a.title,
    imageUrl:    a.imageUrl,
    createdAt:   a.createdAt,
    metadata:    a.metadata,
    // Poster profile
    userName:    profile?.name   || session.user.name || "Collector",
    userAvatar:  profile?.avatar || "",
    // Social counts (always fresh from DB — no stale state on refresh)
    likes:       likeMap[a.id] ?? 0,
    isLiked:     likedSet.has(a.id),
  }));

  return NextResponse.json({ activities: enriched });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    type: string; title: string; imageUrl?: string; itemId?: string; metadata?: Record<string, unknown>;
  };
  const { type, title, imageUrl, itemId, metadata } = body;

  if (!type || !title) return NextResponse.json({ error: "type and title required" }, { status: 400 });

  const activity = await prisma.activity.create({
    data: {
      userId:   session.user.id,
      type,
      title,
      imageUrl: imageUrl ?? "",
      itemId:   itemId  ?? null,
      metadata: metadata ? (metadata as import("@prisma/client").Prisma.InputJsonValue) : undefined,
    },
  });

  return NextResponse.json({ activity }, { status: 201 });
}
