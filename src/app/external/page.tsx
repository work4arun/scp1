import { redirect } from "next/navigation";
import { validateToken, type TokenUser } from "@/lib/token-auth";
import { cookies } from "next/headers";

export default async function ExternalPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-red-600">Access Denied</h1>
          <p className="mt-2 text-sm text-gray-500">Missing access token. Please use the link from your email.</p>
        </div>
      </div>
    );
  }

  const user = await validateToken(token);
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-red-600">Invalid or Expired Token</h1>
          <p className="mt-2 text-sm text-gray-500">Your access link is invalid or has expired. Please request a new one.</p>
        </div>
      </div>
    );
  }

  // Set token cookie and redirect to overview
  cookies().set("ext_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  redirect("/external/overview");
}