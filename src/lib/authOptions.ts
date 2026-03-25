import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { supabase } from "@/lib/supabase";

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

        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (error || !data.user) return null;

        const name =
          (data.user.user_metadata?.name as string | undefined) ??
          data.user.email ??
          "User";

        return {
          id:    data.user.id,
          name,
          email: data.user.email ?? credentials.email,
          image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
            credentials.email,
          )}&backgroundColor=b6e3f4`,
          tier: "free" as const,
        };
      },
    }),
  ],

  pages: { signIn: "/login" },
  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id   = user.id;
        token.tier = (user as { tier?: "free" | "pro" }).tier ?? "free";
      }
      // Google sign-in: use the Google sub as stable user ID
      if (account?.provider === "google") {
        token.id   = token.sub ?? user?.id ?? token.id;
        token.tier = "free";
        token.name  = user?.name  ?? token.name;
        token.email = user?.email ?? token.email;
        token.picture = user?.image ?? token.picture;
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
