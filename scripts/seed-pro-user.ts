/**
 * Seed script — creates the QA Pro user for Phase 5.27 paywall testing.
 *
 * Run:  npx tsx scripts/seed-pro-user.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local first (takes priority), then .env
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { createClient }  from "@supabase/supabase-js";
import { PrismaClient }  from "@prisma/client";
import { PrismaPg }      from "@prisma/adapter-pg";

// ── Prisma (mirrors src/lib/prisma.ts setup) ────────────────────────────────
const rawUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL!;
const url    = new URL(rawUrl);
url.searchParams.delete("connection_limit");
url.searchParams.delete("schema");
url.searchParams.delete("pgbouncer");
url.searchParams.delete("connect_timeout");

const adapter = new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
const prisma  = new PrismaClient({ adapter } as never);

// ── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } },
);

const PRO_EMAIL    = "pro@uniques.app";
const PRO_PASSWORD = "password123";
const PRO_NAME     = "Pro QA Tester";
const PRO_HANDLE   = "pro_qa";

async function main() {
  console.log("── Step 1: Supabase Auth ──────────────────────────────────");

  let supabaseUid: string;

  // Try to sign in first (user may already exist)
  const { data: signInData } = await supabase.auth.signInWithPassword({
    email:    PRO_EMAIL,
    password: PRO_PASSWORD,
  });

  if (signInData?.user) {
    supabaseUid = signInData.user.id;
    console.log("  ✓ Existing user signed in:", supabaseUid);
  } else {
    // User doesn't exist — create via signUp
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email:    PRO_EMAIL,
      password: PRO_PASSWORD,
      options:  { data: { name: PRO_NAME } },
    });
    if (signUpError || !signUpData.user) {
      console.error("  ✗ signUp error:", signUpError?.message);
      process.exit(1);
    }
    supabaseUid = signUpData.user.id;
    console.log("  ✓ Created new Supabase user:", supabaseUid);
  }

  // ── Step 2: Prisma User row with tier = "pro" ──────────────────────────────
  console.log("\n── Step 2: Prisma User (tier = pro) ──────────────────────");

  await (prisma as any).user.upsert({
    where:  { email: PRO_EMAIL },
    create: {
      email:          PRO_EMAIL,
      name:           PRO_NAME,
      hashedPassword: "supabase-managed",
      tier:           "pro",
    },
    update: { tier: "pro", name: PRO_NAME },
  });
  console.log("  ✓ User row upserted with tier = pro");

  // ── Step 3: Profile ────────────────────────────────────────────────────────
  console.log("\n── Step 3: Profile ────────────────────────────────────────");

  // Check if handle is taken by someone else
  const existingHandle = await (prisma as any).profile.findUnique({ where: { handle: PRO_HANDLE } });
  const useHandle = (!existingHandle || existingHandle.userId === supabaseUid) ? PRO_HANDLE : `pro_qa_${Date.now()}`;

  await (prisma as any).profile.upsert({
    where:  { userId: supabaseUid },
    create: {
      userId:  supabaseUid,
      name:    PRO_NAME,
      handle:  useHandle,
      bio:     "QA account for testing Pro tier features.",
      avatar:  `https://api.dicebear.com/7.x/avataaars/svg?seed=proqa&backgroundColor=b6e3f4`,
    },
    update: { name: PRO_NAME, handle: useHandle },
  });
  console.log("  ✓ Profile upserted — handle: @" + useHandle);

  // ── Step 4: Vault items ────────────────────────────────────────────────────
  console.log("\n── Step 4: Vault items ────────────────────────────────────");

  const seedItems = [
    { title: "Charizard VMAX (Rainbow Rare)",  category: "Trading Cards", estimatedValue: 420,  imageUrl: "https://images.pokemontcg.io/swsh45/74_hires.png" },
    { title: "Pikachu Illustrator (PSA 9)",    category: "Trading Cards", estimatedValue: 6200, imageUrl: "https://images.pokemontcg.io/base1/58_hires.png"  },
    { title: "LEGO Millennium Falcon #75192",  category: "LEGO",          estimatedValue: 850,  imageUrl: "https://images.rebrickable.com/sets/75192-1.jpg"  },
    { title: "Air Jordan 1 Chicago 1985",      category: "Sneakers",      estimatedValue: 3100, imageUrl: "https://via.placeholder.com/300x300?text=AJ1"     },
    { title: "Supreme Box Logo Hoodie FW18",   category: "Streetwear",    estimatedValue: 680,  imageUrl: "https://via.placeholder.com/300x300?text=Supreme" },
  ];

  for (const item of seedItems) {
    const existing = await (prisma as any).item.findFirst({
      where: { userId: supabaseUid, title: item.title },
    });
    if (!existing) {
      await (prisma as any).item.create({
        data: { ...item, userId: supabaseUid, upForTrade: true, status: "VAULT" },
      });
      console.log("  ✓ Created:", item.title);
    } else {
      console.log("  – Exists: ", item.title);
    }
  }

  console.log("\n✅ Pro QA user ready.");
  console.log("   Email   :", PRO_EMAIL);
  console.log("   Password:", PRO_PASSWORD);
  console.log("   Handle  : @" + useHandle);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => (prisma as any).$disconnect());
