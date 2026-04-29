import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canConfigureSystem } from "@/lib/rbac";
import { isEnabled } from "@/lib/features";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Database, Download, AlertTriangle } from "lucide-react";
import { formatRelative } from "@/lib/utils";
import { BackupActions } from "./backup-actions";
import Link from "next/link";

export default async function BackupPage() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole)) redirect("/");

  const enabled = await isEnabled("backup_restore");

  // Recent backup / restore audit history — surfaces who did what.
  let history: Array<{ id: string; action: string; createdAt: Date; note: string | null; user: { name: string; email: string } | null }> = [];
  try {
    history = await prisma.auditLog.findMany({
      where: { entity: "Database" },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
      take: 12,
    });
  } catch { /* AuditLog table missing — ignore */ }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Backup & Restore"
        description="Download a complete pg_dump of the database, or restore from one in a worst-case recovery scenario."
      />

      {!enabled && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4 text-sm">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-warning shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-warning">Feature is disabled</div>
                <p className="mt-1 text-muted-foreground">
                  This page is gated by the <code className="rounded bg-background px-1 py-0.5 font-mono">backup_restore</code> feature flag.
                  Turn it on at{" "}
                  <Link href="/admin/features" className="font-semibold text-primary underline">
                    /admin/features
                  </Link>{" "}
                  to enable downloads and restores.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backup */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4 text-primary" /> Download Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Generates a self-contained <code className="rounded bg-muted px-1 py-0.5 font-mono">.sql</code> file via{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono">pg_dump</code> with{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono">--clean --if-exists</code> so it can be replayed on
            any Postgres database. Save it somewhere safe — it contains password hashes, audit logs, and every record
            in the system.
          </p>
          <BackupActions enabled={enabled} />
        </CardContent>
      </Card>

      {/* Restore */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="h-4 w-4" /> Restore from Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive">
            <strong>This is destructive.</strong> Restoring overwrites every table — tasks, users, notifications,
            audit logs. There is no undo. Only do this in a recovery scenario.
          </div>
          <p className="text-muted-foreground">
            The restore is wrapped in a single Postgres transaction (<code className="rounded bg-muted px-1 py-0.5 font-mono">--single-transaction</code>{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono">ON_ERROR_STOP=1</code>), so if anything fails the
            database rolls back to its current state. You will be asked to re-enter your Super Admin password to confirm.
          </p>
        </CardContent>
      </Card>

      {/* Operations history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" /> Recent Backup / Restore Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-sm text-muted-foreground py-3 text-center">No backup or restore activity yet.</div>
          ) : (
            <div className="space-y-2">
              {history.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{prettyAction(row.action)}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {row.user?.name || "system"}
                      {row.note ? ` · ${row.note}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">{formatRelative(row.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function prettyAction(action: string): string {
  switch (action) {
    case "system.backup_download": return "📥 Backup downloaded";
    case "system.restore_started": return "🔁 Restore started";
    case "system.restore_completed": return "✅ Restore completed";
    case "system.restore_failed": return "❌ Restore failed";
    case "system.restore_auth_failed": return "🔒 Restore blocked — bad password";
    default: return action.replace(/_/g, " ").replace(/\./g, " · ");
  }
}
