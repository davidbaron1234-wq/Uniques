import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "Barcode required" }, { status: 400 });
    }

    console.log("🔍 Searching UPCitemdb for:", code);

    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`);
    
    if (!res.ok) {
        console.log("❌ UPC API Error:", res.status);
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    let data;
    try { data = await res.json(); } catch {
      return NextResponse.json({ error: "Failed to parse barcode API response" }, { status: 502 });
    }

    if (data.items && data.items.length > 0) {
        const item = data.items[0];
        console.log("✅ Item Found:", item.title);
        
        return NextResponse.json({
            found: true,
            title: item.title,
            category: item.category, 
            image: item.images && item.images.length > 0 ? item.images[0] : null,
            lowest_price: item.lowest_recorded_price
        });
    }

    return NextResponse.json({ found: false });

  } catch (error) {
    console.error("Barcode Server Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}