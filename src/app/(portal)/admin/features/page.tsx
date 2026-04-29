import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canConfigureSystem } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FLAG_REGISTRY, type FlagCategory } from "@/lib/features";
import { ensureFlagsSeeded } from "./actions";
import { FlagToggleRow } from "./flag-toggle-row";
import { Sparkles, ShieldCheck, Workflow, Palette, Gauge, Cpu } from "lucide-react";

const CATEGORY_META: Record<FlagCategory, { label: string; description: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  core: {
    label: "Core",
    description: "Master controls. Toggle these last.",
    icon: ShieldCheck,
    tone: "text-primary",
  },
  security: {
    label: "Security & Compliance",
    description: "Hardening features. Recommended ON in production.",
    icon: ShieldCheck,
    tone: "text-success",
  },
  scale: {
    label: "Scale Primitives",
    description: "Pagination, bulk actions, exports — flip these on as your data grows.",
    icon: Gauge,
    tone: "text-info",
  },
  workflow: {
    label: "Workflow",
    description: "Closed-loop process improvements (drop reasons, SLA, activation flows).",
    icon: Workflow,
    tone: "text-warning",
  },
  ux: {
    label: "User Experience",
    description: "Polish: breadcrumbs, dark mode, toasts, friendly error pages.",
    icon: Palette,
    tone: "text-primary",
  },
  ai: {
    label: "AI & Intelligence",
    description: "Coming soon — AI briefings, smart drafting, decision co-pilot.",
    icon: Cpu,
    tone: "text-primary",
  },
};

export default async function FeatureFlagsPage() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole)) redirect("/");

  // Bootstrap — idempotent. Safe to call on every visit.
  try {
    await ensureFlagsSeeded();
  } catch {
    // If migrations haven't run yet, the table won't exist — render a nice
    // banner instead of crashing.
  }

  let rows: Array<{ key: string; enabled: boolean; updatedAt: Date }> = [];
  let migrationPending = false;
  try {
    rows = await prisma.featureFlag.findMany({ select: { key: true, enabled: true, updatedAt: true } });
  } catch {
    migrationPending = true;
  }

  const stateByKey = Object.fromEntries(rows.map((r) => [r.key, r])) as Record<string, { enabled: boolean; updatedAt: Date } | undefined>;

  // Group by category, preserving registry order.
  const grouped = new Map<FlagCategory, typeof FLAG_REGISTRY>();
  for (const def of FLAG_REGISTRY) {
    const arr = grouped.get(def.category) ?? [];
    arr.push(def);
    grouped.set(def.category, arr);
  }

  const enabledCount = rows.filter((r) => r.enabled).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Feature Flags"
        description="Toggle phase-1 enhancements without redeploying. Every change is audit-logged."
      />

      {migrationPending ? (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4 text-sm">
            <div className="font-semibold text-warning">⚠️ Schema migration pending</div>
            <p className="mt-1 text-muted-foreground">
              Run the following in your project folder, then refresh:
            </p>
            <pre className="mt-2 rounded bg-background border border-border p-2 text-xs font-mono overflow-x-auto">
              npx prisma db push &amp;&amp; npx prisma generate
            </pre>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/20">
          <CardContent className="p-4 text-sm flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <div className="font-semibold">
                {enabledCount} / {FLAG_REGISTRY.length} features enabled
              </div>
              <div className="text-xs text-muted-foreground">
                Flags ship disabled by default. Turn each on once you have validated it in this environment.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {Array.from(grouped.entries()).map(([category, defs]) => {
        const meta = CATEGORY_META[category];
        const Icon = meta.icon;
        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className={`h-4 w-4 ${meta.tone}`} /> {meta.label}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{meta.description}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {defs.map((def) => (
                <FlagToggleRow
                  key={def.key}
                  flagKey={def.key}
                  label={def.label}
                  description={def.description}
                  enabled={stateByKey[def.key]?.enabled ?? false}
                  updatedAt={stateByKey[def.key]?.updatedAt ?? null}
                  disabled={migrationPending}
                />
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
