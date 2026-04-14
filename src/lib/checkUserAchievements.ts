/**
 * Backward-compatible wrappers around the Achievement Engine v2.
 * All achievement logic now lives in achievementEngine.ts.
 * These exports exist so existing call-sites in items/route.ts and trades/route.ts
 * don't need to be refactored in bulk.
 */
import { runAchievementEngine } from "@/lib/achievementEngine";

// Server-safe metadata map — kept here so callers that import ACHIEVEMENT_META still work.
export const ACHIEVEMENT_META: Record<string, { title: string; description: string }> = {
  "first-relic":         { title: "First Relic",         description: "Add your first item to the vault" },
  "growing-collection":  { title: "Growing Collection",  description: "Add 10 items to your vault" },
  "curator":             { title: "The Curator",         description: "Add 50 items to your collection" },
  "century-club":        { title: "Century Club",        description: "Add 100 items to your vault" },
  "five-figures":        { title: "Five Figures",        description: "Vault value reaches $10,000" },
  "heavyweight":         { title: "The Heavyweight",     description: "Surpass $50,000 in total collection value" },
  "six-figure-vault":    { title: "Six-Figure Vault",    description: "Vault value reaches $100,000" },
  "category-curious":    { title: "Category Curious",    description: "Own items in 3 different categories" },
  "category-connoisseur":{ title: "Category Connoisseur",description: "Own items in 5 different categories" },
  "pokemon-purist":      { title: "Pokémon Purist",      description: "Own 20+ Pokémon TCG items" },
  "sneakerhead":         { title: "Sneakerhead",         description: "Own 10+ sneaker items" },
  "brick-architect":     { title: "Brick Architect",     description: "Own 10+ LEGO sets" },
  "sports-fan":          { title: "Sports Fan",          description: "Own 10+ sports cards" },
  "funko-fanatic":       { title: "Funko Fanatic",       description: "Own 10+ Funko Pops" },
  "bulk-upload":         { title: "Bulk Upload",         description: "Add 10 items in a single day" },
  "speedrunner":         { title: "Speedrunner",         description: "Add 25 items in a single week" },
  "early-adopter":       { title: "Early Adopter",       description: "Joined Uniques during the Beta phase" },
  "diamond-hands":       { title: "Diamond Hands",       description: "Hold an item for over 1 year without trading it" },
  "trendsetter":         { title: "Trendsetter",         description: "Receive 100 total likes across your Feed posts" },
  "high-roller":         { title: "High Roller",         description: "Propose a trade with a total value over $10,000" },
  "first-offer":         { title: "First Offer",         description: "Send your first trade offer to someone" },
  "popular-vault":       { title: "Popular Vault",       description: "Receive 5 trade offers in a single week" },
  "first-blood":         { title: "First Blood",         description: "Complete your very first trade" },
  "on-a-roll":           { title: "On a Roll",           description: "Complete 5 successful trades" },
  "dealmaker":           { title: "Dealmaker",           description: "Complete 10 successful trades" },
  "trading-machine":     { title: "Trading Machine",     description: "Complete 25 successful trades" },
  "mega-deal":           { title: "Mega Deal",           description: "Complete a trade with total value over $25,000" },
  "first-follow":        { title: "First Follow",        description: "Follow your first fellow collector" },
  "social-butterfly":    { title: "Social Butterfly",    description: "Follow 25 collectors" },
  "whale-watcher":       { title: "Whale Watcher",       description: "Follow 5 collectors with large collections" },
  "influencer":          { title: "Influencer",          description: "Reach 50 followers" },
  "first-scan":          { title: "First Scan",          description: "Use Magic AI Scan for the first time" },
  "scanner":             { title: "Scanner",             description: "Scan 10 items with Magic AI" },
  "ai-addict":           { title: "AI Addict",           description: "Scan 50 items with Magic AI" },
  "grail-detected":      { title: "Grail Detected",      description: "Scan an item identified as worth $1,000+" },
  "first-impression":    { title: "First Impression",    description: "Complete your profile with avatar, bio, and handle" },
  "pro-collector":       { title: "Pro Collector",       description: "Upgrade to Uniques Pro" },
  "the-negotiator":      { title: "The Negotiator",      description: "Successfully counter-offer and close a deal" },
  "mint-condition":      { title: "Mint Condition",      description: "Add 5 PSA 10 graded items to your collection" },
  "flawless":            { title: "Flawless",            description: "Own 10 items graded PSA 10 or BGS 9.5+" },
  "sniper":              { title: "The Sniper",          description: "Secure a Grail directly from your Radar" },
  "worldwide":           { title: "Mr. Worldwide",       description: "Complete an international trade" },
  "completionist":       { title: "Completionist",       description: "Complete a full Pokémon set from a single era" },
};

/**
 * Check all "item.saved" achievements for a user.
 * Called from POST/PATCH/DELETE /api/items.
 */
export async function checkUserAchievements(
  userId:      string,
  catalystItem?: { name: string; imageUrl: string },
): Promise<string[]> {
  return runAchievementEngine("item.saved", userId, { catalystItem });
}

/**
 * Check High Roller at trade-proposal time.
 * Kept as a named export so the existing POST /api/trades call-site still compiles.
 */
export async function checkHighRoller(
  userId:     string,
  tradeValue: number,
  catalystItem?: { name: string; imageUrl: string },
): Promise<boolean> {
  const ids = await runAchievementEngine("trade.proposed", userId, { tradeValue, catalystItem });
  return ids.includes("high-roller");
}
