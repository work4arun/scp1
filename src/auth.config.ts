// Edge-compatible auth config for middleware (no DB calls here).
import type { NextAuthConfig } from "next-auth";

/**
 * NextAuth runs the middleware against a NextURL where `basePath` is not
 * populated, so `pathname` retains the BASE_PATH prefix (e.g. `/cbo-scp/login`).
 * To stay correct under both root hosting and sub-path hosting we judge a route
 * as public if *either* the raw pathname or the path with its leading segment
 * removed matches a public route.
 */
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      const candidates: string[] = [];
      const raw = nextUrl.pathname;
      candidates.push(raw);
      // pathname with the leading (base-path) segment removed, e.g.
      // "/cbo-scp/login" -> "/login".
      const segs = raw.split("/").filter(Boolean);
      candidates.push("/" + segs.slice(1).join("/"));

      const isPublic = candidates.some((path) => {
        if (!path) return false;
        if (path === "/" || path === "/login") return true;
        if (path.startsWith("/api/auth")) return true;
        if (path.startsWith("/_next")) return true;
        if (path.startsWith("/favicon")) return true;
        return false;
      });

      return isPublic || isLoggedIn;
    },
  },
};