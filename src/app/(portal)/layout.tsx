import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { loadAllFlags } from "@/lib/features";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Toaster } from "@/components/toaster";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const flags = await loadAllFlags();

  return (
    <AppShell
      role={session.user.systemRole}
      userName={session.user.name || session.user.email || ""}
      userEmail={session.user.email || ""}
      darkModeToggleEnabled={flags.dark_mode_toggle}
    >
      {flags.breadcrumbs && <Breadcrumbs />}
      {children}
      {flags.toasts && <Toaster />}
    </AppShell>
  );
}
