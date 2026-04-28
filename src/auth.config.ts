// Edge-compatible auth config for middleware (no DB calls here).
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      const isPublic =
        path === "/" ||
        path === "/login" ||
        path.startsWith("/api/auth") ||
        path.startsWith("/_next") ||
        path.startsWith("/favicon");

      if (isPublic) return true;
      return isLoggedIn;
    },
  },
};
