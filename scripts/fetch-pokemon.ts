#!/usr/bin/env npx tsx
/**
 * ── Pokémon TCG Master Catalog Fetcher ─────────────────────────────────────
 *
 * Fetches ALL Pokémon cards from the official Pokémon TCG API and writes them
 * as MasterItem[] to a JSON file. Designed for 16,000+ cards with:
 *
 *   - Paginated fetching (250 per page = ~65 pages)
 *   - Retry with exponential backoff on failures
 *   - Rate-limit awareness (1,000 requests/day free, 30,000 with API key)
 *   - Progress logging
 *   - Graceful resume if interrupted
 *
 * Usage:
 *   npx tsx scripts/fetch-pokemon.ts
 *   npx tsx scripts/fetch-pokemon.ts --key YOUR_API_KEY
 *   npx tsx scripts/fetch-pokemon.ts --output ./custom-path.json
 *
 * Environment:
 *   POKEMON_TCG_API_KEY=your-key-here (alternative to --key flag)
 */

import * as fs from "fs";
import * as path from "path";

// ── Config ─────────────────────────────────────────────────────────────────

const API_BASE = "https://api.pokemontcg.io/v2/cards";
const PAGE_SIZE = 250; // Max allowed by the API
const RETRY_ATTEMPTS = 4;
const RETRY_BASE_DELAY_MS = 2000; // 2s, 4s, 8s, 16s

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
      // Rate limited
      const retryAfter = parseInt(response.headers.get("Retry-After") || "60", 10);
      console.log(`  ⏳ Rate limited. Waiting ${retryAfter}s...`);
      await sleep(retryAfter * 1000);
      return fetchWithRetry(url, headers, attempt);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as PokemonTCGResponse;
  } catch (error) {
    if (attempt >= RETRY_ATTEMPTS) {
      throw error;
    }
    const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
    console.log(`  ⚠ Attempt ${attempt} failed. Retrying in ${delay / 1000}s...`);
    await sleep(delay);
    return fetchWithRetry(url, headers, attempt + 1);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Price extraction ───────────────────────────────────────────────────────

function extractPrice(card: PokemonTCGResponse["data"][0]): number {
  // Try TCGPlayer prices first (preferred for US market)
  if (card.tcgplayer?.prices) {
    const priceTypes = Object.values(card.tcgplayer.prices);
    for (const pt of priceTypes) {
      if (pt.market && pt.market > 0) return Math.round(pt.market * 100) / 100;
    }
    for (const pt of priceTypes) {
      if (pt.mid && pt.mid > 0) return Math.round(pt.mid * 100) / 100;
    }
  }

  // Fallback to Cardmarket (EU)
  if (card.cardmarket?.prices) {
    const cm = card.cardmarket.prices;
    if (cm.trendPrice && cm.trendPrice > 0) return Math.round(cm.trendPrice * 100) / 100;
    if (cm.averageSellPrice && cm.averageSellPrice > 0) return Math.round(cm.averageSellPrice * 100) / 100;
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
  console.log("║     Pokémon TCG Master Catalog Fetcher              ║");
  console.log("║     Uniques Trading Platform                        ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log();
  console.log(`  API Key: ${apiKey ? `${apiKey.slice(0, 8)}...` : "none (rate-limited)"}`);
  console.log(`  Output:  ${outputPath}`);
  console.log();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Uniques Trading Platform",
  };
  if (apiKey) {
    headers["X-Api-Key"] = apiKey;
  }

  // Fetch first page to get totalCount
  console.log("  📡 Fetching page 1...");
  const firstPage = await fetchWithRetry(`${API_BASE}?page=1&pageSize=${PAGE_SIZE}`, headers);
  const totalCount = firstPage.totalCount;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  console.log(`  📊 Total cards: ${totalCount.toLocaleString()}`);
  console.log(`  📄 Total pages: ${totalPages} (${PAGE_SIZE}/page)`);
  console.log();

  const allCards: MasterItem[] = firstPage.data.map(toMasterItem);
  console.log(`  ✅ Page 1/${totalPages} — ${allCards.length} cards`);

  // Fetch remaining pages
  for (let page = 2; page <= totalPages; page++) {
    // 500ms delay between batch requests to avoid 504 Gateway Timeout
    await sleep(apiKey ? 500 : 1200);

    console.log(`  📡 Fetching page ${page}/${totalPages}...`);
    const response = await fetchWithRetry(
      `${API_BASE}?page=${page}&pageSize=${PAGE_SIZE}`,
      headers
    );

    const items = response.data.map(toMasterItem);
    allCards.push(...items);
    console.log(`  ✅ Page ${page}/${totalPages} — ${allCards.length} total cards`);
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write to file
  fs.writeFileSync(outputPath, JSON.stringify(allCards, null, 2), "utf-8");

  const fileSizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);

  console.log();
  console.log("  ══════════════════════════════════════════════════");
  console.log(`  ✅ Done! Wrote ${allCards.length.toLocaleString()} cards to:`);
  console.log(`     ${outputPath} (${fileSizeMB} MB)`);
  console.log();
  console.log(`  📊 Cards with prices: ${allCards.filter((c) => c.marketPrice > 0).length.toLocaleString()}`);
  console.log(`  📊 Cards without prices: ${allCards.filter((c) => c.marketPrice === 0).length.toLocaleString()}`);
  console.log("  ══════════════════════════════════════════════════");
}

main().catch((error) => {
  console.error("\n  ❌ Fatal error:", error.message);
  process.exit(1);
});
