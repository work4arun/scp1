import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const handler = NextAuth(authConfig).auth;

export default async function middleware(req: import("next/server").NextRequest) {
  // NextAuth's auth() returns a Response when it wants to redirect (e.g. an
  // unauthenticated request to a protected route) or a Session object when the
  // request is allowed to pass through. Only a Response may be returned from
  // middleware, so normalize the pass-through case to NextResponse.next().
  const res = await handler(req as any, { params: {} } as any);
  if (res && typeof (res as any).headers?.set === "function") return res;
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|external|.*\\.png$).*)"],
};