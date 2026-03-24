import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // On Vercel, Supabase's IPv4 direct connection (port 5432 on db.*) is blocked.
  // Set POOLER_DATABASE_URL in Vercel env vars to the Supabase Transaction Pooler URL:
  //   postgresql://postgres.PROJECT-REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
  // Found at: Supabase Dashboard → Project Settings → Database → Connection Pooling
  const rawUrl = process.env.POOLER_DATABASE_URL ?? process.env.DATABASE_URL!;

  // Strip Prisma CLI params that the pg driver doesn't understand
  const url = new URL(rawUrl);
  url.searchParams.delete("connection_limit");
  url.searchParams.delete("schema");
  url.searchParams.delete("pgbouncer");
  url.searchParams.delete("connect_timeout");

  const adapter = new PrismaPg({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
