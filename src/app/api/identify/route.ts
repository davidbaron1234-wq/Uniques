import { NextRequest, NextResponse } from "next/server";

// ── POST /api/identify ─────────────────────────────────────────────────────
// Server-side proxy for Ximilar visual AI card recognition.
// Uses the TCG-specific endpoint for better card identification.

const XIMILAR_API_KEY = "fd7cb18664eabef30a2de9ca37d8bcd4c15ef948";
const XIMILAR_ENDPOINT = "https://api.ximilar.com/collectibles/v2/tcg_id";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base64Image } = body as { base64Image?: string };

    if (!base64Image || typeof base64Image !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid base64Image field" },
        { status: 400 }
      );
    }

    // Strip the data URL prefix if present (e.g. "data:image/jpeg;base64,")
    const base64Data = base64Image.includes(",")
      ? base64Image.split(",")[1]
      : base64Image;

    const ximilarRes = await fetch(XIMILAR_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${XIMILAR_API_KEY}`,
      },
      body: JSON.stringify({
        records: [{ _base64: base64Data }],
      }),
    });

    // Surface specific HTTP errors for easier debugging
    if (ximilarRes.status === 401 || ximilarRes.status === 403) {
      return NextResponse.json(
        { success: false, error: "API Key Invalid — Ximilar rejected the token" },
        { status: 401 }
      );
    }

    if (!ximilarRes.ok) {
      const errorText = await ximilarRes.text().catch(() => "");
      return NextResponse.json(
        {
          success: false,
          error: `Ximilar API error ${ximilarRes.status}: ${ximilarRes.statusText}`,
          detail: errorText.slice(0, 500),
        },
        { status: 502 }
      );
    }

    const data = await ximilarRes.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json(
      { success: false, error: `Server error: ${message}` },
      { status: 500 }
    );
  }
}
