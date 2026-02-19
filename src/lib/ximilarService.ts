// ── Ximilar TCG Card Recognition Service ─────────────────────────────────
// Calls our own /api/identify proxy to bypass browser CORS restrictions.
// The proxy relays the request to Ximilar's TCG identification endpoint.

export interface XimilarResult {
  success: boolean;
  cardName?: string;
  set?: string;
  category?: string;
  confidence?: number;
  error?: string;
  raw?: Record<string, unknown>;
}

/**
 * Send a base64-encoded image to our server proxy for TCG card identification.
 * Parses the Ximilar TCG endpoint response (_objects → _identification → best_match).
 */
export async function identifyCard(base64Image: string): Promise<XimilarResult> {
  try {
    // Strip data URL prefix client-side before sending
    const cleanBase64 = base64Image.includes(",")
      ? base64Image.split(",")[1]
      : base64Image;

    const response = await fetch("/api/identify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64Image: cleanBase64 }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errData.error || `Server returned ${response.status}`,
        raw: errData,
      };
    }

    const data = await response.json();
    const record = data?.records?.[0];

    if (!record) return { success: false, error: "No Card Found — empty response", raw: data };

    // Parse TCG endpoint structure: _objects[0]._identification.best_match
    const objects = record._objects || [];

    if (objects.length > 0) {
      const bestMatch = objects[0];

      let finalName = bestMatch.name;
      let finalSet: string | undefined;

      // Dig into _identification.best_match for the specific card name & set
      if (bestMatch._identification?.best_match) {
        const specific = bestMatch._identification.best_match;
        if (specific.name) finalName = specific.name;
        if (specific.set) finalSet = specific.set;
      }

      return {
        success: true,
        cardName: finalName || "Unknown Card",
        set: finalSet,
        category: "Pokémon TCG",
        confidence: bestMatch.prob || 0.9,
        raw: data,
      };
    }

    return { success: false, error: "No Card Found — no objects detected", raw: data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    return { success: false, error: `Request failed: ${message}` };
  }
}
