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

  return NextResponse.json({ activities });
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
