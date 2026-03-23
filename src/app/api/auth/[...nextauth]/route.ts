import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { RequestInternal } from "next-auth";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req: Pick<RequestInternal, "body" | "query" | "headers" | "method">) {
        // Dev mock: always return a valid user so protected routes are testable on refresh
        const email = credentials?.email || "admin@uniques.com";
        const name  = "David (Dev)";

        // Read mock_pro_status cookie to determine tier
        const cookieHeader = req?.headers?.cookie ?? "";
        const isPro = cookieHeader.split(";").some((c: string) => c.trim() === "mock_pro_status=true");

        return {
          id:    "dev-1",
          name,
          email,
          image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}&backgroundColor=b6e3f4`,
          tier:  isPro ? ("pro" as const) : ("free" as const),
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
