// Edge-compatible auth config for middleware (no DB calls here).
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      // With BASE_PATH set (e.g. /scp, /cbo-scp) the middleware sees the full
      // pathname including the prefix. Strip it so the route checks below match
      // the unprefixed app routes. Falls back to the raw path when no base path.
      const base = nextUrl.basePath || "";
      const raw = nextUrl.pathname;
      const path = base && raw.startsWith(base) ? raw.slice(base.length) || "/" : raw;

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
