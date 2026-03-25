// src/lib/ebay.ts
import { MasterItem, CatalogCategory, CatalogSearchResult } from "./catalog/types";

const EBAY_SCOPES = "https://api.ebay.com/oauth/api_scope";

// ── Token Cache ─────────────────────────────────────────────────────────────
// eBay OAuth tokens last ~7,200 seconds. Cache module-level so every search
// request within the same server process reuses the same token.

let _cachedToken: string | null = null;
let _tokenExpiry = 0;

async function getEbayAccessToken(): Promise<string | null> {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;

  const appId   = process.env.EBAY_APP_ID;
  const certId  = process.env.EBAY_CERT_ID;
  const oauthUrl = process.env.EBAY_OAUTH_URL;

  if (!appId || !certId || !oauthUrl) {
    console.error("[eBay] Missing EBAY_APP_ID / EBAY_CERT_ID / EBAY_OAUTH_URL");
    return null;
  }

  const credentials = Buffer.from(`${appId}:${certId}`).toString("base64");

  const res = await fetch(oauthUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: `grant_type=client_credentials&scope=${encodeURIComponent(EBAY_SCOPES)}`,
  });

  if (!res.ok) {
    console.error("[eBay] OAuth failed:", res.status, await res.text().catch(() => ""));
    return null;
  }

  const data = await res.json();
  _cachedToken = data.access_token ?? null;
  // Refresh 60 seconds before actual expiry to avoid races
  _tokenExpiry = Date.now() + ((data.expires_in ?? 7200) - 60) * 1000;
  return _cachedToken;
}

// ── eBay response types ──────────────────────────────────────────────────────

interface EbayItemSummary {
  itemId: string;
  epid?: string;
  title: string;
  price?: { value: string; currency: string };
  image?: { imageUrl: string };
  additionalImages?: { imageUrl: string }[];
  categories?: { categoryId: string; categoryName: string }[];
}

// ── Image quality helpers ─────────────────────────────────────────────────────
// eBay CDN serves the same asset at multiple sizes via the s-l{N} suffix.
// Requesting s-l640 gives a sharp display image without large file sizes.
function upgradeEbayImageUrl(url: string): string {
  return url.replace(/\bs-l(\d+)\b/, (_, size) =>
    parseInt(size, 10) < 640 ? "s-l640" : `s-l${size}`,
  );
}

// Pick the cleanest available image from an eBay item summary.
// Strategy:
//   1. Prefer any additionalImage URL that does NOT contain "/thumbs/"
//      (eBay puts clean product-catalog shots here for epid-linked items).
//   2. Fall back to the primary listing image.
// In both cases, upgrade the resolution suffix to at least 640 px.
function pickBestEbayImage(
  primary: string,
  additional?: { imageUrl: string }[],
): string {
  if (additional && additional.length > 0) {
    const catalogImg = additional.find((img) => !img.imageUrl.includes("/thumbs/"));
    if (catalogImg) return upgradeEbayImageUrl(catalogImg.imageUrl);
  }
  return upgradeEbayImageUrl(primary);
}

// ── Data enrichment helpers ───────────────────────────────────────────────────
// For categories with dedicated public APIs, we overwrite the eBay seller photo
// with an authoritative, studio-quality image. eBay is kept for pricing only.
// Fallback: if enrichment fails or no data is found, the eBay image is used.

// LEGO: Extract the set number and build a Rebrickable CDN URL.
// Rebrickable's CDN is public and covers virtually every set since ~2000.
// Pattern: 4-digit numbers starting 4-9 (avoids years 1000-3xxx) or any 5-digit.
function enrichLegoImage(title: string): string | null {
  const match = title.match(/\b([4-9]\d{3}|\d{5})\b/);
  if (!match) return null;
  const setNum = match[1];
  return `https://cdn.rebrickable.com/media/sets/${setNum}-1.jpg`;
}

