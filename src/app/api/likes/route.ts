import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

// GET ?targetId=xxx → { count, isLiked }
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get("targetId");
  if (!targetId) return NextResponse.json({ error: "targetId required" }, { status: 400 });

  const [count, myLike] = await Promise.all([
    prisma.like.count({ where: { targetId } }),
    prisma.like.findUnique({
      where: { userId_targetId: { userId: session.user.id, targetId } },
    }),
  ]);

  return NextResponse.json({ count, isLiked: !!myLike });
}

// POST { targetId, targetType? } → like
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetId, targetType = "activity" } = await req.json() as { targetId: string; targetType?: string };
  if (!targetId) return NextResponse.json({ error: "targetId required" }, { status: 400 });

  await prisma.like.upsert({
    where:  { userId_targetId: { userId: session.user.id, targetId } },
    create: { userId: session.user.id, targetId, targetType },
    update: {},
  });

  const count = await prisma.like.count({ where: { targetId } });

  // Notify the activity owner if we can find them (fire-and-forget)
  prisma.activity.findUnique({ where: { id: targetId }, select: { userId: true, title: true } })
    .then(async (activity) => {
      if (!activity || activity.userId === session.user.id) return;
      await prisma.notification.create({
        data: {
          userId:  activity.userId,
          message: `${session.user.name ?? "Someone"} liked your post: "${activity.title.slice(0, 50)}".`,
          type:    "match",
          href:    "/",
        },
      });
    })
    .catch(() => {});

  return NextResponse.json({ count, liked: true });
}

// DELETE ?targetId=xxx → unlike
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get("targetId");
  if (!targetId) return NextResponse.json({ error: "targetId required" }, { status: 400 });

  await prisma.like.deleteMany({
    where: { userId: session.user.id, targetId },
  });

  const count = await prisma.like.count({ where: { targetId } });
  return NextResponse.json({ count, liked: false });
}
