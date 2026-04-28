import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { homePathForRole } from "@/lib/rbac";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  redirect(homePathForRole(session.user.systemRole));
}
