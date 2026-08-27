import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const handler = NextAuth(authConfig).auth;

export default async function middleware(req: import("next/server").NextRequest) {
  const res = await handler(req as any, { params: {} } as any);
  if (res && res instanceof NextResponse) {
    res.headers.set("x-debug-base", req.nextUrl.basePath || "(none)");
    res.headers.set("x-debug-path", req.nextUrl.pathname);
    res.headers.set("x-debug-handler", "true");
  } else {
    const r = NextResponse.next();
    r.headers.set("x-debug-base", req.nextUrl.basePath || "(none)");
    r.headers.set("x-debug-path", req.nextUrl.pathname);
    r.headers.set("x-debug-handler", "false");
    return r;
  }
  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|external|.*\\.png$).*)"],
};
