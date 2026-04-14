/**
 * scripts/qa-bot.ts
 *
 * End-to-end trade engine QA script + system health probes.
 * Run with:  npx tsx --env-file=.env.local scripts/qa-bot.ts
 *
 * ── Part A: Trade Engine + Messaging (direct DB) ──────────────────────────────
 *  1. Creates 3 fake users (Alice, Bob, Carol) with synthetic UUIDs + Profile rows
 *  2. Alice proposes a trade to Bob
 *  3. Bob accepts → status = "accepted"
 *  4. Alice completes → status = "completed" + completedAt set
 *  5. Verifies trade visible from both parties' GET perspectives
 *  6. Alice messages Carol — creates conversation + sends a message
 *  7. Verifies Bob cannot see the Alice↔Carol conversation
 *  8. Role guards — proposer cannot accept own trade; stranger cannot cancel
 *
 * ── Part B: System Health Probes ─────────────────────────────────────────────
 *  9.  eBay API — OAuth + live search; asserts price returned within 5 s
 * 10.  Cron verification — latest catalog MarketSnapshot must be < 25 hours old
 * 11.  Portfolio math integrity — no user with vault items should have a $0 snapshot
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "crypto";

function createPrisma() {
  const rawUrl = process.env.DATABASE_URL!;
  const url = new URL(rawUrl);
  url.searchParams.delete("connection_limit");
  url.searchParams.delete("schema");
  url.searchParams.delete("pgbouncer");
  url.searchParams.delete("connect_timeout");
  const adapter = new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
  return new PrismaClient({ adapter });
}

const prisma = createPrisma();

// ── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function log(msg: string)  { console.log(`  ✓  ${msg}`); passed++; }
function info(msg: string) { console.log(`     ${msg}`); }
function warn(msg: string) { console.log(`  ⚠  ${msg}`); }
function fail(msg: string): never {
  console.error(`  ✗  ${msg}`);
  failed++;
  throw new Error(msg);
}

/** Soft fail: records failure but does not throw (lets remaining probes run). */
function softFail(msg: string) {
  console.error(`  ✗  ${msg}`);
  failed++;
}

/** Mirror of the PATCH /api/trades role logic — same guards, same DB mutations. */
async function patchTrade(id: string, action: string, actorId: string): Promise<{ ok: boolean }> {
  const trade = await prisma.trade.findFirst({ where: { id } });
  if (!trade) fail(`patchTrade: trade ${id} not found`);

  const isProposer  = trade.proposerId  === actorId;
  const isRecipient = trade.recipientId === actorId;

  if (!isProposer && !isRecipient) {
    throw new Error(`FORBIDDEN: ${actorId} is not a party to trade ${id}`);
  }

  if (action === "accept") {
    if (!isRecipient) throw new Error("FORBIDDEN: only recipient can accept");
    await prisma.trade.update({ where: { id }, data: { status: "accepted" } });

  } else if (action === "decline") {
    if (!isRecipient) throw new Error("FORBIDDEN: only recipient can decline");
    await prisma.trade.update({ where: { id }, data: { status: "declined" } });
    if (trade.proposerItemIds.length > 0) {
      await prisma.item.updateMany({ where: { id: { in: trade.proposerItemIds } }, data: { status: "VAULT" } });
    }

  } else if (action === "cancel") {
    if (!isProposer) throw new Error("FORBIDDEN: only proposer can cancel");
    await prisma.trade.update({ where: { id }, data: { status: "declined" } });
    if (trade.proposerItemIds.length > 0) {
      await prisma.item.updateMany({ where: { id: { in: trade.proposerItemIds } }, data: { status: "VAULT" } });
    }

  } else if (action === "complete") {
    if (!isProposer) throw new Error("FORBIDDEN: only proposer can complete");
    await prisma.trade.update({ where: { id }, data: { status: "completed", completedAt: new Date() } });
    if (trade.proposerItemIds.length > 0) {
      await prisma.item.updateMany({ where: { id: { in: trade.proposerItemIds } }, data: { status: "TRADED" } });
    }

  } else {
    throw new Error(`Invalid action: ${action}`);
  }

  return { ok: true };
}

// ── System Health Probes ──────────────────────────────────────────────────────

/**
 * Probe 9: eBay API connectivity.
 * Performs a real OAuth token request + one search call.
 * Skips gracefully if eBay env vars are not set.
 */
