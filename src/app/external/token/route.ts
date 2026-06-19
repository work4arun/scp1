import { NextRequest, NextResponse } from "next/server";
import { validateToken } from "@/lib/token-auth";

export async function GET(request: NextRequest) {
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rtc.systitsoft.in";
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/external?error=no-token", publicUrl));
  }

  const user = await validateToken(token);
  if (!user) {
    return NextResponse.redirect(new URL("/external?error=invalid-token", publicUrl));
  }

  const response = NextResponse.redirect(new URL("/external/overview", publicUrl));
  response.cookies.set("ext_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}