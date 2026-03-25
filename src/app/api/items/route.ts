import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { checkUserAchievements } from "@/lib/checkUserAchievements";

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
      title:           string;
      category:        string;
      imageUrl?:       string;
      estimatedValue?: number;
      upForTrade?:     boolean;
      description?:    string;
      status?:         string;
    };

    if (!body.title) {
      return Response.json({ error: "title is required" }, { status: 400 });
    }

    // ── Free tier vault limit ─────────────────────────────────────────────
    if (session.user.tier !== "pro") {
      const existingCount = await prisma.item.count({
        where: { userId: session.user.id, status: { not: "TRADED" } },
      });
      if (existingCount >= 10) {
        return Response.json(
          { error: "Free tier vault limit reached. Upgrade to Pro for unlimited items.", code: "UPGRADE_REQUIRED" },
          { status: 403 },
        );
      }
    }

    const category = body.category || "Other";
    const imageUrl = body.imageUrl ?? "";

    const item = await prisma.item.create({
      data: {
        userId:         session.user.id,
        title:          body.title,
        category,
        imageUrl,
        estimatedValue: body.estimatedValue ?? null,
        upForTrade:     body.upForTrade     ?? false,
        description:    body.description    ?? "",
        status:         body.status         ?? "VAULT",
      },
    });

    // If the image is a public URL (not a base64 data URI), also publish to the
    // MarketItem pool so this item can appear in Discover / Trending Grails for others.
    if (imageUrl.startsWith("http")) {
      prisma.marketItem.upsert({
        where:  { ebayId: `user-${item.id}` },
        create: {
          ebayId:   `user-${item.id}`,
          title:    item.title,
          imageUrl: item.imageUrl,
          price:    item.estimatedValue ?? 0,
          category: item.category,
        },
        update: {
          title:    item.title,
          imageUrl: item.imageUrl,
          price:    item.estimatedValue ?? 0,
        },
      }).catch(() => {}); // fire-and-forget — don't let feed publishing fail the vault save
    }

    // Run achievement engine (fire and return results)
    const newAchievements = await checkUserAchievements(
      session.user.id,
      imageUrl.startsWith("http") ? { name: item.title, imageUrl: item.imageUrl } : undefined,
    );

    return Response.json({ item, newAchievements }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/items]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/items?id=xxx — update estimatedValue / upForTrade of an owned item
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return Response.json({ error: "id required" }, { status: 400 });

    const body = await request.json() as {
      estimatedValue?: number | null;
      upForTrade?: boolean;
      status?: string;
    };

    const item = await prisma.item.updateMany({
      where: { id, userId: session.user.id },
      data: {
        ...(body.estimatedValue !== undefined && { estimatedValue: body.estimatedValue }),
        ...(body.upForTrade    !== undefined && { upForTrade: body.upForTrade }),
        ...(body.status        !== undefined && { status: body.status }),
      },
    });

    const newAchievements = await checkUserAchievements(session.user.id);
    return Response.json({ item, newAchievements });
  } catch (err) {
    console.error("[PATCH /api/items]", err);
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

    // Re-check achievements after deletion (value may have changed)
    await checkUserAchievements(session.user.id);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/items]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
