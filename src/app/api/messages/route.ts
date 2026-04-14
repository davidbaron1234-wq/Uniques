import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

// GET /api/messages?conversationId=xxx — fetch messages for a conversation
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    if (!conversationId) {
      return Response.json({ error: "conversationId required" }, { status: 400 });
    }

    // Verify the current user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: session.user.id } },
    });
    if (!participant) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where:   { conversationId },
      orderBy: { createdAt: "asc" },
    });

    // Live-join Profile so senderName is always current (never stale from stored message field)
    const senderSet = new Set<string>(messages.map((m) => m.senderId));
    const senderIds = Array.from(senderSet);
    const liveProfiles = await prisma.profile.findMany({
      where:  { userId: { in: senderIds } },
      select: { userId: true, name: true, avatar: true },
    });
    const profileMap = new Map(liveProfiles.map((p) => [p.userId, p]));

    return Response.json(messages.map((m) => {
      const liveProfile = profileMap.get(m.senderId);
      const liveName    = liveProfile?.name ?? m.senderName;

      // For trade-offer messages, also stamp the live sender name into metadata.proposer
      // so the chat bubble never shows "undefined proposed a trade"
      let metadata = m.metadata;
      if (m.type === "trade-offer" && liveName) {
        const meta = m.metadata as Record<string, unknown> | null;
        if (meta) {
          metadata = { ...meta, proposer: liveName } as typeof m.metadata;
        }
      }

      return { ...m, senderName: liveName, metadata };
    }));
  } catch (err) {
    console.error("[GET /api/messages]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/messages — send a message
// Body: { conversationId, content, type?, metadata? }
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      conversationId: string;
      content:        string;
      type?:          string;
      metadata?:      unknown;
    };

    if (!body.conversationId || !body.content) {
      return Response.json({ error: "conversationId and content required" }, { status: 400 });
    }
    if (typeof body.content !== "string" || body.content.length > 2000) {
      return Response.json({ error: "Message content must be 2000 characters or fewer" }, { status: 400 });
    }

    // Verify the current user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: body.conversationId, userId: session.user.id } },
    });
    if (!participant) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: body.conversationId,
          senderId:       session.user.id,
          senderName:     session.user.name ?? "User",
          content:        body.content,
          type:           body.type     ?? "text",
          metadata:       body.metadata ?? undefined,
        },
      }),
      // Bump conversation updatedAt so it floats to the top of inbox
      prisma.conversation.update({
        where: { id: body.conversationId },
        data:  { updatedAt: new Date() },
      }),
    ]);

    return Response.json(message, { status: 201 });
  } catch (err) {
    console.error("[POST /api/messages]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