// Pokémon TCG: Two-step enrichment against pokemontcg.io.
//
// Step 1 — Precise: extract "cardNum/setTotal" (e.g. "6/165") from the title.
//   The combination uniquely identifies one set, so pageSize=1 is reliable.
//
// Step 2 — Name fallback: many eBay sellers omit the card number entirely.
//   We extract the Pokémon's name by looking for the word immediately before
//   a known suffix (ex, GX, V, VMAX, VSTAR) or, failing that, the first
//   non-trivial capitalised word in the title.  We then query by name +
//   supertype:Pokémon so we always get a proper card art image.
//
// Respects an optional POKEMON_TCG_API_KEY env var for higher rate limits.

// Common words that are never a Pokémon name.
const POKEMON_SKIP =
  /^(pokemon|pok[eé]mon|\d{1,4}|holo|rare|card|set|booster|pack|psa|bgs|cgc|sgc|nm|mint|lp|mp|hp|played|lot|bundle|collection|japanese|english|unlimited|first|1st|edition|promo|full|art|rainbow|secret|shiny|alternate|trainer|gallery|illustration|special|grade|graded|raw)$/i;

function extractPokemonName(title: string): string | null {
  // Strategy 1: word immediately before a card-type suffix
  const beforeSuffix = title.match(/\b([A-Z][a-zA-Z'-]{2,})\s+(?:ex|GX|VMAX|VSTAR|EX|V\b)/);
  if (beforeSuffix) return beforeSuffix[1];

  // Strategy 2: first non-trivial capitalised word
  for (const raw of title.split(/\s+/)) {
    const word = raw.replace(/[^a-zA-Z'-]/g, "");
    if (word.length < 3) continue;
    if (!/^[A-Z]/.test(word)) continue;
    if (POKEMON_SKIP.test(word)) continue;
    return word;
  }
  return null;
}

async function enrichPokemonImage(title: string): Promise<string | null> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 3000);

  const headers: HeadersInit = { Accept: "application/json" };
  const key = process.env.POKEMON_TCG_API_KEY;
  if (key) (headers as Record<string, string>)["X-Api-Key"] = key;

  async function query(q: string): Promise<string | null> {
    const res = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=1&select=images`,
      { headers, signal: controller.signal },
    );
    if (!res.ok) return null;
    const data = await res.json() as { data?: { images?: { large?: string } }[] };
    return data.data?.[0]?.images?.large ?? null;
  }

  try {
    // Step 1: precise number+total match
    const numMatch = title.match(/\b(\d{1,3})\s*\/\s*(\d{2,3})\b/);
    if (numMatch) {
      const img = await query(`number:${numMatch[1]} set.total:${numMatch[2]}`);
      if (img) { clearTimeout(tid); return img; }
    }

    // Step 2: name-based fallback
    const name = extractPokemonName(title);
    if (name) {
      const img = await query(`name:"${name}" supertype:Pokémon`);
      if (img) { clearTimeout(tid); return img; }
    }

    clearTimeout(tid);
    return null;
  } catch {
    clearTimeout(tid);
    return null;
  }
}

// ── Category mapping ─────────────────────────────────────────────────────────
// Primary detection: eBay leaf category IDs (precise, fast).
// Secondary detection: title keywords (covers edge-cases and misclassified listings).
// Default: "Other" — never fall back to "Trading Cards" for unrecognised items.

// Known eBay category IDs relevant to collectibles.
// Stored as arrays so we can call .some(id => idSet.has(id)) without spreading a Set.
const CAT_CCG        = ["2536", "64482", "183454"];       // CCG/Trading Cards
const CAT_SPORTS     = ["261328", "214"];                  // Sports Trading Cards
const CAT_SNEAKERS   = ["15709", "95672", "57929", "3034"]; // Athletic shoes
const CAT_COINS      = ["11116", "39482", "162", "4"];    // Coins & Paper Money
const CAT_WATCHES    = ["14324", "31387", "260325"];       // Watches
const CAT_VIDEOGAMES = ["983", "1249", "139973"];          // Video Games & Consoles
const CAT_COMICS     = ["259104", "63", "259100"];         // Comic Books
const CAT_LEGO       = ["50168", "233"];                   // Building Toys / LEGO
const CAT_FIGURES    = ["261068", "166717", "165861"];     // Action Figures

function mapEbayCategory(
  title: string,
  cats: { categoryId: string; categoryName: string }[] = [],
): CatalogCategory {
  const t      = title.toLowerCase();
  const idSet  = new Set(cats.map((c) => c.categoryId));
  const cnames = cats.map((c) => c.categoryName.toLowerCase()).join(" ");

  // ── Tier 1: eBay category ID (most precise) ──────────────────────────────

  if (idSet.size > 0) {
    // Sneakers — check before CCG to catch mixed-listing edge cases
    if (CAT_SNEAKERS.some((id) => idSet.has(id))) return "Sneakers";

    // Coins / Bullion
    if (CAT_COINS.some((id) => idSet.has(id))) return "Coins";

    // Watches
    if (CAT_WATCHES.some((id) => idSet.has(id))) return "Watches";

    // Video Games
    if (CAT_VIDEOGAMES.some((id) => idSet.has(id))) return "Video Games";

    // Comics
    if (CAT_COMICS.some((id) => idSet.has(id))) return "Comics";

    // LEGO / Building Toys
    if (CAT_LEGO.some((id) => idSet.has(id))) return "Lego";

    // Action Figures — check title to decide Funko vs generic
    if (CAT_FIGURES.some((id) => idSet.has(id))) {
      if (t.includes("funko") || t.includes("pop!") || t.includes("pop vinyl")) return "Funko Pop";
      return "Other";
    }

    // Sports Trading Cards
    if (CAT_SPORTS.some((id) => idSet.has(id))) return "Sports Cards";

    // CCG / Trading Cards — drill into title to distinguish Pokémon from other TCGs
    if (CAT_CCG.some((id) => idSet.has(id))) {
      if (t.includes("pokemon") || t.includes("pikachu") || t.includes("charizard") ||
          t.includes("eevee") || t.includes("mewtwo") || t.includes("bulbasaur"))
        return "Pokémon TCG";
      if (t.includes("magic") || t.includes("mtg ") || t.includes("yu-gi-oh") ||
          t.includes("yugioh") || t.includes("digimon") || t.includes("lorcana"))
        return "Other TCG";
      if (t.includes("baseball") || t.includes("basketball") || t.includes("football") ||
          t.includes("soccer") || t.includes("nba") || t.includes("nfl") ||
          t.includes("topps") || t.includes("panini") || t.includes("upper deck"))
        return "Sports Cards";
      return "Trading Cards";
    }
  }

  // ── Tier 2: title keywords (fallback when category IDs absent) ────────────

  // Pokémon
  if (t.includes("pokemon") || t.includes("pikachu") || t.includes("charizard") ||
      t.includes("mewtwo") || t.includes("eevee") || t.includes("bulbasaur"))
    return "Pokémon TCG";

  // Other TCG
  if (t.includes("magic the gathering") || t.includes("mtg ") || t.includes("yu-gi-oh") ||
      t.includes("yugioh") || t.includes("digimon card") || t.includes("lorcana"))
    return "Other TCG";

  // Sports Cards
  if (t.includes("baseball card") || t.includes("basketball card") ||
      t.includes("football card") || t.includes("nba card") || t.includes("nfl card") ||
      t.includes("topps") || t.includes("panini ") || t.includes("upper deck"))
    return "Sports Cards";

  // Funko Pop
  if (t.includes("funko") || t.includes("pop vinyl")) return "Funko Pop";

  // LEGO
  if (t.includes("lego ") || cnames.includes("lego")) return "Lego";

  // Sneakers
  if (t.includes("air jordan") || t.includes("nike dunk") || t.includes("air force 1") ||
      t.includes("yeezy") || t.includes("new balance") || t.includes("adidas ultraboost") ||
      cnames.includes("athletic shoe") || cnames.includes("sneaker"))
    return "Sneakers";

  // Watches
  if (t.includes("rolex") || t.includes("omega watch") || t.includes("seiko ") ||
      t.includes("wristwatch") || t.includes("automatic watch") || cnames.includes("watch"))
    return "Watches";

  // Coins
  if (t.includes("silver coin") || t.includes("gold coin") || t.includes("morgan dollar") ||
      t.includes("american eagle") || t.includes("bullion"))
    return "Coins";

  // Comics
  if (t.includes("comic book") || t.includes("graphic novel")) return "Comics";

  // Video Games
  if (t.includes("playstation game") || t.includes("xbox game") ||
      t.includes("nintendo switch game") || t.includes("pc game sealed"))
    return "Video Games";

  // Anything unrecognised: "Other", never "Trading Cards"
  return "Other";
}

// ── Deduplication helpers ─────────────────────────────────────────────────────
// eBay returns individual *listings*, not products. A single card can appear
// 50+ times with different sellers. We collapse duplicates using:
//   1. epid  — eBay Product ID (stable across all listings of the same product)
//   2. title slug — normalized title prefix (for listings without epid)

const NOISE_WORDS = /\b(new|sealed|lot|bundle|set|complete|used|like|near|mint|nm|ex|vg|raw|rare|holo|psa|bgs|cgc|sgc|grade|graded|single|card|pack|booster|lot|bulk|collection|authentic|genuine|official|original|japanese|english|unlimited|1st|first|edition)\b/g;

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(NOISE_WORDS, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 35);          // first ~35 chars of meaningful content
}

// ── Raw eBay fetch (single category) ─────────────────────────────────────────
// Shared by both the single-category and fan-out paths. Returns raw eBay item
// summaries (no enrichment, no dedup) plus the API-reported result total.
//
// Note: eBay Browse API rejects category_ids with more than one value, which is
// why fan-out (one request per ID) is the correct approach.
const NEGATIVE_KW = "-mystery -box -repack -proxy -custom -lot";

async function fetchRawEbay(
  token: string,
  apiUrl: string,
  query: string,
  limit: number,
  offset: number,
  categoryId?: string,
  minPrice?: number,
  maxPrice?: number,
): Promise<{ summaries: EbayItemSummary[]; total: number }> {
  // Append wildcard so partial inputs (e.g. "chari") prefix-match full words
  // ("charizard", "charity" …). eBay Browse API does not fuzzy-match by default.
  const wildcardQuery = query.trim().endsWith("*") ? query.trim() : `${query.trim()}*`;

  const url = new URL(apiUrl);
  url.searchParams.set("q", `${wildcardQuery} ${NEGATIVE_KW}`);
  // eBay requires offset to be an exact multiple of limit — compute both from
  // the same capped value so they can never diverge and cause a 400 error.
  const validLimit  = Math.min(limit, 50);
  const validOffset = Math.floor(offset / validLimit) * validLimit;
  url.searchParams.set("limit",  String(validLimit));
  url.searchParams.set("offset", String(validOffset));
  // Native price floor + descending price sort — eBay applies these before
  // returning results, so our 50-item payload is already premium-biased and
  // we no longer need a local sort or a local price-floor filter.
  const priceMin = minPrice ?? 15;
  const priceFilter = maxPrice
    ? `price:[${priceMin}..${maxPrice}]`
    : `price:[${priceMin}..]`;
  // Include both fixed-price and auction listings so that collectibles
  // predominantly sold at auction (Rolex, coins, rare sneakers, comics)
  // still appear in the feed. Both formats carry a price value.
  url.searchParams.set("filter", `buyingOptions:{FIXED_PRICE|AUCTION},${priceFilter},priceCurrency:USD`);
  url.searchParams.set("sort", "-price");
  if (categoryId) url.searchParams.set("category_ids", categoryId);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
    },
  });

  if (!res.ok) {
    console.error(
      "[eBay Search] HTTP", res.status,
      `category=${categoryId ?? "none"}`,
      await res.text().catch(() => ""),
    );
    return { summaries: [], total: 0 };
  }

  const data = await res.json();
  return {
    summaries: (data.itemSummaries ?? []) as EbayItemSummary[],
    total:     (data.total ?? 0)          as number,
  };
}

// ── Semantic category router ──────────────────────────────────────────────────
// Maps well-known collector keywords to a single, precise eBay leaf category ID.
// A direct category hit is far more accurate than fan-out across broad parents:
// "rolex" → Wristwatches (31387) vs the default which includes Accessories & Parts.
// Returns null when no keyword match is found, falling back to fan-out logic.
export function getSmartCategory(query: string): string | null {
  const q = query.toLowerCase();
  if (q.includes("rolex") || q.includes("omega") || q.includes("seiko") ||
      q.includes("watch"))                           return "31387";  // Wristwatches
  if (q.includes("coin") || q.includes("bullion") ||
      q.includes("silver") || q.includes("gold coin")) return "11116"; // Coins & Paper Money
  if (q.includes("hot wheels") || q.includes("matchbox") ||
      q.includes("diecast"))                         return "222";    // Diecast & Toy Vehicles
  if (q.includes("lego"))                            return "19006";  // LEGO Complete Sets & Packs
  if (q.includes("funko"))                           return "246";    // Action Figures
  if (q.includes("pokemon") || q.includes("pokémon") ||
      q.includes("charizard") || q.includes("pikachu") ||
      q.includes("tcg"))                             return "183454"; // CCG Individual Cards
  if (q.includes("magic") || q.includes("mtg") ||
      q.includes("yu-gi-oh") || q.includes("yugioh") ||
      q.includes("lorcana") || q.includes("digimon"))return "183454"; // CCG Individual Cards
  if (q.includes("jordan") || q.includes("yeezy") ||
      q.includes("dunk") || q.includes("sneaker"))   return "15709";  // Athletic Shoes
  return null;
}

// ── Public: Search eBay for catalog items ────────────────────────────────────
// Returns a CatalogSearchResult so the catalog search route can use the same
// shape regardless of whether results came from eBay or the local seed data.
//
// masterId priority: epid (stable eBay product ID) → itemId (per-listing)
// Using epid means two users listing the same card share a masterId, enabling
// reliable Tier-1 matching in MarketplaceModal.
//
// Fan-out: eBay Browse API only accepts a SINGLE category_ids value per call.
// When multiple IDs are supplied (comma-separated), we issue one request per ID
// in parallel via Promise.allSettled, interleave the results round-robin, then
// deduplicate before enrichment.

export async function searchEbayItems(
  query: string,
  options: { limit?: number; offset?: number; categoryIds?: string; minPrice?: number; maxPrice?: number } = {},
): Promise<CatalogSearchResult> {
  const { limit = 20, offset = 0, categoryIds, minPrice, maxPrice } = options;
  const empty: CatalogSearchResult = {
    items: [], total: 0, page: 1, pageSize: limit, totalPages: 0, query,
  };

  if (!query || query.length < 2) return empty;

  const apiUrl = process.env.EBAY_API_URL;
  if (!apiUrl) {
    console.error("[eBay] Missing EBAY_API_URL");
    return empty;
  }

  try {
    const token = await getEbayAccessToken();
    if (!token) return empty;

    // ── Fetch phase: semantic → fan-out → single ─────────────────────────────
    let summaries: EbayItemSummary[];
    let total: number;
    const rawFetchLimit = Math.max(limit, 50);

    const smartCat = getSmartCategory(query);

    if (smartCat) {
      // Semantic routing: one precisely targeted request, zero contamination.
      // e.g. "rolex" → Wristwatches (31387) only — no wallets, no accessories.
      const result = await fetchRawEbay(token, apiUrl, query, rawFetchLimit, offset, smartCat, minPrice, maxPrice);
      summaries = result.summaries;
      total     = result.total;
    } else if (categoryIds && categoryIds.includes(",")) {
      // Fan-out: one request per category ID, then pick the dominant response.
      const ids = categoryIds.split(",").map((s) => s.trim()).filter(Boolean);

      const settled = await Promise.allSettled(
        ids.map((id) => fetchRawEbay(token, apiUrl, query, rawFetchLimit, offset, id, minPrice, maxPrice)),
      );

      const successful = settled.filter(
        (r): r is PromiseFulfilledResult<{ summaries: EbayItemSummary[]; total: number }> =>
          r.status === "fulfilled",
      );

      if (successful.length === 0) return empty;

      // Dominant category = highest total matches for this query. That category's
      // items fill the response exclusively — no cross-category contamination.
      const dominantResponse = successful.reduce((best, cur) =>
        cur.value.total > best.value.total ? cur : best,
      );

      summaries = dominantResponse.value.summaries;
      total     = dominantResponse.value.total;
    } else {
      // Single explicit category or no restriction
      const result = await fetchRawEbay(token, apiUrl, query, rawFetchLimit, offset, categoryIds, minPrice, maxPrice);
      summaries = result.summaries;
      total     = result.total;
    }

    // ── Dedup + quality filter ────────────────────────────────────────────────
    // epid is NOT required — vintage coins, Rolexes, and diecast cars rarely
    // carry one. An item is valid if it has an id, title, price, and image.
    // Dedup prefers epid (stable product ID) but falls back to itemId so that
    // non-epid items are never silently discarded.
    // Price floor and sort are handled natively by eBay (see fetchRawEbay),
    // so no local sort or price filter is needed here.
    const seenKeys = new Set<string>();

    const filtered = summaries
      .filter((s) => s.image?.imageUrl && s.price?.value)
      .filter((s) => {
        const key = s.epid ?? s.itemId;
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      })
      .slice(0, limit);

    // ── Image enrichment ──────────────────────────────────────────────────────
    //   Lego      → Rebrickable CDN box art (synchronous URL, no API call)
    //   Pokémon   → pokemontcg.io official card scan (async, 2.5 s timeout)
    //   All else  → best available eBay image (upgraded CDN resolution)
    const items: MasterItem[] = await Promise.all(
      filtered.map(async (s) => {
        const category  = mapEbayCategory(s.title, s.categories);
        const baseImage = pickBestEbayImage(s.image!.imageUrl, s.additionalImages);

        let imageUrl = baseImage;
        if (category === "Lego") {
          imageUrl = enrichLegoImage(s.title) ?? baseImage;
        } else if (category === "Pokémon TCG") {
          imageUrl = (await enrichPokemonImage(s.title)) ?? baseImage;
        }

        return {
          id:          s.epid ?? s.itemId,
          name:        s.title,
          category,
          subCategory: s.categories?.[0]?.categoryName ?? "eBay",
          imageSmall:  imageUrl,
          imageLarge:  imageUrl,
          marketPrice: parseFloat(s.price!.value),
          lastUpdated: new Date().toISOString().split("T")[0],
        };
      }),
    );

    const page       = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);

    return { items, total, page, pageSize: limit, totalPages, query };
  } catch (err) {
    console.error("[eBay Search] Error:", err instanceof Error ? err.message : err);
    return empty;
  }
}

// ── Public: Market price (existing — used by /api/ebay/pricing) ─────────────

export async function getEbayMarketPrice(query: string): Promise<number | null> {
  try {
    const token = await getEbayAccessToken();
    if (!token) return null;

    const apiUrl = process.env.EBAY_API_URL;
    if (!apiUrl) return null;

    const searchUrl = `${apiUrl}?q=${encodeURIComponent(query)}&limit=10`;

    const res = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      },
    });

    const data = await res.json();
    const items = data.itemSummaries;
    if (!items || items.length === 0) return null;

    const prices = items
      .map((item: unknown) => parseFloat((item as { price: { value: string } }).price.value))
      .filter((p: number) => p > 0)
      .sort((a: number, b: number) => a - b);

    if (prices.length === 0) return null;

    // Drop outliers when we have enough samples
    let filtered = prices;
    if (prices.length >= 5) filtered = prices.slice(1, -1);

    const avg = filtered.reduce((a: number, b: number) => a + b, 0) / filtered.length;
    return parseFloat(avg.toFixed(2));
  } catch (error) {
    console.error("[eBay] Market price error:", error);
    return null;
  }
}
