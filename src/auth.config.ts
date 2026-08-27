// Edge-compatible auth config for middleware (no DB calls here).
import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

/**
 * NextAuth runs the middleware against a NextURL whose `pathname` is already
 * base-stripped but whose `basePath` is populated (e.g. basePath="/cbo-scp",
 * pathname="/login" for a request to "/cbo-scp/login"). To stay correct under
 * both root hosting and sub-path hosting we judge a route as public on the
 * basePath-stripped pathname, and — when redirecting an unauthenticated user
 * to the sign-in page — we build the redirect with the basePath prefix so the
 * login page actually resolves.
 */
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      const base = nextUrl.basePath || "";
      const raw = nextUrl.pathname;
      // pathname is already base-stripped here, but guard anyway.
      const path = base && raw.startsWith(base) ? raw.slice(base.length) || "/" : raw;

      const isPublic =
        path === "/" ||
        path === "/login" ||
        path.startsWith("/api/auth") ||
        path.startsWith("/_next") ||
        path.startsWith("/favicon");

      if (isPublic) return true;
      if (!isLoggedIn) {
        // Redirect to the login page *under the base path* (e.g. /cbo-scp/login)
        // so the sign-in page isn't a 404. Absent a base path this is /login.
        const login = new URL(`${base}/login`, nextUrl.origin);
        return NextResponse.redirect(login.toString());
      }
      return true;
    },
  },
};