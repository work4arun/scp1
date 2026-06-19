import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateToken } from "@/lib/token-auth";
import { ExternalSidebar } from "./sidebar";
import { ExternalHeader } from "./header";
import "@/app/globals.css";

export default async function AuthExternalLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get("ext_token")?.value;
  if (!token) redirect("/external?error=no-token");

  const user = await validateToken(token);
  if (!user) redirect("/external?error=invalid-token");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <ExternalSidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ExternalHeader user={user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}