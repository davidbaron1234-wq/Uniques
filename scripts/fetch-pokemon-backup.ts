#!/usr/bin/env npx tsx
/**
 * ── Pokémon TCG Master Catalog Fetcher ─────────────────────────────────────
 * גירסה מעודכנת עם User-Agent למניעת שגיאות 504
 */

import * as fs from "fs";
import * as path from "path";

// ── Config ─────────────────────────────────────────────────────────────────
const API_BASE = "https://api.pokemontcg.io/v2/cards";
const PAGE_SIZE = 250; 
const RETRY_ATTEMPTS = 5;
const RETRY_BASE_DELAY_MS = 3000; 

interface MasterItem {
  id: string;
  name: string;
  category: "Trading Cards";
  subCategory: "Pokémon TCG";
  set?: string;
  series?: string;
  rarity?: string;
  imageSmall: string;
  imageLarge: string;
  marketPrice: number;
  lastUpdated?: string;
}

interface PokemonTCGResponse {
  data: Array<{
    id: string;
    name: string;
    set: { id: string; name: string; series: string };
    number: string;
    rarity?: string;
    images: { small: string; large: string };
    tcgplayer?: {
      updatedAt?: string;
      prices?: Record<string, { market?: number; mid?: number }>;
    };
    cardmarket?: {
      prices?: { averageSellPrice?: number; trendPrice?: number };
    };
  }>;
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

// ── Argument parsing ───────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  let apiKey = process.env.POKEMON_TCG_API_KEY || "";
  let outputPath = path.join(process.cwd(), "src/lib/data/pokemon_master.json");

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--key" && args[i + 1]) {
      apiKey = args[i + 1];
      i++;
    } else if (args[i] === "--output" && args[i + 1]) {
      outputPath = args[i + 1];
      i++;
    }
  }
  return { apiKey, outputPath };
}

// ── Fetch with retry ───────────────────────────────────────────────────────
async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  attempt = 1
): Promise<PokemonTCGResponse> {
  try {
    const response = await fetch(url, { headers });

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("Retry-After") || "60", 10);
      console.log(`  ⏳ Rate limited. Waiting ${retryAfter}s...`);
      await sleep(retryAfter * 1000);
      return fetchWithRetry(url, headers, attempt);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as PokemonTCGResponse;
  } catch (error: any) {
    if (attempt >= RETRY_ATTEMPTS) {
      throw error;
    }
    const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
    console.log(`  ⚠ Attempt ${attempt} failed (${error.message}). Retrying in ${delay / 1000}s...`);
    await sleep(delay);
    return fetchWithRetry(url, headers, attempt + 1);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Price extraction ───────────────────────────────────────────────────────
function extractPrice(card: PokemonTCGResponse["data"][0]): number {
  if (card.tcgplayer?.prices) {
    const priceTypes = Object.values(card.tcgplayer.prices);
    for (const pt of priceTypes) {
      if (pt.market && pt.market > 0) return Math.round(pt.market * 100) / 100;
    }
  }
  if (card.cardmarket?.prices) {
    const cm = card.cardmarket.prices;
    if (cm.trendPrice && cm.trendPrice > 0) return Math.round(cm.trendPrice * 100) / 100;
  }
  return 0;
}

// ── Transform to MasterItem ────────────────────────────────────────────────
function toMasterItem(card: PokemonTCGResponse["data"][0]): MasterItem {
  return {
    id: `ptcg-${card.id}`,
    name: card.name,
    category: "Trading Cards",
    subCategory: "Pokémon TCG",
    set: card.set.name,
    series: card.set.series,
    rarity: card.rarity || "Unknown",
    imageSmall: card.images.small,
    imageLarge: card.images.large,
    marketPrice: extractPrice(card),
    lastUpdated: card.tcgplayer?.updatedAt || new Date().toISOString(),
  };
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const { apiKey, outputPath } = parseArgs();

  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║     Pokémon TCG Master Catalog Fetcher               ║");
  console.log("║     Uniques Trading Platform                         ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  };

  if (apiKey) {
    headers["X-Api-Key"] = apiKey;
  }

  console.log("  📡 Fetching page 1...");
  const firstPage = await fetchWithRetry(`${API_BASE}?page=1&pageSize=${PAGE_SIZE}`, headers);
  const totalCount = firstPage.totalCount;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  console.log(`  📊 Total cards: ${totalCount.toLocaleString()}`);
  console.log(`  📄 Total pages: ${totalPages}`);
  console.log();

  const allCards: MasterItem[] = firstPage.data.map(toMasterItem);
  console.log(`  ✅ Page 1/${totalPages} — ${allCards.length} cards`);

  for (let page = 2; page <= totalPages; page++) {
    // delay to be safe
    await sleep(apiKey ? 500 : 2000);

    console.log(`  📡 Fetching page ${page}/${totalPages}...`);
    try {
        const response = await fetchWithRetry(
          `${API_BASE}?page=${page}&pageSize=${PAGE_SIZE}`,
          headers
        );
        const items = response.data.map(toMasterItem);
        allCards.push(...items);
        console.log(`  ✅ Page ${page}/${totalPages} — ${allCards.length} total cards`);
    } catch (e) {
        console.log(`  ❌ Skipped page ${page} due to multiple failures.`);
    }
  }

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(allCards, null, 2), "utf-8");
  const fileSizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);

  console.log(`\n  ✅ Done! Wrote ${allCards.length.toLocaleString()} cards (${fileSizeMB} MB)`);
}

main().catch((error) => {
  console.error("\n  ❌ Fatal error:", error.message);
  process.exit(1);
});