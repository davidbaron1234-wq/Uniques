import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/inbox/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/inventory/:path*",
  ],
};
