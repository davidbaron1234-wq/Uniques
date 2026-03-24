import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get("userId");
  const list     = searchParams.get("list"); // "followers" | "following"

  if (list === "following") {
    const follows = await prisma.follow.findMany({
      where: { followerId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ follows });
  }

  if (list === "followers") {
    const follows = await prisma.follow.findMany({
      where: { followingId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ follows });
  }

  if (targetId) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: session.user.id, followingId: targetId } },
    });
    const followerCount = await prisma.follow.count({ where: { followingId: targetId } });
    return NextResponse.json({ isFollowing: !!follow, followerCount });
  }

  return NextResponse.json({ error: "userId or list required" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { followingId } = await req.json() as { followingId: string };
  if (!followingId) return NextResponse.json({ error: "followingId required" }, { status: 400 });
  if (followingId === session.user.id) return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });

  await prisma.follow.upsert({
    where:  { followerId_followingId: { followerId: session.user.id, followingId } },
    create: { followerId: session.user.id, followingId },
    update: {},
  });

  // Notify the followed user (fire-and-forget)
  prisma.notification.create({
    data: {
      userId:  followingId,
      message: `${session.user.name ?? "Someone"} started following you.`,
      type:    "match",
      href:    "/",
    },
  }).catch(() => {});

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const followingId = searchParams.get("userId");
  if (!followingId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  await prisma.follow.deleteMany({
    where: { followerId: session.user.id, followingId },
  });

  return NextResponse.json({ success: true });
}
