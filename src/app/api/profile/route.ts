export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { runAchievementEngine } from "@/lib/achievementEngine";

// GET /api/profile — returns the logged-in user's profile (creates one if absent)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let profile = await prisma.profile.upsert({
      where:  { userId: session.user.id },
      create: {
        userId:  session.user.id,
        name:    session.user.name  ?? "",
        avatar:  session.user.image ?? "",
      },
      update: {},
    });

    // Lazy-sync tier from User → Profile so public profile badge stays current
    // after a Stripe upgrade without needing Supabase admin access.
    const email = (session.user as { email?: string }).email;
    if (email) {
      try {
        const userRecord = await prisma.user.findUnique({ where: { email }, select: { tier: true } });
        if (userRecord && userRecord.tier !== profile.tier) {
          profile = await prisma.profile.update({
            where: { userId: session.user.id },
            data:  { tier: userRecord.tier },
          });
        }
      } catch { /* non-fatal */ }
    }

    return Response.json(profile);
  } catch (err) {
    console.error("[GET /api/profile]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/profile — upsert profile fields
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      name?:                string;
      handle?:              string;
      bio?:                 string;
      avatar?:              string;
      paymentMethods?:      string[];
      shippingPreferences?: string[];
      interests?:           string[];
      tooltipSeen?:         boolean;
      pinnedItemIds?:       string[];
      notifPush?:           boolean;
      notifTrades?:         boolean;
      notifMarket?:         boolean;
    };

    console.log("[PUT /api/profile]", {
      keys:         Object.keys(body),
      handle:       body.handle,
      avatarLen:    (body.avatar ?? "").length,
      paymentCount: (body.paymentMethods ?? []).length,
      shipCount:    (body.shippingPreferences ?? []).length,
    });

    // ── Avatar validation ─────────────────────────────────────────────────────
    // Reject oversized payloads and non-image MIME types to prevent storage
    // abuse and disguised script uploads (e.g. data:text/html or data:application/js).
    if (body.avatar !== undefined && body.avatar !== "") {
      const ALLOWED_MIME = ["data:image/jpeg;base64,", "data:image/png;base64,", "data:image/webp;base64,", "data:image/gif;base64,"];
      const MAX_B64_LEN  = 140_000; // ~105 KB raw — well above our 400×400 JPEG output

      if (body.avatar.startsWith("data:")) {
        // Must be an allowed image type
        if (!ALLOWED_MIME.some((prefix) => body.avatar!.startsWith(prefix))) {
          return Response.json({ error: "Avatar must be a JPEG, PNG, WebP, or GIF image." }, { status: 422 });
        }
        // Must not exceed size cap
        if (body.avatar.length > MAX_B64_LEN) {
          return Response.json({ error: "Avatar image is too large. Maximum 100 KB." }, { status: 413 });
        }
      } else if (!body.avatar.startsWith("https://")) {
        // Non-data URIs must be HTTPS URLs
        return Response.json({ error: "Avatar URL must use HTTPS." }, { status: 422 });
      }
    }

    // Validate handle format if provided
    if (body.handle !== undefined && body.handle !== null && body.handle !== "") {
      if (!/^[a-z0-9_]{3,20}$/.test(body.handle)) {
        return Response.json({ error: "Handle must be 3–20 lowercase letters, numbers, or underscores" }, { status: 422 });
      }
      // Check uniqueness
      const existing = await prisma.profile.findUnique({ where: { handle: body.handle } });
      if (existing && existing.userId !== session.user.id) {
        return Response.json({ error: "Handle already taken" }, { status: 409 });
      }
    }

    const profile = await prisma.profile.upsert({
      where:  { userId: session.user.id },
      create: {
        userId:              session.user.id,
        name:                body.name    ?? session.user.name  ?? "",
        bio:                 body.bio     ?? "",
        avatar:              body.avatar  ?? session.user.image ?? "",
        paymentMethods:      body.paymentMethods      ?? [],
        shippingPreferences: body.shippingPreferences ?? [],
        interests:           body.interests           ?? [],
        pinnedItemIds:       body.pinnedItemIds        ?? [],
        tooltipSeen:         body.tooltipSeen         ?? false,
        notifPush:           body.notifPush           ?? true,
        notifTrades:         body.notifTrades         ?? true,
        notifMarket:         body.notifMarket         ?? false,
      },
      update: {
        ...(body.name                !== undefined && { name:                body.name }),
        ...(body.handle              !== undefined && { handle:              body.handle || null }),
        ...(body.bio                 !== undefined && { bio:                 body.bio }),
        ...(body.avatar              !== undefined && { avatar:              body.avatar }),
        ...(body.paymentMethods      !== undefined && { paymentMethods:      body.paymentMethods }),
        ...(body.shippingPreferences !== undefined && { shippingPreferences: body.shippingPreferences }),
        ...(body.interests           !== undefined && { interests:           body.interests }),
        ...(body.pinnedItemIds       !== undefined && { pinnedItemIds:       body.pinnedItemIds }),
        ...(body.tooltipSeen         !== undefined && { tooltipSeen:         body.tooltipSeen }),
        ...(body.notifPush           !== undefined && { notifPush:           body.notifPush }),
        ...(body.notifTrades         !== undefined && { notifTrades:         body.notifTrades }),
        ...(body.notifMarket         !== undefined && { notifMarket:         body.notifMarket }),
      },
    });

    // Keep ConversationParticipant denormalized fields in sync so inbox
    // participant records also stay current when the user updates their identity.
    const participantPatch: { displayName?: string; avatarUrl?: string } = {};
    if (body.name   !== undefined) participantPatch.displayName = body.name;
    if (body.avatar !== undefined) participantPatch.avatarUrl   = body.avatar;
    if (Object.keys(participantPatch).length > 0) {
      await prisma.conversationParticipant.updateMany({
        where: { userId: session.user.id },
        data:  participantPatch,
      });
    }

    // Bust Next.js server caches so handle/avatar changes reflect globally immediately.
    revalidatePath("/", "layout");
    if (profile.handle) revalidatePath(`/u/${profile.handle}`, "page");

    // Achievement check: first-impression, pro-collector, early-adopter
    runAchievementEngine("profile.updated", session.user.id).catch(() => {});

    return Response.json(profile);
  } catch (err) {
    console.error("[PUT /api/profile]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
