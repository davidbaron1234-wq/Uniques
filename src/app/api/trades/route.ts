import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { checkUserAchievements, checkHighRoller } from "@/lib/checkUserAchievements";
import { runAchievementEngine } from "@/lib/achievementEngine";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { snapshotUserPortfolio } from "@/lib/marketSnapshots";

// ── Shared helper: inject a message into an existing conversation thread ───────
// Fire-and-forget: if no conversation exists yet, silently skips.
async function injectChatMessage(opts: {
  proposerId:  string;
  recipientId: string;
  senderId:    string;
  senderName:  string;
  type:        "trade-offer" | "system";
  content:     string;
  metadata:    Record<string, unknown>;
}): Promise<void> {
  try {
    const conv = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: opts.proposerId  } } },
          { participants: { some: { userId: opts.recipientId } } },
        ],
      },
    });
    if (!conv) return;
    await prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId:       opts.senderId,
        senderName:     opts.senderName,
        content:        opts.content,
        type:           opts.type,
        metadata:       opts.metadata as Prisma.InputJsonValue,
      },
    });
    await prisma.conversation.update({ where: { id: conv.id }, data: { updatedAt: new Date() } });
  } catch (err) {
    console.error("[injectChatMessage] non-fatal:", err);
  }
}

// ── POST /api/trades — propose a trade ────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      proposerItemIds?: string[];
      offerData?: Record<string, unknown>;
      recipientId?: string;
    };

    const proposerItemIds = body.proposerItemIds ?? [];
    const recipientId     = body.recipientId ?? null;

    const proposerProfile = await prisma.profile.findUnique({
      where:  { userId: session.user.id },
      select: { name: true, avatar: true },
    });

    const proposerName   = proposerProfile?.name?.trim() || session.user.name || "Collector";
    const proposerAvatar = proposerProfile?.avatar || session.user.image || "";

    const enrichedOfferData = {
      ...(body.offerData ?? {}),
      fromUser: {
        id:     session.user.id,
        name:   proposerName,
        avatar: proposerAvatar,
      },
    };

    const trade = await prisma.trade.create({
      data: {
        proposerId:       session.user.id,
        recipientId:      recipientId ?? undefined,
        proposerItemIds,
        offerData:        enrichedOfferData as import("@prisma/client").Prisma.InputJsonValue,
        status:           "pending",
        actionRequiredBy: recipientId ?? undefined,
      },
    });

    if (proposerItemIds.length > 0) {
      await prisma.item.updateMany({
        where: { id: { in: proposerItemIds }, userId: session.user.id },
        data:  { status: "IN_TRADE" },
      });
    }

    if (recipientId && recipientId !== session.user.id) {
      // ── 1. Notify recipient ──────────────────────────────────────────────
      prisma.notification.create({
        data: {
          userId:  recipientId,
          type:    "trade",
          message: `${proposerName} sent you a trade offer`,
          href:    "/history",
        },
      }).catch(() => {});

      // ── 2. Auto-create conversation + inject trade-offer message ─────────
      // Runs in the background so it never delays the trade creation response.
      const proposerId       = session.user.id; // capture before async closure
      const offerDataSnapshot = enrichedOfferData;
      ;(async () => {
        try {
          const recipientProfile = await prisma.profile.findUnique({
            where:  { userId: recipientId },
            select: { name: true, avatar: true },
          });
          const recipientName   = recipientProfile?.name?.trim() || "Collector";
          const recipientAvatar = recipientProfile?.avatar || "";

          // Find or create a 1-on-1 conversation
          const existing = await prisma.conversation.findFirst({
            where: {
              AND: [
                { participants: { some: { userId: proposerId } } },
                { participants: { some: { userId: recipientId } } },
              ],
            },
          });

          let convId: string;
          if (existing) {
            convId = existing.id;
          } else {
            const conv = await prisma.conversation.create({
              data: {
                participants: {
                  create: [
                    { userId: proposerId,  displayName: proposerName,   avatarUrl: proposerAvatar },
                    { userId: recipientId, displayName: recipientName,  avatarUrl: recipientAvatar },
                  ],
                },
              },
            });
            convId = conv.id;
          }

          // Inject the trade offer as a chat message (EmbeddedTradeOffer format)
          const offerDataRec  = offerDataSnapshot as Record<string, unknown>;
          const fromItemsSnap = (offerDataRec.fromItems ?? []) as Array<{ name?: string; imageUrl?: string }>;
          const toItemsSnap   = (offerDataRec.toItems   ?? []) as Array<{ name?: string; imageUrl?: string }>;
          const chatMeta = {
            proposer:      proposerName,
            offeredItem:   fromItemsSnap[0]?.name ? { name: fromItemsSnap[0].name, imageUrl: fromItemsSnap[0].imageUrl } : undefined,
            requestedItem: toItemsSnap[0]?.name   ? { name: toItemsSnap[0].name,   imageUrl: toItemsSnap[0].imageUrl   } : undefined,
            fromCash:  (offerDataRec.fromCash as number) ?? 0,
            toCash:    (offerDataRec.toCash   as number) ?? 0,
            isCounter: false,
            tradeId:   trade.id,
          };
          await prisma.message.create({
            data: {
              conversationId: convId,
              senderId:       proposerId,
              senderName:     proposerName,
              content:        "Trade proposal",
              type:           "trade-offer",
              metadata:       chatMeta as Prisma.InputJsonValue,
            },
          });

          // Bump conversation updatedAt so it sorts to top of inbox
          await prisma.conversation.update({
            where: { id: convId },
            data:  { updatedAt: new Date() },
          });
        } catch (convErr) {
          console.error("[POST /api/trades] conversation creation failed (non-fatal)", convErr);
        }
      })();
    }

    // ── Trade proposal achievements ──────────────────────────────────────────
    const od = body.offerData as Record<string, unknown> | undefined;
    const fiVal = ((od?.fromItems ?? []) as Array<{ estimatedValue?: number }>)
      .reduce((s, i) => s + (i.estimatedValue ?? 0), 0);
    const tiVal = ((od?.toItems   ?? []) as Array<{ estimatedValue?: number }>)
      .reduce((s, i) => s + (i.estimatedValue ?? 0), 0);
    const totalOfferValue = fiVal + tiVal + ((od?.fromCash as number) ?? 0) + ((od?.toCash as number) ?? 0);

    // Proposer: first-offer, high-roller
    runAchievementEngine("trade.proposed", session.user.id, { tradeValue: totalOfferValue }).catch(() => {});

    // Recipient: popular-vault (receives offer)
    if (recipientId) {
      runAchievementEngine("trade.proposed", recipientId, { tradeValue: totalOfferValue, isRecipient: true }).catch(() => {});
    }

    return Response.json({ trade }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/trades]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── GET /api/trades ───────────────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uid = session.user.id;

    const trades = await prisma.trade.findMany({
      where: {
        OR: [
          { proposerId: uid },
          { recipientId: uid },
        ],
      },
      orderBy: { createdAt: "desc" },
      take:    100,
    });

    // Live-join Profile so names/avatars are always current (never stale from offerData JSON)
    const involvedSet = new Set<string>();
    trades.forEach((t) => {
      involvedSet.add(t.proposerId);
      if (t.recipientId) involvedSet.add(t.recipientId);
    });
    const involvedIds = Array.from(involvedSet);
    const liveProfiles = await prisma.profile.findMany({
      where:  { userId: { in: involvedIds } },
      select: { userId: true, name: true, avatar: true },
    });
    const profileMap = new Map(liveProfiles.map((p) => [p.userId, p]));

    const tagged = trades.map((t) => {
      const od            = (t.offerData ?? {}) as Record<string, unknown>;
      const proposerLive  = profileMap.get(t.proposerId);
      const recipientLive = t.recipientId ? profileMap.get(t.recipientId) : null;

      const enrichedOd = {
        ...od,
        fromUser: {
          ...(od.fromUser as Record<string, unknown> ?? {}),
          ...(proposerLive  ? { name: proposerLive.name,  avatar: proposerLive.avatar  } : {}),
        },
        ...(recipientLive ? {
          toUser: {
            ...(od.toUser as Record<string, unknown> ?? {}),
            name:   recipientLive.name,
            avatar: recipientLive.avatar,
          },
        } : {}),
      };

      return {
        ...t,
        offerData:            enrichedOd,
        isSender:             t.proposerId === uid,
        isActionRequired:     t.actionRequiredBy === uid,
        currentUserConfirmed: (t.completionConfirmedBy ?? []).includes(uid),
      };
    });

    return Response.json({ trades: tagged });
  } catch (err) {
    console.error("[GET /api/trades]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── PATCH /api/trades?id=xxx&action=accept|decline|cancel|edit|complete ───────
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id     = searchParams.get("id");
    const action = searchParams.get("action");

    if (!id || !action) {
      return Response.json({ error: "id and action required" }, { status: 400 });
    }

    const trade = await prisma.trade.findFirst({ where: { id } });
    if (!trade) {
      return Response.json({ error: "Trade not found" }, { status: 404 });
    }

    const uid         = session.user.id;
    const isProposer  = trade.proposerId  === uid;
    const isRecipient = trade.recipientId === uid;

    if (!isProposer && !isRecipient) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Accept ────────────────────────────────────────────────────────────────
    // Authorized: the original recipient accepting, OR the proposer accepting
    // a recipient counter (when actionRequiredBy has flipped back to proposer).
    if (action === "accept") {
      const authorizedToAccept = isRecipient || (isProposer && trade.actionRequiredBy === uid);
      if (!authorizedToAccept) {
        return Response.json({ error: "Not authorized to accept this trade" }, { status: 403 });
      }

      const od = trade.offerData as Record<string, unknown>;

      if (isProposer) {
        // ── Proposer accepting recipient's counter ──────────────────────────
        const fromItems   = (od?.fromItems ?? []) as Array<{ id?: string }>;
        const fromItemIds = fromItems.map((i) => i.id).filter((x): x is string => !!x);
        const proposerLocked = fromItemIds.length > 0
          ? await prisma.item.findMany({ where: { id: { in: fromItemIds }, userId: uid }, select: { id: true } })
          : [];
        const newProposerItemIds = proposerLocked.map((i) => i.id);

        const toItems     = (od?.toItems ?? []) as Array<{ id?: string }>;
        const toItemIds   = toItems.map((i) => i.id).filter((x): x is string => !!x);
        const recipientLocked = toItemIds.length > 0 && trade.recipientId
          ? await prisma.item.findMany({ where: { id: { in: toItemIds }, userId: trade.recipientId }, select: { id: true } })
          : [];
        const newRecipientItemIds = recipientLocked.map((i) => i.id);

        await prisma.trade.update({
          where: { id },
          data: {
            status:           "accepted",
            proposerItemIds:  newProposerItemIds,
            recipientItemIds: newRecipientItemIds,
            actionRequiredBy: trade.proposerId,
          },
        });
        if (newProposerItemIds.length > 0) {
          await prisma.item.updateMany({ where: { id: { in: newProposerItemIds }, userId: uid }, data: { status: "IN_TRADE" } });
        }
        if (newRecipientItemIds.length > 0 && trade.recipientId) {
          await prisma.item.updateMany({ where: { id: { in: newRecipientItemIds }, userId: trade.recipientId }, data: { status: "IN_TRADE" } });
        }
        prisma.profile.findUnique({ where: { userId: uid }, select: { name: true } })
          .then((p) => prisma.notification.create({
            data: { userId: trade.recipientId!, type: "trade",
              message: `${p?.name?.trim() || "Someone"} accepted your counter offer — confirm delivery to complete`,
              href: "/history" },
          })).catch(() => {});

      } else {
        // ── Recipient accepting original offer ──────────────────────────────
        const toItems     = (od?.toItems ?? []) as Array<{ id?: string }>;
        const toItemIds   = toItems.map((i) => i.id).filter((x): x is string => !!x);
        const recipientDbItems = toItemIds.length > 0
          ? await prisma.item.findMany({ where: { id: { in: toItemIds }, userId: uid }, select: { id: true } })
          : [];
        const recipientItemIds = recipientDbItems.map((i) => i.id);

        await prisma.trade.update({
          where: { id },
          data: { status: "accepted", recipientItemIds, actionRequiredBy: trade.proposerId },
        });
        if (recipientItemIds.length > 0) {
          await prisma.item.updateMany({ where: { id: { in: recipientItemIds }, userId: uid }, data: { status: "IN_TRADE" } });
        }
        const accP = await prisma.profile.findUnique({ where: { userId: uid }, select: { name: true } });
        const accName = accP?.name?.trim() || "Someone";
        prisma.notification.create({
          data: { userId: trade.proposerId, type: "trade",
            message: `${accName} accepted your trade offer — confirm delivery to complete`,
            href: "/history" },
        }).catch(() => {});
        // Inject system message into conversation
        injectChatMessage({
          proposerId: trade.proposerId, recipientId: trade.recipientId!,
          senderId: uid, senderName: accName,
          type: "system", content: `${accName} accepted the trade offer`,
          metadata: { tradeId: id, eventType: "accepted" },
        }).catch(() => {});
      }

      return Response.json({ ok: true });
    }

    // ── Decline ───────────────────────────────────────────────────────────────
    if (action === "decline") {
      if (!isRecipient) {
        return Response.json({ error: "Only the recipient can decline" }, { status: 403 });
      }
      await prisma.trade.update({
        where: { id },
        data: { status: "declined", actionRequiredBy: null },
      });
      if (trade.proposerItemIds.length > 0) {
        await prisma.item.updateMany({
          where: { id: { in: trade.proposerItemIds } },
          data:  { status: "VAULT" },
        });
      }
      if (trade.recipientId) {
        const decP = await prisma.profile.findUnique({ where: { userId: uid }, select: { name: true } });
        const decName = decP?.name?.trim() || "Someone";
        injectChatMessage({
          proposerId: trade.proposerId, recipientId: trade.recipientId,
          senderId: uid, senderName: decName,
          type: "system", content: "Trade offer declined",
          metadata: { tradeId: id, eventType: "declined" },
        }).catch(() => {});
      }
      return Response.json({ ok: true });
    }

    // ── Cancel ────────────────────────────────────────────────────────────────
    if (action === "cancel") {
      if (!isProposer) {
        return Response.json({ error: "Only the proposer can cancel" }, { status: 403 });
      }
      await prisma.trade.update({
        where: { id },
        data: { status: "declined", actionRequiredBy: null },
      });
      if (trade.proposerItemIds.length > 0) {
        await prisma.item.updateMany({
          where: { id: { in: trade.proposerItemIds } },
          data:  { status: "VAULT" },
        });
      }
      if (trade.recipientId) {
        const canP = await prisma.profile.findUnique({ where: { userId: uid }, select: { name: true } });
        const canName = canP?.name?.trim() || "Someone";
        injectChatMessage({
          proposerId: trade.proposerId, recipientId: trade.recipientId,
          senderId: uid, senderName: canName,
          type: "system", content: "Trade offer cancelled",
          metadata: { tradeId: id, eventType: "cancelled" },
        }).catch(() => {});
      }
      return Response.json({ ok: true });
    }

    // ── Edit / Counter ────────────────────────────────────────────────────────
    // Proposer edits their pending offer → actionRequiredBy flips to recipient.
    // Recipient counters → payload perspective is FLIPPED before saving so the
    // DB always stores offerData from the PROPOSER's point of view, preventing
    // the "clone bug" where both sides end up offering the same items.
    if (action === "edit") {
      if (trade.status !== "pending") {
        return Response.json({ error: "Only pending trades can be edited" }, { status: 400 });
      }

      const body = await request.json().catch(() => ({})) as {
        offerData?: Record<string, unknown>;
        proposerItemIds?: string[];
      };

      const existingOd = trade.offerData as Record<string, unknown>;

      if (isProposer) {
        // ── Proposer edits their own offer ─────────────────────────────────
        // Release old proposer items, lock new ones
        if (trade.proposerItemIds.length > 0) {
          await prisma.item.updateMany({
            where: { id: { in: trade.proposerItemIds } },
            data:  { status: "VAULT" },
          });
        }
        const newItemIds = body.proposerItemIds ?? trade.proposerItemIds;
        if (newItemIds.length > 0) {
          await prisma.item.updateMany({
            where: { id: { in: newItemIds }, userId: uid },
            data:  { status: "IN_TRADE" },
          });
        }

        // Preserve the original fromUser/toUser identities; update everything else
        const newOfferData = body.offerData
          ? {
              ...body.offerData,
              fromUser: existingOd.fromUser,
              toUser:   existingOd.toUser,
            }
          : trade.offerData;

        console.log("[edit/proposer] saving offerData:", JSON.stringify(newOfferData, null, 2));

        await prisma.trade.update({
          where: { id },
          data: {
            proposerItemIds:  newItemIds,
            offerData:        newOfferData as import("@prisma/client").Prisma.InputJsonValue,
            actionRequiredBy: trade.recipientId ?? undefined,
          },
        });

        // Inject updated trade-offer bubble into conversation
        if (trade.recipientId) {
          const senderP = await prisma.profile.findUnique({ where: { userId: uid }, select: { name: true } });
          const senderName = senderP?.name?.trim() || "Someone";
          const odNew = newOfferData as Record<string, unknown>;
          const fiNew = (odNew.fromItems ?? []) as Array<{ name?: string; imageUrl?: string }>;
          const tiNew = (odNew.toItems   ?? []) as Array<{ name?: string; imageUrl?: string }>;
          injectChatMessage({
            proposerId: trade.proposerId, recipientId: trade.recipientId,
            senderId: uid, senderName,
            type: "trade-offer", content: "Trade updated",
            metadata: {
              proposer:      senderName,
              offeredItem:   fiNew[0]?.name ? { name: fiNew[0].name, imageUrl: fiNew[0].imageUrl } : undefined,
              requestedItem: tiNew[0]?.name ? { name: tiNew[0].name, imageUrl: tiNew[0].imageUrl } : undefined,
              fromCash:  (odNew.fromCash as number) ?? 0,
              toCash:    (odNew.toCash   as number) ?? 0,
              isCounter: false,
              tradeId:   id,
            },
          }).catch(() => {});
          prisma.notification.create({
            data: {
              userId:  trade.recipientId,
              type:    "trade",
              message: `${senderName} updated their trade offer — review it now`,
              href:    "/history",
            },
          }).catch(() => {});
        }

      } else if (isRecipient) {
        // ── Recipient counter-offer: FLIP perspective before saving ─────────
        // ProposeTradeModal sends data from the recipient's POV:
        //   body.offerData.fromItems = items recipient is offering (their side)
        //   body.offerData.toItems   = items recipient wants from proposer
        //   body.offerData.fromCash  = cash recipient adds
        //   body.offerData.toCash    = cash recipient wants from proposer
        //
        // The DB stores offerData from the PROPOSER's POV, so we flip:
        //   fromItems ← body.toItems   (what proposer gives)
        //   toItems   ← body.fromItems (what recipient gives)
        //   fromCash  ← body.toCash    (cash proposer adds)
        //   toCash    ← body.fromCash  (cash recipient adds)
        const submitted = body.offerData ?? {};
        const newOfferData = {
          fromUser:  existingOd.fromUser,         // keep proposer identity
          toUser:    existingOd.toUser,           // keep recipient identity
          fromItems: submitted.toItems   ?? existingOd.fromItems,
          toItems:   submitted.fromItems ?? existingOd.toItems,
          fromCash:  submitted.toCash    ?? existingOd.fromCash,
          toCash:    submitted.fromCash  ?? existingOd.toCash,
          message:   submitted.message   ?? existingOd.message,
        };

        console.log("[edit/recipient counter] flipped offerData:", JSON.stringify(newOfferData, null, 2));

        await prisma.trade.update({
          where: { id },
          data: {
            offerData:        newOfferData as import("@prisma/client").Prisma.InputJsonValue,
            actionRequiredBy: trade.proposerId,
          },
        });

        // Inject counter trade-offer bubble into conversation (from recipient's POV)
        {
          const senderP = await prisma.profile.findUnique({ where: { userId: uid }, select: { name: true } });
          const senderName = senderP?.name?.trim() || "Someone";
          const odC = newOfferData as Record<string, unknown>;
          // Recipient's perspective: they offer toItems, they want fromItems
          const theyGive = (odC.toItems   ?? []) as Array<{ name?: string; imageUrl?: string }>;
          const theyWant = (odC.fromItems ?? []) as Array<{ name?: string; imageUrl?: string }>;
          injectChatMessage({
            proposerId: trade.proposerId, recipientId: trade.recipientId!,
            senderId: uid, senderName,
            type: "trade-offer", content: "Counter offer",
            metadata: {
              proposer:      senderName,
              offeredItem:   theyGive[0]?.name ? { name: theyGive[0].name, imageUrl: theyGive[0].imageUrl } : undefined,
              requestedItem: theyWant[0]?.name ? { name: theyWant[0].name, imageUrl: theyWant[0].imageUrl } : undefined,
              fromCash:  (odC.toCash   as number) ?? 0,   // recipient's cash offer = DB toCash
              toCash:    (odC.fromCash as number) ?? 0,   // what recipient requests = DB fromCash
              isCounter: true,
              tradeId:   id,
            },
          }).catch(() => {});
          prisma.notification.create({
            data: {
              userId:  trade.proposerId,
              type:    "trade",
              message: `${senderName} sent a counter offer — review it now`,
              href:    "/history",
            },
          }).catch(() => {});

          // Award "The Negotiator" to the user who sent the counter-offer
          runAchievementEngine("counter_offered", uid).catch(() => {});
        }
      }

      return Response.json({ ok: true });
    }

    // ── Complete: double opt-in — BOTH parties must confirm before swap fires ──
    if (action === "complete") {
      if (trade.status !== "accepted") {
        return Response.json(
          { error: "Trade must be accepted before completing" },
          { status: 400 },
        );
      }

      const confirmedBy = (trade.completionConfirmedBy ?? []) as string[];

      if (confirmedBy.includes(uid)) {
        return Response.json({ ok: true, waiting: true });
      }

      const newConfirmed  = [...confirmedBy, uid];
      const needsBoth     = !!trade.recipientId;
      const bothConfirmed = needsBoth
        ? newConfirmed.includes(trade.proposerId) && newConfirmed.includes(trade.recipientId!)
        : true;

      if (!bothConfirmed) {
        const otherParty = uid === trade.proposerId ? trade.recipientId! : trade.proposerId;
        await prisma.trade.update({
          where: { id },
          data: {
            completionConfirmedBy: newConfirmed,
            actionRequiredBy:      otherParty,
          },
        });

        prisma.profile.findUnique({ where: { userId: uid }, select: { name: true } })
          .then((p) => prisma.notification.create({
            data: {
              userId:  otherParty,
              type:    "trade",
              message: `${p?.name?.trim() || "Someone"} confirmed delivery — tap to complete the trade`,
              href:    "/history",
            },
          })).catch(() => {});

        if (trade.recipientId) {
          prisma.profile.findUnique({ where: { userId: uid }, select: { name: true } })
            .then((p) => injectChatMessage({
              proposerId: trade.proposerId, recipientId: trade.recipientId!,
              senderId: uid, senderName: p?.name?.trim() || "Someone",
              type: "system", content: "Waiting for partner...",
              metadata: { tradeId: id, eventType: "completion_pending" },
            })).catch(() => {});
        }

        return Response.json({ ok: true, waiting: true });
      }

      // Both confirmed — execute the atomic swap
      const now = new Date();

      await prisma.$transaction(async (tx) => {
        await tx.trade.update({
          where: { id },
          data:  {
            status:               "completed",
            completedAt:          now,
            actionRequiredBy:     null,
            completionConfirmedBy: newConfirmed,
          },
        });

        if (trade.proposerItemIds.length > 0 && trade.recipientId) {
          // Transfer to new owner — ACTIVE so they appear in vault/public profile
          await tx.item.updateMany({
            where: { id: { in: trade.proposerItemIds } },
            data:  { status: "ACTIVE", userId: trade.recipientId, upForTrade: false },
          });
        } else if (trade.proposerItemIds.length > 0) {
          // No recipient to transfer to (edge case) — mark consumed
          await tx.item.updateMany({
            where: { id: { in: trade.proposerItemIds } },
            data:  { status: "TRADED" },
          });
        }

        if (trade.recipientItemIds.length > 0) {
          // Transfer to proposer — ACTIVE so they appear in vault/public profile
          await tx.item.updateMany({
            where: { id: { in: trade.recipientItemIds } },
            data:  { status: "ACTIVE", userId: trade.proposerId, upForTrade: false },
          });
        }
      });

      const offerData  = trade.offerData as Record<string, unknown>;
      const toUser     = offerData?.toUser as { name?: string } | undefined;
      const fromItems  = offerData?.fromItems as Array<{ name?: string; imageUrl?: string; estimatedValue?: number }> | undefined;
      const toItems    = offerData?.toItems   as Array<{ name?: string; imageUrl?: string; estimatedValue?: number }> | undefined;
      const tradeValue = [...(fromItems ?? []), ...(toItems ?? [])].reduce((s, i) => s + (i.estimatedValue ?? 0), 0);
      const toName     = toUser?.name ?? "another collector";
      const heroImage  = fromItems?.[0]?.imageUrl ?? toItems?.[0]?.imageUrl ?? "";

      const otherPartyId = uid === trade.proposerId ? trade.recipientId : trade.proposerId;
      if (otherPartyId) {
        prisma.profile.findUnique({ where: { userId: uid }, select: { name: true } })
          .then((p) => prisma.notification.create({
            data: {
              userId:  otherPartyId,
              type:    "trade",
              message: `${p?.name?.trim() || "Someone"} confirmed delivery — trade is complete`,
              href:    "/history",
            },
          })).catch(() => {});
      }

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

      if (trade.recipientId) {
        prisma.profile.findUnique({ where: { userId: uid }, select: { name: true } })
          .then((p) => injectChatMessage({
            proposerId: trade.proposerId, recipientId: trade.recipientId!,
            senderId: uid, senderName: p?.name?.trim() || "Someone",
            type: "system", content: "Trade completed",
            metadata: { tradeId: id, eventType: "completed" },
          })).catch(() => {});
      }

      const completionCtx = {
        tradeValue,
        catalystItem: { name: fromItems?.[0]?.name ?? "", imageUrl: heroImage },
      };
      const newAchievements = await runAchievementEngine("trade.completed", session.user.id, completionCtx);

      // Fire achievement check for the other party in the background
      if (otherPartyId) {
        runAchievementEngine("trade.completed", otherPartyId, completionCtx).catch(() => {});
      }

      // ── Market Snapshots: capture new net worth for both parties post-swap ──
      snapshotUserPortfolio(trade.proposerId).catch(() => {});
      if (trade.recipientId) snapshotUserPortfolio(trade.recipientId).catch(() => {});

      // Bust server caches for both parties so vault and history reflect the swap immediately
      revalidatePath("/inventory", "page");
      revalidatePath("/history",   "page");

      // Bust public profile caches for both parties so received items are visible immediately
      const [proposerProfile, recipientProfile] = await Promise.all([
        prisma.profile.findUnique({ where: { userId: trade.proposerId }, select: { handle: true } }),
        trade.recipientId
          ? prisma.profile.findUnique({ where: { userId: trade.recipientId }, select: { handle: true } })
          : null,
      ]);
      if (proposerProfile?.handle)  revalidatePath(`/u/${proposerProfile.handle}`,  "page");
      if (recipientProfile?.handle) revalidatePath(`/u/${recipientProfile.handle}`, "page");

      return Response.json({ ok: true, completed: true, newAchievements });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[PATCH /api/trades]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
