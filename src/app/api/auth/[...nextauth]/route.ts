import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase } from "@/lib/supabase";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Verify credentials against Supabase Auth (HTTPS — works from Vercel).
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (error || !data.user) return null;

        const name = (data.user.user_metadata?.name as string | undefined) ?? data.user.email ?? "User";

        return {
          id:    data.user.id,
          name,
          email: data.user.email ?? credentials.email,
          image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(credentials.email)}&backgroundColor=b6e3f4`,
          tier:  "free" as const,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id;
        token.tier = (user as { tier?: "free" | "pro" }).tier ?? "free";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id   = token.id   as string;
        session.user.tier = token.tier as "free" | "pro";
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
