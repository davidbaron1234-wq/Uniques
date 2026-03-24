import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

// GET /api/items — fetch items
// ?userId=me  → current user's items only
// ?category=  → filter by category
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");
    const category    = searchParams.get("category");

    const items = await prisma.item.findMany({
      where: {
        ...(userIdParam === "me" && { userId: session.user.id }),
        ...(category && { category }),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return Response.json({ items });
  } catch (err) {
    console.error("[GET /api/items]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/items — create an item
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      title:          string;
      category:       string;
      imageUrl?:      string;
      estimatedValue?: number;
      upForTrade?:    boolean;
      description?:   string;
    };

    if (!body.title || !body.category) {
      return Response.json({ error: "title and category are required" }, { status: 400 });
    }

    const item = await prisma.item.create({
      data: {
        userId:         session.user.id,
        title:          body.title,
        category:       body.category,
        imageUrl:       body.imageUrl      ?? "",
        estimatedValue: body.estimatedValue ?? null,
        upForTrade:     body.upForTrade    ?? false,
        description:    body.description   ?? "",
      },
    });

    return Response.json({ item }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/items]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/items?id=xxx — remove an item owned by current user
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return Response.json({ error: "id required" }, { status: 400 });

    await prisma.item.deleteMany({
      where: { id, userId: session.user.id },
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/items]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
