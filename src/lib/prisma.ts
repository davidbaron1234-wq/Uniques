import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const rawUrl = process.env.DATABASE_URL!;

  // Strip Prisma-specific query params that the pg driver doesn't understand.
  // These are valid for Prisma CLI / migrations but cause "unrecognized
  // configuration parameter" errors when forwarded directly to PostgreSQL.
  const url = new URL(rawUrl);
  url.searchParams.delete("connection_limit");
  url.searchParams.delete("schema");
  url.searchParams.delete("pgbouncer");
  url.searchParams.delete("connect_timeout");

  const adapter = new PrismaPg({
    connectionString: url.toString(),
    // Supabase requires SSL for all external connections. Setting
    // rejectUnauthorized: false accepts Supabase's self-signed cert chain.
    ssl: { rejectUnauthorized: false },
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
