/**
 * GET /api/market/official-value?userId=<userId>
 *
 * Returns the authoritative portfolio value for a user by resolving each
 * vault item against the latest catalog MarketSnapshot, not their asking price.
 *
 * Only the authenticated owner may request their own portfolio value.
 * (Public profiles show the same graph history but the current live number
 * is only available to the owner to prevent leaking unconfirmed vault data.)
 */

import { NextRequest }                    from "next/server";
import { getServerSession }               from "next-auth";
import { authOptions }                    from "@/lib/authOptions";
import { computeOfficialPortfolioValue }  from "@/lib/officialPortfolioValue";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return Response.json({ error: "userId required" }, { status: 400 });
  }

  // Only the owner can query their own official value
  if (userId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await computeOfficialPortfolioValue(userId);
    return Response.json(result);
  } catch (err) {
    console.error("[GET /api/market/official-value]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
