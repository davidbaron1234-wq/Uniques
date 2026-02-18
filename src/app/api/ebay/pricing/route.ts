import { NextResponse } from "next/server";
import { getEbayMarketPrice } from "@/lib/ebay";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  try {
    const price = await getEbayMarketPrice(query);
    return NextResponse.json({ price });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch price" }, { status: 500 });
  }
}