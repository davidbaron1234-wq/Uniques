// ── Ximilar TCG Card Recognition Service ─────────────────────────────────
// Uses Ximilar's visual AI to identify trading cards from photos.

const XIMILAR_API_KEY = "fd7cb18664eabef30a2de9ca37d8bcd4c15ef948";
const XIMILAR_ENDPOINT = "https://api.ximilar.com/recognition/v2/classify";

export interface XimilarResult {
  success: boolean;
  cardName?: string;
  set?: string;
  category?: string;
  confidence?: number;
  raw?: Record<string, unknown>;
}

/**
 * Send a base64-encoded image to Ximilar for TCG card identification.
 * Returns the best match card name, set, and confidence score.
 */
export async function identifyCard(base64Image: string): Promise<XimilarResult> {
  try {
    // Strip the data URL prefix if present (e.g. "data:image/jpeg;base64,")
    const base64Data = base64Image.includes(",")
      ? base64Image.split(",")[1]
      : base64Image;

    const response = await fetch(XIMILAR_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${XIMILAR_API_KEY}`,
      },
      body: JSON.stringify({
        records: [{ _base64: base64Data }],
      }),
    });

    if (!response.ok) {
      console.error("Ximilar API error:", response.status, response.statusText);
      return { success: false };
    }

    const data = await response.json();

    // Parse Ximilar response structure
    // The API returns records[0] with classification results
    const record = data?.records?.[0];
    if (!record) return { success: false, raw: data };

    // Look for best label from the classification
    const bestLabel = record?.best_label;
    if (bestLabel && bestLabel.name) {
      return {
        success: true,
        cardName: bestLabel.name,
        confidence: bestLabel.prob,
        category: "Pokémon TCG",
        raw: data,
      };
    }

    // Try to extract from categories/labels array
    const labels = record?.labels || record?.categories || [];
    if (Array.isArray(labels) && labels.length > 0) {
      const top = labels.reduce(
        (best: { name?: string; prob?: number }, l: { name?: string; prob?: number }) =>
          (l.prob || 0) > (best.prob || 0) ? l : best,
        labels[0]
      );
      if (top?.name) {
        return {
          success: true,
          cardName: top.name,
          confidence: top.prob,
          category: "Pokémon TCG",
          raw: data,
        };
      }
    }

    return { success: false, raw: data };
  } catch (error) {
    console.error("Ximilar identification failed:", error);
    return { success: false };
  }
}
