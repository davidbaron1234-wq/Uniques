export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

// GET /api/reviews?userId=xxx — fetch all reviews for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId")?.trim();

    if (!userId) {
      return Response.json({ error: "userId required" }, { status: 400 });
    }

    const reviews = await prisma.review.findMany({
      where:   { recipientId: userId },
      orderBy: { createdAt: "desc" },
      take:    100,
    });

    return Response.json({ reviews });
  } catch (err) {
    console.error("[GET /api/reviews]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/reviews — create or update a review
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      recipientId?: string;
      rating?:      number;
      comment?:     string;
    };

    if (!body.recipientId || !body.rating) {
      return Response.json({ error: "recipientId and rating required" }, { status: 400 });
    }

    if (body.recipientId === session.user.id) {
      return Response.json({ error: "Cannot review yourself" }, { status: 400 });
    }

    if (body.rating < 1 || body.rating > 5) {
      return Response.json({ error: "Rating must be 1–5" }, { status: 400 });
    }
    if (body.comment && body.comment.length > 1000) {
      return Response.json({ error: "Comment must be 1000 characters or fewer" }, { status: 400 });
    }

    // Fetch author's profile for display name + avatar
    const authorProfile = await prisma.profile.findUnique({
      where:  { userId: session.user.id },
      select: { name: true, avatar: true },
    });

    const review = await prisma.review.upsert({
      where: {
        authorId_recipientId: {
          authorId:    session.user.id,
          recipientId: body.recipientId,
        },
      },
      create: {
        authorId:    session.user.id,
        recipientId: body.recipientId,
        rating:      body.rating,
        comment:     body.comment?.trim() ?? "",
        authorName:  authorProfile?.name?.trim() || session.user.name || "Collector",
        authorAvatar: authorProfile?.avatar || "",
      },
      update: {
        rating:  body.rating,
        comment: body.comment?.trim() ?? "",
      },
    });

    return Response.json({ review }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/reviews]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/reviews?recipientId=xxx — delete the caller's review for that user
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recipientId = searchParams.get("recipientId")?.trim();

    if (!recipientId) {
      return Response.json({ error: "recipientId required" }, { status: 400 });
    }

    await prisma.review.deleteMany({
      where: { authorId: session.user.id, recipientId },
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/reviews]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
