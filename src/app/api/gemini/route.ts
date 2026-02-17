import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI("AIzaSyAnMkpL0_wk-DcODbStO93mSxhVSuHti90");

export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    if (!image) return NextResponse.json({ error: "No image" }, { status: 400 });
    
    // מודל 2.0 הוא היחיד שעובד אצלך (1.5 מחזיר 404). ה-429 יעלם עם הזמן.
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const base64Data = image.includes("base64,") ? image.split("base64,")[1] : image;

    const prompt = `
      Analyze this image carefully.
      
      1. TRADING CARD (Pokemon, Magic, Sports):
         - Return JSON: { "isCard": true }

      2. FUNKO POP:
         - Look for "Pop!" logo. Read Name and Number.
         - Return JSON: 
           { 
             "name": "Funko Pop [Series]: [Name] #[Number]", 
             "category": "Funko Pop", 
             "isCard": false 
           }

      3. LEGO:
         - Look for Lego logo and set number.
         - Return JSON: { "name": "Lego [Name] #[Number]", "category": "Lego", "isCard": false }

      4. OTHER:
         - Return JSON: { "name": "[Brand] [Item Name]", "category": "Other", "isCard": false }

      Return ONLY raw JSON.
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
    ]);
    
    const text = result.response.text();
    const cleanText = text.replace(/```json|```/g, "").trim();
    
    console.log("Gemini 2.0 Response:", cleanText); 
    
    return NextResponse.json(JSON.parse(cleanText));

  } catch (error: any) {
    console.error("Gemini Critical Error:", error.message);
    return NextResponse.json({ error: "AI Error (429/500)" }, { status: 500 });
  }
}