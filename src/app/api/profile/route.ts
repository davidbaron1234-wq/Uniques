import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

// GET /api/profile — returns the logged-in user's profile (creates one if absent)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.profile.upsert({
      where:  { userId: session.user.id },
      create: {
        userId:  session.user.id,
        name:    session.user.name  ?? "",
        avatar:  session.user.image ?? "",
      },
      update: {},
    });

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
      bio?:                 string;
      avatar?:              string;
      paymentMethods?:      string[];
      shippingPreferences?: string[];
      interests?:           string[];
      tooltipSeen?:         boolean;
    };

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
        tooltipSeen:         body.tooltipSeen         ?? false,
      },
      update: {
        ...(body.name                !== undefined && { name:                body.name }),
        ...(body.bio                 !== undefined && { bio:                 body.bio }),
        ...(body.avatar              !== undefined && { avatar:              body.avatar }),
        ...(body.paymentMethods      !== undefined && { paymentMethods:      body.paymentMethods }),
        ...(body.shippingPreferences !== undefined && { shippingPreferences: body.shippingPreferences }),
        ...(body.interests           !== undefined && { interests:           body.interests }),
        ...(body.tooltipSeen         !== undefined && { tooltipSeen:         body.tooltipSeen }),
      },
    });

    return Response.json(profile);
  } catch (err) {
    console.error("[PUT /api/profile]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
