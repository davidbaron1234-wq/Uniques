export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

// GET /api/profile/handle-check?handle=xyz
// Returns { available: boolean, error?: string }
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const handle = searchParams.get("handle") ?? "";

    if (!handle) {
      return Response.json({ available: false, error: "Handle required" });
    }

    if (!/^[a-z0-9_]{3,20}$/.test(handle)) {
      return Response.json({ available: false, error: "3–20 lowercase letters, numbers, or underscores" });
    }

    const existing = await prisma.profile.findUnique({
      where:  { handle },
      select: { userId: true },
    });

    // Available if not taken, or taken by the current user (no-op update)
    const available = !existing || existing.userId === session.user.id;
    return Response.json({ available });
  } catch (err) {
    console.error("[GET /api/profile/handle-check]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
