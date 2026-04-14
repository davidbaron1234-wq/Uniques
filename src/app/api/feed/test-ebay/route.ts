/**
 * GET /api/feed/test-ebay?cat=Watches
 *
 * Diagnostic: calls searchEbayItems for a single category and returns
 * the raw result plus a direct eBay HTTP test to expose any API errors.
 */

import { NextRequest, NextResponse } from "next/server";
import { CATEGORY_QUERIES } from "@/lib/feedSeeder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EBAY_SCOPES = "https://api.ebay.com/oauth/api_scope";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cat = req.nextUrl.searchParams.get("cat") ?? "Watches";
  const cfg = CATEGORY_QUERIES[cat];
  if (!cfg) {
    return NextResponse.json({ error: `Unknown category: ${cat}`, known: Object.keys(CATEGORY_QUERIES) });
  }

  const appId   = process.env.EBAY_APP_ID;
  const certId  = process.env.EBAY_CERT_ID;
  const oauthUrl = process.env.EBAY_OAUTH_URL;
  const apiUrl   = process.env.EBAY_API_URL;

  if (!appId || !certId || !oauthUrl || !apiUrl) {
    return NextResponse.json({ error: "Missing eBay env vars", appId: !!appId, certId: !!certId, oauthUrl: !!oauthUrl, apiUrl: !!apiUrl });
  }

  // Get token
  const credentials = Buffer.from(`${appId}:${certId}`).toString("base64");
  const tokenRes = await fetch(oauthUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${credentials}` },
    body: `grant_type=client_credentials&scope=${encodeURIComponent(EBAY_SCOPES)}`,
  });
  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    return NextResponse.json({ error: "Token fetch failed", status: tokenRes.status, body: txt.slice(0, 500) });
  }
  const tokenData = await tokenRes.json() as { access_token?: string };
  const token = tokenData.access_token;
  if (!token) return NextResponse.json({ error: "No access_token in response", tokenData });

  // Build and fire the eBay request
  const url = new URL(apiUrl);
  const simpleQ  = req.nextUrl.searchParams.get("q") ?? cfg.query;
  const minP     = parseInt(req.nextUrl.searchParams.get("min") ?? String(cfg.minPrice));
  const noFilter = req.nextUrl.searchParams.get("nofilter") === "1";
  const noNeg    = req.nextUrl.searchParams.get("noneg") === "1";

  const negKw = noNeg ? "" : " -mystery -box -repack -proxy -custom -lot";
  const query = `${simpleQ.trim()}*${negKw}`;
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "5");
  url.searchParams.set("offset", "0");
  if (!noFilter) {
    url.searchParams.set("filter", `buyingOptions:{FIXED_PRICE|AUCTION},price:[${minP}..],priceCurrency:USD`);
  }
  url.searchParams.set("sort", "-price");

  const ebayRes = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" },
  });

  const rawBody = await ebayRes.text();
  let parsed: unknown;
  try { parsed = JSON.parse(rawBody); } catch { parsed = rawBody; }

  return NextResponse.json({
    category: cat,
    query,
    minPrice: cfg.minPrice,
    requestUrl: url.toString().replace(token, "[TOKEN]"),
    ebayHttpStatus: ebayRes.status,
    ebayResponse: parsed,
  });
}
