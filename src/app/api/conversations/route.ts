import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

// GET /api/conversations — list all conversations for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { userId: session.user.id } },
      },
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Live-join Profile so names/avatars are always current (never stale from participants table)
    const otherIds = conversations
      .map((c) => c.participants.find((p) => p.userId !== session.user.id)?.userId)
      .filter((id): id is string => !!id);
    const liveProfiles = await prisma.profile.findMany({
      where:  { userId: { in: otherIds } },
      select: { userId: true, name: true, avatar: true, handle: true },
    });
    const profileMap = new Map(liveProfiles.map((p) => [p.userId, p]));

    // Shape into a UI-friendly format
    const result = conversations.map((conv) => {
      const other = conv.participants.find((p) => p.userId !== session.user.id);
      const live  = other ? profileMap.get(other.userId) : null;
      const lastMsg = conv.messages[0] ?? null;
      const liveName = live?.name ?? other?.displayName ?? "Unknown";
      // Derive handle: prefer DB handle, fall back to name-based slug
      const liveHandle = live?.handle ?? (() => {
        const slug = liveName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
        return slug.length >= 2 ? slug : `user_${(other?.userId ?? "").replace(/-/g, "").slice(0, 8)}`;
      })();
      return {
        id:            conv.id,
        userId:        other?.userId ?? "",
        name:          liveName,
        handle:        liveHandle,
        avatarUrl:     live?.avatar  ?? other?.avatarUrl   ?? "",
        lastMessage:   lastMsg?.content   ?? "",
        lastMessageType: lastMsg?.type ?? "text",
        lastMessageAt: lastMsg?.createdAt ?? conv.createdAt,
        updatedAt:     conv.updatedAt,
      };
    });

    return Response.json(result);
  } catch (err) {
    console.error("[GET /api/conversations]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/conversations — find or create a conversation with another user
// Body: { recipientId: string, recipientName: string, recipientAvatar?: string }
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      recipientId:     string;
      recipientName:   string;
      recipientAvatar?: string;
    };

    if (!body.recipientId || !body.recipientName) {
      return Response.json({ error: "recipientId and recipientName required" }, { status: 400 });
    }

    if (body.recipientId === session.user.id) {
      return Response.json({ error: "Cannot message yourself" }, { status: 400 });
    }

    // Verify the recipient actually exists
    const recipientExists = await prisma.user.findUnique({
      where:  { id: body.recipientId },
      select: { id: true },
    });
    if (!recipientExists) {
      return Response.json({ error: "Recipient not found" }, { status: 404 });
    }

    // Find existing conversation between these two users
    const existing = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: session.user.id } } },
          { participants: { some: { userId: body.recipientId } } },
        ],
      },
      include: { participants: true },
    });

    if (existing) {
      return Response.json({ id: existing.id, isNew: false });
    }

    // Create new conversation with both participants
    const conv = await prisma.conversation.create({
      data: {
        participants: {
          create: [
            {
              userId:      session.user.id,
              displayName: session.user.name  ?? "You",
              avatarUrl:   session.user.image ?? "",
            },
            {
              userId:      body.recipientId,
              displayName: body.recipientName,
              avatarUrl:   body.recipientAvatar ?? "",
            },
          ],
        },
      },
    });

    return Response.json({ id: conv.id, isNew: true });
  } catch (err) {
    console.error("[POST /api/conversations]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
