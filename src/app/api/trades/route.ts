import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { checkUserAchievements } from "@/lib/checkUserAchievements";

// ── POST /api/trades — propose a trade ────────────────────────────────────────
// Creates the Trade record and locks the proposer's DB items (→ IN_TRADE).
// offerData JSON holds the full display snapshot so the Trade is self-contained.
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      proposerItemIds?: string[];
      offerData?: Record<string, unknown>;
    };

    const proposerItemIds = body.proposerItemIds ?? [];

    const trade = await prisma.trade.create({
      data: {
        proposerId:      session.user.id,
        proposerItemIds,
        offerData:       (body.offerData ?? {}) as import("@prisma/client").Prisma.InputJsonValue,
        status:          "pending",
      },
    });

    // Lock proposer's items in DB so they can't be double-offered
    if (proposerItemIds.length > 0) {
      await prisma.item.updateMany({
        where: { id: { in: proposerItemIds }, userId: session.user.id },
        data:  { status: "IN_TRADE" },
      });
    }

    return Response.json({ trade }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/trades]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── GET /api/trades — list the current user's pending trades ──────────────────
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trades = await prisma.trade.findMany({
      where:   { proposerId: session.user.id },
      orderBy: { createdAt: "desc" },
      take:    50,
    });

    return Response.json({ trades });
  } catch (err) {
    console.error("[GET /api/trades]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── PATCH /api/trades?id=xxx&action=complete|decline ─────────────────────────
// complete: mark items TRADED + post social Activity + run achievement engine
// decline:  revert items to VAULT
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id     = searchParams.get("id");
    const action = searchParams.get("action"); // "complete" | "decline"

    if (!id || !action) {
      return Response.json({ error: "id and action required" }, { status: 400 });
    }

    const trade = await prisma.trade.findFirst({
      where: { id, proposerId: session.user.id },
    });
    if (!trade) {
      return Response.json({ error: "Trade not found" }, { status: 404 });
    }

    // ── Decline ──────────────────────────────────────────────────────────────
    if (action === "decline") {
      await prisma.trade.update({ where: { id }, data: { status: "declined" } });

      // Release the locked items back to VAULT
      if (trade.proposerItemIds.length > 0) {
        await prisma.item.updateMany({
          where: { id: { in: trade.proposerItemIds } },
          data:  { status: "VAULT" },
        });
      }

      return Response.json({ ok: true });
    }

    // ── Complete ─────────────────────────────────────────────────────────────
    if (action === "complete") {
      const now = new Date();

      await prisma.trade.update({
        where: { id },
        data:  { status: "completed", completedAt: now },
      });

      // Mark proposer's items as permanently traded
      if (trade.proposerItemIds.length > 0) {
        await prisma.item.updateMany({
          where: { id: { in: trade.proposerItemIds } },
          data:  { status: "TRADED" },
        });
      }

      // Post to social Activity feed — "You and X just completed a trade!"
      const offerData  = trade.offerData as Record<string, unknown>;
      const toUser     = offerData?.toUser as { name?: string } | undefined;
      const fromItems  = offerData?.fromItems as Array<{ name?: string; imageUrl?: string; estimatedValue?: number }> | undefined;
      const toItems    = offerData?.toItems  as Array<{ name?: string; imageUrl?: string; estimatedValue?: number }> | undefined;
      const tradeValue = [
        ...(fromItems ?? []),
        ...(toItems   ?? []),
      ].reduce((s, i) => s + (i.estimatedValue ?? 0), 0);
      const toName     = toUser?.name ?? "another collector";
      const heroImage  = fromItems?.[0]?.imageUrl ?? toItems?.[0]?.imageUrl ?? "";

      prisma.activity.create({
        data: {
          userId:   session.user.id,
          type:     "trade_completed",
          title:    `Completed a trade with ${toName}`,
          imageUrl: heroImage,
          metadata: {
            tradeId:    id,
            tradeValue,
            counterparty: toName,
            itemNames: (fromItems?.map((i) => i.name).filter((n): n is string => Boolean(n)).slice(0, 3) ?? []) as string[],
          },
        },
      }).catch(() => {});

      // Run server-side achievement checks (heavyweight, curator, etc.)
      const newAchievements = await checkUserAchievements(session.user.id);

      return Response.json({ ok: true, newAchievements });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[PATCH /api/trades]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
