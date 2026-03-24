/**
 * GET /api/feed/following
 *
 * Returns Activity records from users the current user follows,
 * enriched with profile info and live like/comment counts.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  void req; // no query params needed
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Who does the current user follow?
  const follows = await prisma.follow.findMany({
    where:  { followerId: session.user.id },
    select: { followingId: true },
  });

  const followingIds = follows.map((f) => f.followingId);

  if (followingIds.length === 0) {
    return NextResponse.json({ events: [], followingCount: 0 });
  }

  // Fetch their recent activities
  const activities = await prisma.activity.findMany({
    where:   { userId: { in: followingIds } },
    orderBy: { createdAt: "desc" },
    take:    50,
  });

  const activityIds = activities.map((a) => a.id);

  // Profiles + like counts + current user's likes in parallel
  const [profiles, likeCounts, userLikes] = await Promise.all([
    prisma.profile.findMany({
      where:  { userId: { in: followingIds } },
      select: { userId: true, name: true, avatar: true },
    }),
    prisma.like.groupBy({
      by:    ["targetId"],
      where: { targetId: { in: activityIds } },
      _count: { id: true },
    }),
    prisma.like.findMany({
      where:  { userId: session.user.id, targetId: { in: activityIds } },
      select: { targetId: true },
    }),
  ]);

  const profileMap  = Object.fromEntries(profiles.map((p) => [p.userId, p]));
  const likeMap     = Object.fromEntries(likeCounts.map((lc) => [lc.targetId, lc._count.id]));
  const likedSet    = new Set(userLikes.map((l) => l.targetId));

  const events = activities.map((a) => {
    const profile = profileMap[a.userId];
    return {
      id:          a.id,
      userId:      a.userId,
      userName:    profile?.name   ?? "Collector",
      userAvatar:  profile?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.userId}`,
      userHandle:  a.userId,
      type:        a.type,
      title:       a.title,
      imageUrl:    a.imageUrl,
      createdAt:   a.createdAt,
      metadata:    a.metadata,
      likes:       likeMap[a.id] ?? 0,
      isLiked:     likedSet.has(a.id),
    };
  });

  return NextResponse.json({ events, followingCount: follows.length });
}
