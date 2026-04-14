import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    // ── Google OAuth ─────────────────────────────────────────────────────────
    // Requires GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in .env.local.
    // The provider is silently skipped when keys are absent (dev/staging safety).
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId:     process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // Allows a Google sign-in whose email matches an existing
            // credentials account to link to that account instead of erroring.
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),

    // ── Email + password (Supabase Auth) ─────────────────────────────────────
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Create a fresh client per request — avoids session state leaking
        // between different users on warm serverless lambda instances.
        const freshSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { auth: { persistSession: false } },
        );

        const { data, error } = await freshSupabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (error || !data.user) return null;

        const name =
          (data.user.user_metadata?.name as string | undefined) ??
          data.user.email ??
          "User";

        // Look up the tier from our Prisma User record (keyed by email).
        // Falls back to "free" if no record exists (first-time OAuth users, etc.)
        let tier: "free" | "pro" = "free";
        try {
          const prismaUser = await prisma.user.findUnique({
            where:  { email: credentials.email },
            select: { tier: true },
          });
          if (prismaUser?.tier === "pro") tier = "pro";
        } catch { /* non-fatal — default to free */ }

        return {
          id:    data.user.id,
          name,
          email: data.user.email ?? credentials.email,
          image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
            credentials.email,
          )}&backgroundColor=b6e3f4`,
          tier,
        };
      },
    }),
  ],

  pages: { signIn: "/login" },
  session: { strategy: "jwt" },

  callbacks: {
    // Redirect brand-new Google users to onboarding instead of home.
    // Fires before jwt — at this point no Prisma User row exists for new sign-ups,
    // so a missing row reliably indicates a first-time Google user.
    async signIn({ user, account }) {
      if (account?.provider === "google" && user?.email) {
        try {
          const existing = await prisma.user.findUnique({
            where:  { email: user.email },
            select: { id: true },
          });
          if (!existing) return "/onboarding"; // new user → onboarding flow
        } catch { /* non-fatal — allow sign-in to proceed normally */ }
      }
      return true;
    },

    async jwt({ token, user, account, trigger }) {
      // When the client calls update() (e.g. after Stripe success), re-fetch
      // the tier from the DB so the session reflects the upgrade immediately.
      if (trigger === "update" && token.email) {
        try {
          const fresh = await prisma.user.findUnique({
            where:  { email: token.email as string },
            select: { tier: true },
          });
          if (fresh?.tier === "pro") token.tier = "pro";
        } catch { /* non-fatal */ }
      }

      if (user) {
        token.id   = user.id;
        token.tier = (user as { tier?: "free" | "pro" }).tier ?? "free";
        // Upsert a Profile record so this user appears in the Collectors directory.
        // 'update: {}' preserves any profile data the user has already set.
        try {
          await prisma.profile.upsert({
            where:  { userId: user.id },
            create: { userId: user.id, name: user.name ?? "", avatar: user.image ?? "" },
            update: {},
          });
        } catch { /* non-fatal — don't block sign-in */ }
      }
      // Google sign-in: use the Google sub as stable user ID and ensure a
      // Prisma User row exists so tier lookups (Stripe webhook, update()) work.
      if (account?.provider === "google") {
        token.id      = token.sub ?? user?.id ?? token.id;
        token.tier    = "free";
        token.name    = user?.name  ?? token.name;
        token.email   = user?.email ?? token.email;
        token.picture = user?.image ?? token.picture;

        // Upsert User row keyed by email so the Stripe webhook can find it.
        // hashedPassword is set to a sentinel — Google users never use password auth.
        if (user?.email) {
          try {
            const existing = await prisma.user.findUnique({
              where:  { email: user.email },
              select: { tier: true },
            });
            if (existing) {
              // Already exists — read the real tier (may have been upgraded via Stripe)
              if (existing.tier === "pro") token.tier = "pro";
            } else {
              await prisma.user.create({
                data: {
                  name:           user.name  ?? "",
                  email:          user.email,
                  hashedPassword: "__google_oauth__",
                  tier:           "free",
                },
              });
            }
          } catch { /* non-fatal — don't block sign-in */ }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id    = token.id   as string;
        session.user.tier  = token.tier as "free" | "pro";
        // Propagate Google avatar
        if (token.picture && !session.user.image) {
          session.user.image = token.picture as string;
        }
      }
      return session;
    },
  },
};
