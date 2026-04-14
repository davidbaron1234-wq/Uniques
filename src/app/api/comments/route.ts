import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

// GET ?targetId=xxx → { comments }
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get("targetId");
  if (!targetId) return NextResponse.json({ error: "targetId required" }, { status: 400 });

  const comments = await prisma.comment.findMany({
    where:   { targetId },
    orderBy: { createdAt: "desc" },
    take:    50,
  });

  return NextResponse.json({ comments });
}

// POST { targetId, text, targetType? } → comment
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetId, text, targetType = "activity" } = await req.json() as {
    targetId: string; text: string; targetType?: string;
  };
  if (!targetId || !text?.trim()) return NextResponse.json({ error: "targetId and text required" }, { status: 400 });
  if (text.length > 500) return NextResponse.json({ error: "Comment must be 500 characters or fewer" }, { status: 400 });

  // Load avatar from Profile
  const profile = await prisma.profile.findUnique({
    where:  { userId: session.user.id },
    select: { avatar: true },
  });

  const comment = await prisma.comment.create({
    data: {
      userId:       session.user.id,
      targetId,
      targetType,
      text:         text.trim(),
      authorName:   session.user.name ?? "Collector",
      authorAvatar: profile?.avatar ?? "",
    },
  });

  // Notify the activity owner (fire-and-forget)
  prisma.activity.findUnique({ where: { id: targetId }, select: { userId: true, title: true } })
    .then(async (activity) => {
      if (!activity || activity.userId === session.user.id) return;
      await prisma.notification.create({
        data: {
          userId:  activity.userId,
          message: `${session.user.name ?? "Someone"} commented on your post: "${activity.title.slice(0, 40)}".`,
          type:    "trade",
          href:    "/",
        },
      });
    })
    .catch(() => {});

  return NextResponse.json({ comment }, { status: 201 });
}

// DELETE ?id=xxx → delete own comment
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.comment.deleteMany({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
