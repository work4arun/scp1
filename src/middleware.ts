import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const handler = NextAuth(authConfig).auth;

export default async function middleware(req: import("next/server").NextRequest) {
  // NextAuth's auth() returns a Response (redirect) when it wants to route an
  // unauthenticated user to the sign-in page, or a Session object when the
  // request may pass through. Only a Response may be returned from middleware,
  // so normalize the pass-through case to NextResponse.next().
  const res = await handler(req as any, { params: {} } as any);

  if (!res || typeof (res as any).headers?.set !== "function") {
    return NextResponse.next();
  }

  // NextAuth redirects to pages.signIn = "/login". Under sub-path hosting the
  // login page lives at /<basePath>/login, so rewrite the Location to include
  // the basePath (which is reliably available on req.nextUrl.basePath).
  const base = req.nextUrl.basePath || "";
  if (base) {
    const loc = res.headers.get("location");
    if (loc) {
      const url = new URL(loc, req.nextUrl.origin);
      const stripped = url.pathname.replace(/^\/+/, "");
      if (stripped === "login" || stripped.startsWith("login?")) {
        url.pathname = `${base}/login`;
        const newRes = NextResponse.redirect(url.toString(), (res as Response).status);
        // carry over authjs cookies set by NextAuth (csrf, callback-url)
        (res as Response).headers.forEach((value, key) => {
          if (key.toLowerCase().startsWith("set-cookie")) {
            newRes.headers.append("set-cookie", value);
          }
        });
        return newRes;
      }
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|external|.*\\.png$).*)"],
};