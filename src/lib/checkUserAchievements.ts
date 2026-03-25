import { prisma } from "@/lib/prisma";

// Server-safe metadata (no Lucide imports)
export const ACHIEVEMENT_META: Record<string, { title: string; description: string }> = {
  "heavyweight":      { title: "The Heavyweight",   description: "Surpass $50,000 in total collection value" },
  "dealmaker":        { title: "Dealmaker",          description: "Complete 10 successful trades" },
  "first-blood":      { title: "First Blood",        description: "Complete your very first trade" },
  "high-roller":      { title: "High Roller",        description: "Propose a trade with a total value over $10,000" },
  "early-adopter":    { title: "Early Adopter",      description: "Joined Uniques during the Beta phase" },
  "curator":          { title: "The Curator",        description: "Add 50 items to your collection" },
  "trendsetter":      { title: "Trendsetter",        description: "Receive 100 total likes across your Feed posts" },
  "diamond-hands":    { title: "Diamond Hands",      description: "Hold an item for over 1 year without trading it" },
  "whale-watcher":    { title: "Whale Watcher",      description: "Follow 5 users with large collections" },
  "flawless":         { title: "Flawless",           description: "Own 10 items graded PSA 10 or BGS 9.5+" },
  "mint-condition":   { title: "Mint Condition",     description: "Add 5 PSA 10 graded items to your collection" },
  "sniper":           { title: "The Sniper",         description: "Secure a Grail directly from your Radar" },
  "worldwide":        { title: "Mr. Worldwide",      description: "Complete an international trade" },
  "the-negotiator":   { title: "The Negotiator",     description: "Successfully counter-offer and close a deal" },
  "completionist":    { title: "Completionist",      description: "Complete a full Pokémon set from a single era" },
};

/**
 * Unlock an achievement if not already unlocked.
 * Creates a UserAchievement record + Activity post.
 * Does NOT create a Notification — the frontend handles that via addNotification
 * to avoid the server/client double-notification bug.
 * Returns true if this was a new unlock.
 */
async function unlockIfNew(
  userId:       string,
  achievementId: string,
  unlockedSet:  Set<string>,
  catalystItem?: { name: string; imageUrl: string },
): Promise<boolean> {
  if (unlockedSet.has(achievementId)) return false;

  await prisma.userAchievement.create({
    data: {
      userId,
      achievementId,
      catalystName:  catalystItem?.name  ?? null,
      catalystImage: catalystItem?.imageUrl ?? null,
    },
  });
  unlockedSet.add(achievementId);

  // Post to social "My Activity" feed
  const meta = ACHIEVEMENT_META[achievementId];
  if (meta) {
    prisma.activity.create({
      data: {
        userId,
        type:     "achievement_unlocked",
        title:    `Unlocked: ${meta.title}`,
        imageUrl: catalystItem?.imageUrl ?? "",
        metadata: { achievementId, description: meta.description },
      },
    }).catch(() => {});
  }

  return true;
}

/**
 * Server-side achievement engine.
 * Run after any vault mutation (add / edit / delete).
 * Returns IDs of achievements newly unlocked this call.
 *
 * Implemented (11/15):
 *   heavyweight, curator, early-adopter, diamond-hands, trendsetter,
 *   whale-watcher  ← server-side (this function)
 *   first-blood, dealmaker, high-roller, flawless, mint-condition
 *                  ← client-side via unlockAchievement() in AchievementsContext
 *
 * Pending infrastructure (4/15):
 *   sniper, worldwide, the-negotiator, completionist
 */
export async function checkUserAchievements(
  userId: string,
  catalystItem?: { name: string; imageUrl: string },
): Promise<string[]> {
  // Single query to get all already-unlocked achievements (dedup guard)
  const alreadyUnlocked = await prisma.userAchievement.findMany({
    where:  { userId },
    select: { achievementId: true },
  });
  const unlockedSet = new Set(alreadyUnlocked.map((a) => a.achievementId));

  // Parallel data fetch for all server-side checks
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const [vaultAgg, itemCount, user, oldItem, activities, followCount] = await Promise.all([
    prisma.item.aggregate({
      where: { userId, status: { not: "TRADED" } },
      _sum:  { estimatedValue: true },
    }),
    prisma.item.count({ where: { userId, status: { not: "TRADED" } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
    prisma.item.findFirst({
      where: { userId, status: { not: "TRADED" }, createdAt: { lte: oneYearAgo } },
      select: { id: true },
    }),
    prisma.activity.findMany({ where: { userId }, select: { id: true } }),
    prisma.follow.count({ where: { followerId: userId } }),
  ]);

  const totalValue = vaultAgg._sum.estimatedValue ?? 0;
  const newlyUnlocked: string[] = [];

  // ── The Heavyweight: $50k total vault value ──────────────────────────────
  if (totalValue >= 50_000) {
    if (await unlockIfNew(userId, "heavyweight", unlockedSet, catalystItem))
      newlyUnlocked.push("heavyweight");
  }

  // ── The Curator: 50+ items in vault ─────────────────────────────────────
  if (itemCount >= 50) {
    if (await unlockIfNew(userId, "curator", unlockedSet)) newlyUnlocked.push("curator");
  }

  // ── Early Adopter: joined before beta cutoff (Sep 1, 2025) ───────────────
  if (user && user.createdAt < new Date("2025-09-01T00:00:00Z")) {
    if (await unlockIfNew(userId, "early-adopter", unlockedSet)) newlyUnlocked.push("early-adopter");
  }

  // ── Diamond Hands: holds any item for 1+ year ────────────────────────────
  if (oldItem) {
    if (await unlockIfNew(userId, "diamond-hands", unlockedSet)) newlyUnlocked.push("diamond-hands");
  }

  // ── Trendsetter: 100+ likes on user's activity posts ─────────────────────
  if (activities.length > 0) {
    const likeCount = await prisma.like.count({
      where: { targetId: { in: activities.map((a) => a.id) } },
    });
    if (likeCount >= 100) {
      if (await unlockIfNew(userId, "trendsetter", unlockedSet)) newlyUnlocked.push("trendsetter");
    }
  }

  // ── Whale Watcher: follows 5+ users ──────────────────────────────────────
  if (followCount >= 5) {
    if (await unlockIfNew(userId, "whale-watcher", unlockedSet)) newlyUnlocked.push("whale-watcher");
  }

  return newlyUnlocked;
}
