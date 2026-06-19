import { NextRequest, NextResponse } from "next/server";
import { validateToken } from "@/lib/token-auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/external?error=no-token", request.url));
  }

  const user = await validateToken(token);
  if (!user) {
    return NextResponse.redirect(new URL("/external?error=invalid-token", request.url));
  }

  const response = NextResponse.redirect(new URL("/external/overview", request.url));
  response.cookies.set("ext_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}