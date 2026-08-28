import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { loadAllFlags } from "@/lib/features";
import { getAppConfig } from "@/lib/app-config";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Toaster } from "@/components/toaster";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [flags, config] = await Promise.all([loadAllFlags(), getAppConfig()]);

  // Daily backup reminder (SM only, gated by the backup_restore flag): show the
  // popup on the SM's first login of the day unless they have already COMPLETED
  // a backup download today. "Today" is the UTC day (all timestamps in DB/VPS are
  // UTC). Completion is recorded only when the download reaches 100% in the
  // progress tab, so an aborted download leaves no marker and the popup returns.
  let showBackupReminder = false;
  if (session.user.systemRole === "SM" && flags.backup_restore) {
    const startOfTodayUtc = new Date(new Date().setUTCHours(0, 0, 0, 0));
    const completedToday = await prisma.auditLog.count({
      where: {
        userId: session.user.id,
        action: "system.backup_download_completed",
        createdAt: { gte: startOfTodayUtc },
      },
    });
    showBackupReminder = completedToday === 0;
  }

  return (
    <AppShell
      role={session.user.systemRole}
      userName={session.user.name || session.user.email || ""}
      userEmail={session.user.email || ""}
      darkModeToggleEnabled={flags.dark_mode_toggle}
      dashboardUrl={config.dashboardUrl}
      showBackupReminder={showBackupReminder}
    >
      {flags.breadcrumbs && <Breadcrumbs />}
      {children}
      {flags.toasts && <Toaster />}
    </AppShell>
  );
}
