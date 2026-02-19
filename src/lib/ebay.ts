// src/lib/ebay.ts

const EBAY_SCOPES = "https://api.ebay.com/oauth/api_scope";

async function getEbayAccessToken() {
  const credentials = Buffer.from(
    `${process.env.EBAY_APP_ID}:${process.env.EBAY_CERT_ID}`
  ).toString("base64");

  const res = await fetch(process.env.EBAY_OAUTH_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: `grant_type=client_credentials&scope=${encodeURIComponent(EBAY_SCOPES)}`,
  });

  const data = await res.json();
  return data.access_token;
}

export async function getEbayMarketPrice(query: string) {
  try {
    const token = await getEbayAccessToken();
    if (!token) return null;

    // 🔥 תיקון 1: הורדנו את sort=price כדי לקבל תוצאות רלוונטיות ולא את הכי זולות
    // הוספנו limit=10 כדי לקבל מדגם טוב
    const searchUrl = `${process.env.EBAY_API_URL}?q=${encodeURIComponent(query)}&limit=10`;
    
    const res = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      },
    });

    const data = await res.json();
    const items = data.itemSummaries;

    if (!items || items.length === 0) return null;

    // 🔥 תיקון 2: חישוב חכם יותר (סינון רעשים)
    const prices = items
      .map((item: unknown) => parseFloat((item as { price: { value: string } }).price.value))
      .filter((p: number) => p > 0)
      .sort((a: number, b: number) => a - b); // מסדרים מהנמוך לגבוה

    if (prices.length === 0) return null;

    // אם יש מספיק תוצאות, זורקים את הכי זול (לרוב זיוף/חלק) ואת הכי יקר (לרוב סתם מוגזם)
    let filteredPrices = prices;
    if (prices.length >= 5) {
      filteredPrices = prices.slice(1, -1); 
    }

    // חישוב ממוצע
    const sum = filteredPrices.reduce((a: number, b: number) => a + b, 0);
    const avg = sum / filteredPrices.length;
    
    return parseFloat(avg.toFixed(2));

  } catch (error) {
    console.error("eBay API Error:", error);
    return null;
  }
}