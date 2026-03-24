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

    return Response.json(messages);
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
