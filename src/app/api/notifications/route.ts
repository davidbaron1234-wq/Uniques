import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

// GET /api/notifications — fetch current user's notifications (newest first)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take:    50,
    });

    return Response.json({ notifications });
  } catch (err) {
    console.error("[GET /api/notifications]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/notifications — create a notification for the current user
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      message: string;
      type?:   string;
      href?:   string;
    };

    if (!body.message) {
      return Response.json({ error: "message is required" }, { status: 400 });
    }
    if (body.message.length > 500) {
      return Response.json({ error: "Message must be 500 characters or fewer" }, { status: 400 });
    }

    const notification = await prisma.notification.create({
      data: {
        userId:  session.user.id,
        message: body.message,
        type:    body.type ?? "achievement",
        href:    body.href ?? null,
      },
    });

    return Response.json({ notification }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/notifications]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/notifications — mark as read (all or specific ids)
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as { all?: boolean; ids?: string[] };

    if (body.all) {
      await prisma.notification.updateMany({
        where:  { userId: session.user.id, isRead: false },
        data:   { isRead: true },
      });
    } else if (body.ids?.length) {
      await prisma.notification.updateMany({
        where:  { userId: session.user.id, id: { in: body.ids } },
        data:   { isRead: true },
      });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/notifications]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
