// Server component — owns Open Graph / Twitter metadata for every /u/[username] page.
// The child page.tsx stays "use client"; Next.js resolves metadata from the closest
// server-side layout/page, so exporting generateMetadata here covers all profile URLs.

import { Metadata } from "next";
import { prisma } from "@/lib/prisma";

function deriveHandle(name: string, userId: string): string {
  let h = (name ?? "").toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  if (h.length < 2) h = `user_${userId.replace(/-/g, "").slice(0, 8)}`;
  return h;
}

async function getProfileMeta(username: string) {
  const lower = username.toLowerCase();

  // 1. Stored handle
  let profile = await prisma.profile.findFirst({ where: { handle: lower } });

  // 2. UUID / CUID direct userId
  if (!profile) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lower);
    const isCuid = /^c[a-z0-9]{20,}$/i.test(lower);
    if (isUuid || isCuid) {
      profile = await prisma.profile.findUnique({ where: { userId: username } });
    }
  }

  // 3. Derived handle fallback
  if (!profile) {
    const candidates = await prisma.profile.findMany({ take: 500 });
    profile = candidates.find((p) => deriveHandle(p.name, p.userId) === lower) ?? null;
  }

  return profile;
}

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  const profile = await getProfileMeta(params.username);

  if (!profile) {
    return {
      title: "Collector Profile · Uniques",
      description: "Discover rare collectibles and trade with serious collectors on Uniques.",
    };
  }

  const name      = profile.name?.trim() || params.username;
  const handle    = profile.handle ?? deriveHandle(profile.name, profile.userId);
  const avatar    = profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
  const bio       = profile.bio?.trim() || "Serious collector on Uniques.";

  // Lightweight item count — no need to pull full payload
  const itemCount = await prisma.item.count({
    where: { userId: profile.userId, status: { not: "TRADED" } },
  });

  const title       = `${name} (@${handle}) · Uniques`;
  const description = `${bio} ${itemCount > 0 ? `${itemCount} item${itemCount !== 1 ? "s" : ""} in vault.` : ""} Trade with ${name} on Uniques.`;

  return {
    title,
    description,
    openGraph: {
      title:       `${name}'s Vault on Uniques`,
      description,
      images:      [{ url: avatar, width: 400, height: 400, alt: `${name}'s avatar` }],
      type:        "profile",
      siteName:    "Uniques",
    },
    twitter: {
      card:        "summary",
      title:       `${name}'s Vault on Uniques`,
      description,
      images:      [avatar],
    },
  };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
