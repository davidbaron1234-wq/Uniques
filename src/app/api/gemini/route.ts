import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { runAchievementEngine } from "@/lib/achievementEngine";

// Prevent Next.js from statically pre-rendering this route at build time
export const dynamic = "force-dynamic";

const MAX_B64_LEN = 2_000_000; // ~1.5 MB of image data

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
  }
  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const { image } = await req.json();
    if (!image) return NextResponse.json({ error: "No image" }, { status: 400 });
    if (typeof image !== "string" || image.length > MAX_B64_LEN) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 });
    }
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const base64Data = image.includes("base64,") ? image.split("base64,")[1] : image;

    const prompt = `
      You are an expert collectibles appraiser. Analyze this image and return a JSON with TWO parts.

      PART 1: "barcode"
      - Look for a standard UPC/EAN barcode (12/13 digits).
      - IGNORE codes starting with "X", "B0", "LPN" (Amazon stickers).
      - Return null if no valid barcode found.

      PART 2: "visual" (Item Identification)
      - "name": Full, precise collector name for the item (e.g. "1986 Fleer Michael Jordan #57 Rookie Card", "Air Jordan 1 Retro High OG Black Toe", "Funko Pop NBA Michael Jordan #54").
      - "category": Classify strictly by what the object physically IS — its form factor, material, and shape — NOT by the brand name or person associated with it. Use EXACTLY one of the 11 strings below:

          "Pokémon TCG"  — a flat printed Pokémon trading card
          "Sports Cards" — a flat printed card featuring an athlete (any sport, any brand: Fleer, Topps, Panini, Upper Deck, etc.)
          "Other TCG"    — a flat printed trading card from any other game: Magic: The Gathering, Yu-Gi-Oh!, Digimon, Lorcana, etc.
          "Funko Pop"    — a vinyl Funko Pop figure, typically in a window display box
          "Lego"         — a Lego brick set, minifigure, or boxed Lego product
          "Video Games"  — a game cartridge, disc, console, controller, or sealed game box
          "Sneakers"     — a physical 3D shoe: any brand (Nike, Adidas, Jordan Brand, Yeezy, New Balance, etc.)
          "Comics"       — a comic book or graphic novel
          "Watches"      — a wristwatch or timepiece
          "Coins"        — a coin, medal, or bullion piece
          "Other"        — anything that does not fit the above

      - DISAMBIGUATION PRINCIPLE — the same person can appear in multiple categories. Classify by the physical object, not the name:
          • A flat printed card with an athlete's photo and stats → "Sports Cards"
          • A 3D leather/mesh shoe with a brand logo → "Sneakers"
          • A vinyl figure of a celebrity or character in a box → "Funko Pop"
          • A signed jersey, poster, or memorabilia → "Other"

      - "isCard": true ONLY if the primary object is a flat printed trading card (Pokémon, Sports, TCG). false for shoes, figures, consoles, or anything 3D.

      OUTPUT FORMAT (raw JSON only, no markdown fences):
      {
        "barcode": "123456789012" or null,
        "visual": {
          "name": "...",
          "category": "...",
          "isCard": true or false
        }
      }
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
    ]);
    
    const text = result.response.text();
    const cleanText = text.replace(/```json|```/g, "").trim();
    
    console.log("Gemini Hybrid Response:", cleanText);

    const VALID_CATEGORIES = new Set([
      "Pokémon TCG", "Sports Cards", "Other TCG", "Funko Pop",
      "Lego", "Video Games", "Sneakers", "Comics", "Watches", "Coins", "Other",
    ]);

    let parsed: { visual?: { estimatedValue?: number; category?: string } };
    try { parsed = JSON.parse(cleanText); } catch { return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 }); }

    // Strict category validation — if the AI hallucinated a category not in our allowed list,
    // fall back to "Other" rather than passing a malformed value to the frontend.
    if (parsed?.visual?.category && !VALID_CATEGORIES.has(parsed.visual.category)) {
      console.warn(`[gemini] AI returned unknown category "${parsed.visual.category}" — falling back to "Other"`);
      parsed.visual.category = "Other";
    }

    // Track AI scan for achievement engine (fire-and-forget)
    const scannedValue = typeof parsed?.visual?.estimatedValue === "number" ? parsed.visual.estimatedValue : 0;
    const scanUserId = session.user.id as string;
    prisma.activity.create({
      data: {
        userId:   scanUserId,
        type:     "ai_scan",
        title:    "Used Magic AI Scan",
        imageUrl: "",
        metadata: { estimatedValue: scannedValue },
      },
    }).then(() => {
      runAchievementEngine("ai_scan.used", scanUserId, { scannedItemValue: scannedValue }).catch(() => {});
    }).catch(() => {});

    return NextResponse.json(parsed);

  } catch (error: unknown) {
    console.error("Gemini Error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "AI Error" }, { status: 500 });
  }
}