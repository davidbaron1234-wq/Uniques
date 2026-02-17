import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { base64Image } = await request.json();

    if (!base64Image) {
      return NextResponse.json(
        { error: "Image data is missing" },
        { status: 400 }
      );
    }

    const API_KEY = "fd7cb18664eabef30a2de9ca37d8bcd4c15ef948"; 

    // שליחה ל-Ximilar (TCG Endpoint)
    const response = await fetch("https://api.ximilar.com/collectibles/v2/tcg_id", { 
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${API_KEY}`,
      },
      body: JSON.stringify({
        records: [{ _base64: base64Image }],
      }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Ximilar Error:", errorText);
        return NextResponse.json({ error: "Failed to identify card" }, { status: response.status });
    }

    const data = await response.json();
    // מחקנו את ה-console.log של הריגול כאן
    return NextResponse.json(data);

  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}