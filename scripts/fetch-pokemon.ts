#!/usr/bin/env npx tsx
/**
 * ── Pokémon TCG Master Catalog Fetcher ─────────────────────────────────────
 *
 * Fetches ALL Pokémon cards from the official Pokémon TCG API and writes them
 * as MasterItem[] to a JSON file.
 *
 * Features:
 *   - While-loop pagination (250 per page)
 *   - 500ms delay between pages to avoid 504 Gateway Timeout
 *   - Retry up to 3 times per page with exponential backoff
 *   - Graceful failure: saves all collected data if a page permanently fails
 *   - Progress logging per page
 *   - User-Agent header on every request
 *
 * Usage:
 *   npx tsx scripts/fetch-pokemon.ts
 *   POKEMON_TCG_API_KEY=your-key npx tsx scripts/fetch-pokemon.ts
 */

import * as fs from "fs";
import * as path from "path";

// ── Config ─────────────────────────────────────────────────────────────────

const API_BASE = "https://api.pokemontcg.io/v2/cards";
const PAGE_SIZE = 250;
const MAX_RETRIES = 3;
const DELAY_BETWEEN_PAGES_MS = 500;
const OUTPUT_PATH = path.join(process.cwd(), "src/lib/data/pokemon_master.json");

// ── Types ──────────────────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function saveResults(cards: MasterItem[], outputPath: string) {
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(cards, null, 2), "utf-8");
  const fileSizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
  console.log(`\n  Saved ${cards.length.toLocaleString()} cards to ${outputPath} (${fileSizeMB} MB)`);
}

// ── Fetch a single page with up to MAX_RETRIES attempts ───────────────────

async function fetchPage(
  page: number,
  headers: Record<string, string>
): Promise<PokemonTCGResponse> {
  const url = `${API_BASE}?page=${page}&pageSize=${PAGE_SIZE}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, { headers });

      // Handle rate limiting — wait and retry (doesn't count as a failure)
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "60", 10);
        console.log(`  Rate limited. Waiting ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        attempt--; // Don't count rate limits against retry budget
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as PokemonTCGResponse;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (attempt < MAX_RETRIES) {
        const delay = 1000 * Math.pow(2, attempt); // 2s, 4s, 8s
        console.log(`  Attempt ${attempt}/${MAX_RETRIES} failed: ${msg}. Retrying in ${delay / 1000}s...`);
        await sleep(delay);
      } else {
        throw new Error(`Page ${page} failed after ${MAX_RETRIES} attempts: ${msg}`);
      }
    }
  }

  // Unreachable, but TypeScript needs it
  throw new Error(`Page ${page} failed unexpectedly`);
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.POKEMON_TCG_API_KEY || "";

  console.log("══════════════════════════════════════════════════════");
  console.log("  Pokemon TCG Master Catalog Fetcher");
  console.log("  Uniques Trading Platform");
  console.log("══════════════════════════════════════════════════════");
  console.log(`  API Key: ${apiKey ? `${apiKey.slice(0, 8)}...` : "none (rate-limited)"}`);
  console.log(`  Output:  ${OUTPUT_PATH}`);
  console.log(`  Batch size: ${PAGE_SIZE} cards/page`);
  console.log(`  Delay: ${DELAY_BETWEEN_PAGES_MS}ms between pages`);
  console.log();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Uniques Trading Platform",
  };
  if (apiKey) {
    headers["X-Api-Key"] = apiKey;
  }

  const allCards: MasterItem[] = [];
  let page = 1;
  let totalCount = 0;
  let hasMore = true;

  // While-loop pagination: keep fetching until we have all cards
  while (hasMore) {
    console.log(`  Fetching page ${page}...`);

    try {
      const response = await fetchPage(page, headers);

      // On the first page, log the total
      if (page === 1) {
        totalCount = response.totalCount;
        const totalPages = Math.ceil(totalCount / PAGE_SIZE);
        console.log(`  Total cards available: ${totalCount.toLocaleString()} (~${totalPages} pages)`);
      }

      const items = response.data.map(toMasterItem);
      allCards.push(...items);

      console.log(`  Page ${page} done. Saved ${items.length} cards. Total so far: ${allCards.length.toLocaleString()}`);

      // Check if there are more pages
      if (allCards.length >= totalCount || response.data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        page++;
        // Rate-limit delay between pages
        await sleep(DELAY_BETWEEN_PAGES_MS);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`\n  ERROR: ${msg}`);
      console.log(`  Stopping early. Saving ${allCards.length.toLocaleString()} cards collected so far...`);

      // Save whatever we have so we don't lose everything
      if (allCards.length > 0) {
        saveResults(allCards, OUTPUT_PATH);
      }

      console.log("  Partial save complete. Re-run the script to try again.");
      process.exit(1);
    }
  }

  // Final save
  saveResults(allCards, OUTPUT_PATH);

  const withPrices = allCards.filter((c) => c.marketPrice > 0).length;
  console.log(`  Cards with prices: ${withPrices.toLocaleString()}`);
  console.log(`  Cards without prices: ${(allCards.length - withPrices).toLocaleString()}`);
  console.log("══════════════════════════════════════════════════════");
  console.log("  Done!");
}

main().catch((error) => {
  console.error("\n  Fatal error:", error.message);
  process.exit(1);
});
