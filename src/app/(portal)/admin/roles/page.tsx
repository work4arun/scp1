import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canConfigureSystem } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OwnerRoleForm, OwnerRoleRow } from "./role-client";
import { AlertTriangle } from "lucide-react";

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  taskCount: number;
  ownerName: string | null;
  ownerEmail: string | null;
};

export default async function RolesAdmin() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole)) redirect("/");

  // Fetch the role list defensively — if the database is missing the new
  // columns (forgotten `prisma db push`), the SELECT will throw. Catch that
  // here so we render a clear, actionable message instead of letting the page
  // hit the global error boundary with an opaque digest.
  let roles: RoleRow[] | null = null;
  let loadError: { code?: string; message: string } | null = null;

  try {
    const rows = await prisma.ownerRole.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { tasks: true } } },
    });
    roles = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      active: r.active,
      taskCount: r._count.tasks,
      // Defensive — if the column is missing, Prisma would have thrown above.
      // If it's present but null, this is just null. Either way, safe access.
      ownerName: (r as { ownerName?: string | null }).ownerName ?? null,
      ownerEmail: (r as { ownerEmail?: string | null }).ownerEmail ?? null,
    }));
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    console.error("[admin/roles] failed to load roles:", err);
    loadError = {
      code: e?.code,
      message: e?.message || "Unknown database error.",
    };
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Owner Roles"
        description="Operational roles assigned as task owners (Marketing Head, RTC Head, …). The owner contact is just a name + email for communication — it does not create a login. Logins are managed on Users."
      />

      {loadError && <SchemaMismatchBanner error={loadError} />}

      <Card>
        <CardHeader><CardTitle>Add new role</CardTitle></CardHeader>
        <CardContent><OwnerRoleForm /></CardContent>
      </Card>

      {roles && (
        <Card>
          <CardHeader><CardTitle>{roles.length} role{roles.length === 1 ? "" : "s"}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {roles.map((r) => (
              <OwnerRoleRow key={r.id} r={r} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Schema-mismatch banner — shown only when the page query fails.
//  Surfaces the exact error code + message so an operator can act on it.
// ─────────────────────────────────────────────────────────────────────────────

function SchemaMismatchBanner({ error }: { error: { code?: string; message: string } }) {
  const isSchema =
    error.code === "P2021" ||
    error.code === "P2022" ||
    /column .* does not exist|relation .* does not exist/i.test(error.message);

  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-destructive">
            {isSchema ? "Database schema is out of date" : "Could not load Owner Roles"}
          </div>
          {isSchema ? (
            <>
              <p className="mt-1 text-muted-foreground">
                The new fields on <code className="rounded bg-background px-1 py-0.5 font-mono">OwnerRole</code> haven't
                been applied yet. Inside the deployment server, run:
              </p>
              <pre className="mt-2 overflow-x-auto rounded-md bg-background p-2 font-mono text-xs">
{`docker compose exec app npx prisma db push
docker compose exec app npx prisma generate
docker compose restart app`}
              </pre>
            </>
          ) : (
            <p className="mt-1 text-muted-foreground">
              Try reloading. If this persists, share the message below with the developer.
            </p>
          )}
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Technical detail
            </summary>
            <div className="mt-1 space-y-0.5 text-muted-foreground">
              {error.code && <div>Prisma code: <code className="font-mono">{error.code}</code></div>}
              <div className="whitespace-pre-wrap break-words">{error.message}</div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