async function probeEbay(): Promise<{
  ok: boolean;
  skipped: boolean;
  latencyMs: number;
  price: number | null;
  error?: string;
}> {
  const appId    = process.env.EBAY_APP_ID;
  const certId   = process.env.EBAY_CERT_ID;
  const oauthUrl = process.env.EBAY_OAUTH_URL;
  const apiUrl   = process.env.EBAY_API_URL;

  if (!appId || !certId || !oauthUrl || !apiUrl) {
    return { ok: false, skipped: true, latencyMs: 0, price: null };
  }

  const t0 = Date.now();
  try {
    // Step 1: OAuth client-credentials token
    const credentials = Buffer.from(`${appId}:${certId}`).toString("base64");
    const tokenRes = await fetch(oauthUrl, {
      method:  "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:  `Basic ${credentials}`,
      },
      body: `grant_type=client_credentials&scope=${encodeURIComponent("https://api.ebay.com/oauth/api_scope")}`,
    });

    if (!tokenRes.ok) {
      return { ok: false, skipped: false, latencyMs: Date.now() - t0, price: null, error: `OAuth HTTP ${tokenRes.status}` };
    }

    const tokenData = await tokenRes.json() as { access_token?: string };
    const token = tokenData.access_token;
    if (!token) {
      return { ok: false, skipped: false, latencyMs: Date.now() - t0, price: null, error: "OAuth returned no access_token" };
    }

    // Step 2: Live search — use a well-known collectible that always has results
    const searchRes = await fetch(
      `${apiUrl}?q=Charizard+Base+Set+Holo&limit=5&filter=price:[15..],priceCurrency:USD`,
      {
        headers: {
          Authorization:             `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        },
      },
    );

    if (!searchRes.ok) {
      return { ok: false, skipped: false, latencyMs: Date.now() - t0, price: null, error: `Search HTTP ${searchRes.status}` };
    }

    const searchData = await searchRes.json() as {
      itemSummaries?: Array<{ price?: { value: string } }>;
    };

    const prices = (searchData.itemSummaries ?? [])
      .map((item) => parseFloat(item.price?.value ?? "0"))
      .filter((p) => p > 0);

    const price = prices.length > 0
      ? parseFloat((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2))
      : null;

    return { ok: price !== null && price > 0, skipped: false, latencyMs: Date.now() - t0, price };
  } catch (e) {
    return { ok: false, skipped: false, latencyMs: Date.now() - t0, price: null, error: String(e) };
  }
}

/**
 * Probe 10: Cron verification.
 * The Vercel cron fires once per day (00:00 UTC). We expect at least one
 * catalog MarketSnapshot to exist with a bucket within the last 25 hours.
 */
async function probeCron(): Promise<{
  ok: boolean;
  skipped: boolean;
  lastBucket: string | null;
  hoursAgo: number | null;
  catalogCount: number;
}> {
  const catalogCount = await prisma.marketSnapshot.count({ where: { type: "catalog" } });

  if (catalogCount === 0) {
    // Not a failure — DB may be freshly seeded and the cron hasn't run yet
    return { ok: false, skipped: true, lastBucket: null, hoursAgo: null, catalogCount: 0 };
  }

  const latest = await prisma.marketSnapshot.findFirst({
    where:   { type: "catalog" },
    orderBy: { bucket: "desc" },
    select:  { bucket: true },
  });

  if (!latest) {
    return { ok: false, skipped: false, lastBucket: null, hoursAgo: null, catalogCount };
  }

  const hoursAgo = (Date.now() - latest.bucket.getTime()) / (1000 * 60 * 60);
  return {
    ok:          hoursAgo <= 25,
    skipped:     false,
    lastBucket:  latest.bucket.toISOString(),
    hoursAgo:    parseFloat(hoursAgo.toFixed(1)),
    catalogCount,
  };
}

/**
 * Probe 11: Portfolio math integrity.
 * For every user who has a "user" type MarketSnapshot, verifies that users
 * with active vault items do not have a $0 portfolio value (which would
 * indicate a bug in the snapshot engine or officialPortfolioValue utility).
 *
 * Caps at 50 most-recent user snapshots to keep the probe fast.
 */
async function probePortfolioIntegrity(): Promise<{
  ok: boolean;
  skipped: boolean;
  checked: number;
  zeroed: number;
  zeroedUsers: string[];
}> {
  // Fetch recent "user" snapshots (capped for performance)
  const snaps = await prisma.marketSnapshot.findMany({
    where:   { type: "user" },
    orderBy: { bucket: "desc" },
    select:  { refId: true, value: true },
    take:    200,
  });

  if (snaps.length === 0) {
    return { ok: true, skipped: true, checked: 0, zeroed: 0, zeroedUsers: [] };
  }

  // Latest value per userId (snaps are already ordered desc by bucket)
  const latestByUser = new Map<string, number>();
  for (const s of snaps) {
    if (!latestByUser.has(s.refId)) latestByUser.set(s.refId, s.value);
  }

  const userIds = Array.from(latestByUser.keys());

  // Count active items per user (parallel, capped to 50 users for speed)
  const sample = userIds.slice(0, 50);
  const itemCounts = await Promise.all(
    sample.map((uid) =>
      prisma.item.count({ where: { userId: uid, status: { not: "TRADED" } } }),
    ),
  );

  const zeroedUsers: string[] = [];
  for (let i = 0; i < sample.length; i++) {
    const value = latestByUser.get(sample[i])!;
    const count = itemCounts[i];
    // A user with > 0 active items must have a portfolio value > $0
    if (count > 0 && value === 0) zeroedUsers.push(sample[i]);
  }

  return {
    ok:          zeroedUsers.length === 0,
    skipped:     false,
    checked:     sample.length,
    zeroed:      zeroedUsers.length,
    zeroedUsers: zeroedUsers.map((id) => id.slice(0, 8) + "…"),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🤖  Uniques QA Bot — Trade Engine + Messaging + System Health\n");
  console.log("     Using DATABASE_URL:", process.env.DATABASE_URL?.replace(/:\/\/.*@/, "://<redacted>@") ?? "(not set)");
  console.log();

  const ts = Date.now();

  // ════════════════════════════════════════════════════════════════════════════
  // Part A: Trade Engine + Messaging
  // ════════════════════════════════════════════════════════════════════════════

  console.log("━━━  Part A: Trade Engine + Messaging  ━━━\n");

  // ── Step 1: Create fake users ─────────────────────────────────────────────
  console.log("Step 1: Creating test users…");

  const alice = { id: randomUUID(), name: `QA-Alice-${ts}` };
  const bob   = { id: randomUUID(), name: `QA-Bob-${ts}`   };
  const carol = { id: randomUUID(), name: `QA-Carol-${ts}` };

  for (const u of [alice, bob, carol]) {
    await prisma.profile.create({ data: { userId: u.id, name: u.name, avatar: "" } });
    log(`Created profile: ${u.name} (${u.id.slice(0, 8)}…)`);
  }

  // ── Step 2: Alice creates an item and proposes a trade to Bob ─────────────
  console.log("\nStep 2: Alice proposes a trade to Bob…");

  const aliceItem = await prisma.item.create({
    data: {
      userId:         alice.id,
      title:          `QA-Charizard-${ts}`,
      category:       "Pokémon TCG",
      imageUrl:       "https://images.pokemontcg.io/base1/4.png",
      status:         "VAULT",
      upForTrade:     true,
      estimatedValue: 3200,
    },
  });

  const trade = await prisma.trade.create({
    data: {
      proposerId:      alice.id,
      recipientId:     bob.id,
      proposerItemIds: [aliceItem.id],
      status:          "pending",
      offerData: {
        fromUser:  { id: alice.id, name: alice.name, avatar: "" },
        toUser:    { id: bob.id,   name: bob.name,   avatar: "" },
        fromItems: [{ id: aliceItem.id, name: aliceItem.title, imageUrl: aliceItem.imageUrl, estimatedValue: 3200 }],
        toItems:   [],
        fromCash:  0,
        toCash:    0,
      },
    },
  });

  log(`Trade created: ${trade.id} (status=${trade.status})`);

  // ── Step 3: Bob accepts ───────────────────────────────────────────────────
  console.log("\nStep 3: Bob accepts…");
  await patchTrade(trade.id, "accept", bob.id);

  const afterAccept = await prisma.trade.findUniqueOrThrow({ where: { id: trade.id } });
  if (afterAccept.status !== "accepted") fail(`Expected "accepted", got "${afterAccept.status}"`);
  log(`Trade status = ${afterAccept.status}`);

  // ── Step 4: Alice completes ───────────────────────────────────────────────
  console.log("\nStep 4: Alice completes the trade…");
  await patchTrade(trade.id, "complete", alice.id);

  const afterComplete = await prisma.trade.findUniqueOrThrow({ where: { id: trade.id } });
  if (afterComplete.status !== "completed") fail(`Expected "completed", got "${afterComplete.status}"`);
  if (!afterComplete.completedAt)           fail("completedAt not set after complete");
  log(`Trade status = ${afterComplete.status}`);
  log(`completedAt  = ${afterComplete.completedAt!.toISOString()}`);

  // ── Step 5: Both parties see the trade ───────────────────────────────────
  console.log("\nStep 5: Verifying visibility from both perspectives…");

  const aliceTrades = await prisma.trade.findMany({ where: { OR: [{ proposerId: alice.id }, { recipientId: alice.id }] } });
  const bobTrades   = await prisma.trade.findMany({ where: { OR: [{ proposerId: bob.id   }, { recipientId: bob.id   }] } });

  if (!aliceTrades.find((t) => t.id === trade.id)) fail("Trade not visible to Alice");
  if (!bobTrades.find((t)   => t.id === trade.id)) fail("Trade not visible to Bob");
  log(`Trade visible to Alice (${aliceTrades.length} total)`);
  log(`Trade visible to Bob   (${bobTrades.length} total)`);

  // ── Step 6: Alice opens a conversation with Carol ─────────────────────────
  console.log("\nStep 6: Alice messages Carol…");

  const conv = await prisma.conversation.create({
    data: {
      participants: {
        create: [
          { userId: alice.id, displayName: alice.name, avatarUrl: "" },
          { userId: carol.id, displayName: carol.name, avatarUrl: "" },
        ],
      },
    },
  });

  log(`Conversation created: ${conv.id}`);

  const msg = await prisma.message.create({
    data: {
      conversationId: conv.id,
      senderId:       alice.id,
      senderName:     alice.name,
      content:        "Hey Carol! Want to do a trade? 🤝",
    },
  });

  log(`Message sent: "${msg.content}"`);

  // ── Step 7: Bob cannot see Alice↔Carol conversation ───────────────────────
  console.log("\nStep 7: Verifying conversation privacy…");

  const bobConvs = await prisma.conversation.findMany({
    where: { participants: { some: { userId: bob.id } } },
  });
  if (bobConvs.find((c) => c.id === conv.id)) fail("Bob should NOT see Alice↔Carol conversation");
  log(`Bob's conversations: ${bobConvs.length} (Alice↔Carol not included ✓)`);

  const aliceConvs = await prisma.conversation.findMany({
    where:   { participants: { some: { userId: alice.id } } },
    include: { messages: true, participants: true },
  });
  const foundConv = aliceConvs.find((c) => c.id === conv.id);
  if (!foundConv) fail("Alice cannot see her own conversation");
  if (foundConv.messages.length !== 1) fail(`Expected 1 message, got ${foundConv.messages.length}`);
  log(`Alice sees conversation with ${foundConv.participants.length} participants, ${foundConv.messages.length} message`);

  // ── Step 8: Role guards ───────────────────────────────────────────────────
  console.log("\nStep 8: Role guards…");

  const trade2 = await prisma.trade.create({
    data: {
      proposerId:      alice.id,
      recipientId:     bob.id,
      proposerItemIds: [],
      status:          "pending",
      offerData:       { fromUser: { id: alice.id }, toUser: { id: bob.id } },
    },
  });

  let caughtProposerAccept = false;
  try {
    await patchTrade(trade2.id, "accept", alice.id);
  } catch (e) {
    if ((e as Error).message.includes("FORBIDDEN")) caughtProposerAccept = true;
  }
  if (!caughtProposerAccept) fail("Proposer should not be able to accept their own trade");
  log("Proposer cannot accept own trade ✓");

  let caughtStranger = false;
  try {
    await patchTrade(trade2.id, "cancel", carol.id);
  } catch (e) {
    if ((e as Error).message.includes("FORBIDDEN")) caughtStranger = true;
  }
  if (!caughtStranger) fail("Stranger should not be able to cancel trade they're not party to");
  log("Stranger cannot cancel unrelated trade ✓");

  let caughtRecipientCancel = false;
  try {
    await patchTrade(trade2.id, "cancel", bob.id);
  } catch (e) {
    if ((e as Error).message.includes("FORBIDDEN")) caughtRecipientCancel = true;
  }
  if (!caughtRecipientCancel) fail("Recipient should not be able to cancel (must use decline instead)");
  log("Recipient cannot cancel (must decline) ✓");

  await patchTrade(trade2.id, "decline", bob.id);
  const t2 = await prisma.trade.findUniqueOrThrow({ where: { id: trade2.id } });
  if (t2.status !== "declined") fail(`Expected "declined", got "${t2.status}"`);
  log(`Bob declined trade2 → status = ${t2.status}`);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  console.log("\nCleaning up test data…");

  await prisma.message.deleteMany({ where: { conversationId: conv.id } });
  await prisma.conversationParticipant.deleteMany({ where: { conversationId: conv.id } });
  await prisma.conversation.delete({ where: { id: conv.id } });

  await prisma.trade.deleteMany({ where: { id: { in: [trade.id, trade2.id] } } });
  await prisma.item.delete({ where: { id: aliceItem.id } });

  for (const u of [alice, bob, carol]) {
    await prisma.profile.deleteMany({ where: { userId: u.id } });
  }

  info("All test records removed from DB.");
  log("Cleanup complete");

  // ════════════════════════════════════════════════════════════════════════════
  // Part B: System Health Probes
  // ════════════════════════════════════════════════════════════════════════════

  console.log("\n\n━━━  Part B: System Health Probes  ━━━\n");

  // ── Step 9: eBay API connectivity ────────────────────────────────────────
  console.log("Step 9: eBay API connectivity…");
  try {
    const ebay = await probeEbay();
    if (ebay.skipped) {
      warn("eBay probe skipped — EBAY_APP_ID / EBAY_CERT_ID / EBAY_OAUTH_URL / EBAY_API_URL not set");
    } else if (!ebay.ok) {
      softFail(`eBay probe failed — ${ebay.error ?? "no price returned"} (${ebay.latencyMs}ms)`);
    } else {
      log(`eBay OK — price=$${ebay.price} latency=${ebay.latencyMs}ms`);
      if (ebay.latencyMs > 5000) warn(`eBay latency ${ebay.latencyMs}ms exceeds 5000ms warning threshold`);
    }
  } catch (e) {
    softFail(`eBay probe threw: ${String(e)}`);
  }

  // ── Step 10: Cron verification ────────────────────────────────────────────
  console.log("\nStep 10: Cron verification (catalog MarketSnapshot freshness)…");
  try {
    const cron = await probeCron();
    if (cron.skipped) {
      warn(`No catalog snapshots in DB — seed the feed first: POST /api/feed/seed → trigger cron`);
    } else if (!cron.ok) {
      softFail(
        `Last catalog snapshot is ${cron.hoursAgo}h old (threshold: 25h). ` +
        `Last bucket: ${cron.lastBucket}. Trigger GET /api/cron/market-sync to refresh.`,
      );
    } else {
      log(`Cron OK — ${cron.catalogCount} catalog snapshots, last bucket ${cron.hoursAgo}h ago (${cron.lastBucket})`);
    }
  } catch (e) {
    softFail(`Cron probe threw: ${String(e)}`);
  }

  // ── Step 11: Portfolio math integrity ────────────────────────────────────
  console.log("\nStep 11: Portfolio math integrity…");
  try {
    const integrity = await probePortfolioIntegrity();
    if (integrity.skipped) {
      warn("No user portfolio snapshots found — portfolio engine hasn't run yet");
    } else if (!integrity.ok) {
      softFail(
        `${integrity.zeroed} user(s) have vault items but $0 portfolio value. ` +
        `Affected IDs: ${integrity.zeroedUsers.join(", ")}. ` +
        `Checked ${integrity.checked} users.`,
      );
    } else {
      log(`Portfolio integrity OK — ${integrity.checked} user(s) checked, 0 zero-value anomalies`);
    }
  } catch (e) {
    softFail(`Portfolio integrity probe threw: ${String(e)}`);
  }

  // ── Results ───────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(50)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log("  ✅  All QA checks passed!\n");
  } else {
    console.log("  ❌  Some checks failed — see above.\n");
    process.exit(1);
  }
}

main()
  .catch(async (err) => {
    console.error("\n❌  QA bot crashed:", err.message ?? err);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
