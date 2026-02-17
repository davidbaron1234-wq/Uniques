const INTERNAL_API_ENDPOINT = "/api/identify";

export interface XimilarResult {
  success: boolean;
  cardName?: string;
  set?: string;
  category?: string;
  confidence?: number;
  raw?: Record<string, unknown>;
}

export async function identifyCard(base64Image: string): Promise<XimilarResult> {
  try {
    const cleanBase64 = base64Image.includes(",") 
      ? base64Image.split(",")[1] 
      : base64Image;

    const response = await fetch(INTERNAL_API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64Image: cleanBase64 }),
    });

    if (!response.ok) return { success: false };

    const data = await response.json();
    const record = data?.records?.[0];

    if (!record) return { success: false, raw: data };

    const objects = record._objects || [];
    
    if (objects.length > 0) {
        const bestMatch = objects[0];
        
        // התחלה: השם הכללי ("Card")
        let finalName = bestMatch.name;
        let finalSet = undefined;

        // 👇 התיקון הגדול: כניסה לתוך best_match 👇
        if (bestMatch._identification && bestMatch._identification.best_match) {
             const specific = bestMatch._identification.best_match;
             
             // שליפת השם המדויק
             if (specific.name) finalName = specific.name;
             
             // שליפת שם הסט (למשל Lost Origin)
             if (specific.set) finalSet = specific.set;
        }

        return {
            success: true,
            cardName: finalName || "Unknown Card",
            set: finalSet,
            category: "Pokémon TCG",
            confidence: bestMatch.prob || 0.9,
            raw: data
        };
    }

    return { success: false, raw: data };

  } catch (error) {
    console.error("Identification service failed:", error);
    return { success: false };
  }
}