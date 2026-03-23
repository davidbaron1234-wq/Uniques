import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) throw new Error("GEMINI_API_KEY is not set in environment variables.");
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    if (!image) return NextResponse.json({ error: "No image" }, { status: 400 });
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const base64Data = image.includes("base64,") ? image.split("base64,")[1] : image;

    const prompt = `
      Analyze this image deeply for a collector's app. Return a JSON with TWO parts.

      PART 1: "barcode"
      - Look for a standard UPC/EAN barcode (12/13 digits).
      - IGNORE codes starting with "X", "B0", "LPN" (Amazon stickers).
      - Return null if no valid barcode found.

      PART 2: "visual" (The AI Identification)
      - Identify the item visually.
      - "name": Full precise name (e.g. "1986 Fleer Michael Jordan #57 Rookie", "Funko Pop One Piece Shanks #939").
      - "category": MUST be one of: 
         [Pokémon TCG, Sports Cards, Other TCG, Funko Pop, Lego, Video Games, Sneakers, Comics, Watches, Coins, Other]
      - "isCard": true if it is a trading card (Pokemon, Sports, Magic, etc), false otherwise.

      OUTPUT FORMAT (JSON Only):
      {
        "barcode": "...",
        "visual": {
          "name": "...",
          "category": "...",
          "isCard": true/false
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
    let parsed;
    try { parsed = JSON.parse(cleanText); } catch { return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 }); }
    return NextResponse.json(parsed);

  } catch (error: unknown) {
    console.error("Gemini Error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "AI Error" }, { status: 500 });
  }
}