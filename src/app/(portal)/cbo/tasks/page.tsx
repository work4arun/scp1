import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PriorityBadge, StatusBadge } from "@/components/status-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskFilterBar } from "../task-filter-bar";
import { ConversationButton } from "@/components/conversation-button";
import { buildTaskWhere, buildSearchParams, type TaskFilterParams } from "../task-filter-utils";
import { formatRelative, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Mic, MessageSquare, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";

export default async function CboAllTasks({ searchParams }: { searchParams: TaskFilterParams }) {
  const session = await auth();
  if (session?.user.systemRole !== "CBO" && session?.user.systemRole !== "SUPER_ADMIN") redirect("/");

  const filterWhere = buildTaskWhere(searchParams);
  const where = { AND: [{ status: { not: "DROPPED" } as const }, filterWhere] };

  const [allTasks, verticals, priorities, teams] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ priority: { rank: "asc" } }, { createdAt: "asc" }],
      include: {
        vertical: true, priority: true,
        teamAssignments: { include: { team: true } },
        assignees: { include: { member: true } },
        updates: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { messages: true } },
        messages: { select: { text: true, audioBytes: true } },
      },
    }),
    prisma.vertical.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.priority.findMany({ where: { active: true }, orderBy: { rank: "asc" } }),
    prisma.team.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const searchLabel = searchParams.q ? ` · Search: "${searchParams.q}"` : "";

  const sortKey: SortKey = isSortKey(searchParams.sort) ? searchParams.sort : "deadline";
  const sortDir: "asc" | "desc" = searchParams.dir === "desc" ? "desc" : "asc";
  const dirMult = sortDir === "desc" ? -1 : 1;

  const sortedTasks = [...allTasks].sort((a, b) => {
    const va = sortValue(a, sortKey);
    const vb = sortValue(b, sortKey);
    const cmp = typeof va === "string" && typeof vb === "string" ? va.localeCompare(vb) : (va as number) - (vb as number);
    return cmp * dirMult;
  });

  function headerHref(col: SortKey) {
    const sp = buildSearchParams({
      ...searchParams,
      sort: col,
      dir: sortKey === col && sortDir === "asc" ? "desc" : "asc",
    });
    return `/cbo/tasks?${sp.toString()}`;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader title="All Tasks" description="Full task register with filters." />
      <TaskFilterBar active={searchParams} basePath="/cbo/tasks" options={{ verticals: verticals.map((v) => ({ id: v.id, code: v.code, name: v.name })), priorities: priorities.map((p) => ({ id: p.id, code: p.code, label: p.label })), teams: teams.map((t) => ({ id: t.id, name: t.name })) }} />

      <Card id="full-task-register">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-sm">Full Task Register</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">{sortedTasks.length} task{sortedTasks.length !== 1 && "s"}{searchLabel}{sortedTasks.length > 0 && ` · Sorted by ${SORT_LABEL[sortKey]} (${sortDir})`}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {allTasks.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground text-center">No active tasks found.</div>
          ) : (
            <>
              {/* Desktop view — hidden on mobile, visible on md+. Fits without horizontal scroll. */}
              <div className="hidden md:block overflow-hidden rounded-lg border border-border">
                {/* Header row — clickable to sort. Default sort is by deadline. */}
                <div className="grid grid-cols-[88px_minmax(0,1.4fr)_52px_minmax(0,120px)_88px_96px_minmax(0,1fr)_60px] border-b border-border bg-muted/50 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  <SortTh label="Vertical" col="vertical" sortKey={sortKey} sortDir={sortDir} href={headerHref("vertical")} />
                  <SortTh label="Task / Activity" col="title" sortKey={sortKey} sortDir={sortDir} href={headerHref("title")} />
                  <SortTh label="Priority" col="priority" sortKey={sortKey} sortDir={sortDir} href={headerHref("priority")} center />
                  <SortTh label="Assigned" col="assigned" sortKey={sortKey} sortDir={sortDir} href={headerHref("assigned")} />
                  <SortTh label="Deadline" col="deadline" sortKey={sortKey} sortDir={sortDir} href={headerHref("deadline")} />
                  <SortTh label="Status" col="status" sortKey={sortKey} sortDir={sortDir} href={headerHref("status")} center />
                  <SortTh label="Updated Next Action" col="updated" sortKey={sortKey} sortDir={sortDir} href={headerHref("updated")} />
                  <SortTh label="Chat" col="chat" sortKey={sortKey} sortDir={sortDir} href={headerHref("chat")} center />
                </div>
                {/* Data rows — each is a clickable Link */}
                {sortedTasks.map((t, i) => {
                  const lastUpdate = t.updates[0]; const isDelayed = t.status === "DELAYED";
                  const isOverdue = !!t.deadline && new Date(t.deadline).getTime() < Date.now() && t.status !== "COMPLETED";
                  const textCount = t.messages.filter((m) => m.text != null).length;
                  const voiceCount = t.messages.filter((m) => m.audioBytes != null).length;
                  const hasChat = textCount > 0 || voiceCount > 0;
                  return (
                    <Link
                      key={t.id}
                      href={`/cbo/tasks/${t.id}`}
                      className={`grid grid-cols-[88px_minmax(0,1.4fr)_52px_minmax(0,120px)_88px_96px_minmax(0,1fr)_60px] border-b border-border/70 text-xs transition-colors hover:bg-accent ${i % 2 === 0 ? "bg-card" : "bg-muted/10"} ${isDelayed ? "bg-red-50 dark:bg-red-950/10" : ""}`}
                      style={{ borderLeft: `3px solid ${t.vertical.colorHex}` }}
                    >
                      <div className="flex min-w-0 items-center px-2 py-2 first:pl-3">
                        <span className="break-words rounded px-1.5 py-0.5 text-[10px] font-bold leading-tight text-white" style={{ backgroundColor: t.vertical.colorHex }}>{t.vertical.name}</span>
                      </div>
                      <div className="flex min-w-0 items-center border-l border-border/60 px-2 py-2">
                        <div className="min-w-0">
                          <div className="break-words font-medium leading-snug">{t.title}</div>
                          <div className="mt-0.5 font-mono text-[10px] font-bold text-primary">{t.code}</div>
                        </div>
                      </div>
                      <div className="flex min-w-0 items-center justify-center border-l border-border/60 px-2 py-2"><PriorityBadge code={t.priority.code} /></div>
                      <div className="flex min-w-0 items-center border-l border-border/60 px-2 py-2"><span className="break-words text-muted-foreground leading-snug">{assigneeLabel(t)}</span></div>
                      <div className="flex min-w-0 items-center border-l border-border/60 px-2 py-2 whitespace-nowrap">
                        <span className={isOverdue ? "font-semibold text-red-600" : ""}>{t.deadline ? formatDate(t.deadline) : "—"}</span>
                        {isOverdue && <span className="ml-1 text-[10px] font-semibold text-red-500">Overdue</span>}
                      </div>
                      <div className="flex min-w-0 items-center justify-center border-l border-border/60 px-2 py-2"><StatusBadge status={t.status} /></div>
                      <div className="flex min-w-0 items-center border-l border-border/60 px-2 py-2">
                        <div className="min-w-0">
                          <div className="break-words leading-snug">{t.nextAction || "—"}</div>
                          <div className="text-[10px] text-muted-foreground">{lastUpdate ? `Updated ${formatRelative(lastUpdate.createdAt)}` : "No updates"}</div>
                        </div>
                      </div>
                      <div className="flex min-w-0 items-center justify-center border-l border-border/60 px-2 py-2">
                        {hasChat ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {textCount > 0 && <span>{textCount}</span>}
                            {voiceCount > 0 && <span className="inline-flex items-center gap-0.5"><Mic className="h-3 w-3" />{voiceCount}</span>}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-1 text-[10px] text-muted-foreground">
                            <MessageSquare className="h-3.5 w-3.5" />Chat
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Mobile cards — visible on mobile only */}
              <div className="md:hidden space-y-2">
                {allTasks.map((t) => {
                  const lastUpdate = t.updates[0]; const isDelayed = t.status === "DELAYED";
                  const assigneeLabel = t.teamAssignments.length > 0 ? t.teamAssignments.map((ta) => `[${ta.team.name}]`).join(", ") : t.assignees.map((a) => a.member.name).join(", ") || "—";
                  const textCount = t.messages.filter((m) => m.text != null).length;
                  const voiceCount = t.messages.filter((m) => m.audioBytes != null).length;
                  return (
                    <div key={t.id} className={`rounded-lg border p-3 space-y-2 ${isDelayed ? "border-red-300 bg-red-50 dark:bg-red-950/10" : "border-border"}`}>
                      <div className="flex items-center gap-2">
                        <Link href={`/cbo/tasks/${t.id}`} className="font-mono text-xs font-bold text-primary hover:underline">{t.code}</Link>
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: t.vertical.colorHex }}>{t.vertical.name}</span>
                        <PriorityBadge code={t.priority.code} />
                        <StatusBadge status={t.status} />
                      </div>
                      <div className="text-sm font-semibold">{t.title}</div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <div><span className="text-muted-foreground">Assigned:</span> {assigneeLabel}</div>
                        <div><span className="text-muted-foreground">Deadline:</span> {t.deadline ? formatDate(t.deadline) : "—"}</div>
                        <div><span className="text-muted-foreground">Updated:</span> {lastUpdate ? formatRelative(lastUpdate.createdAt) : "—"}</div>
                        <div><span className="text-muted-foreground">Dr. BN:</span> {t.intervention === "NO" ? "No" : t.intervention === "YES" ? "Yes" : "If delayed"}</div>
                      </div>
                      {t.delayReason && <div className="text-xs text-red-600 font-semibold">Delay: {t.delayReason}</div>}
                      {t.supportNeeded && <div className="text-xs">Support: {t.supportNeeded}</div>}
                      {t.nextAction && <div className="text-xs text-muted-foreground">Next: {t.nextAction}</div>}
                      <ConversationButton taskId={t.id} baseUrl="/cbo/tasks" textCount={textCount} voiceCount={voiceCount} />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type SortKey = "vertical" | "title" | "priority" | "assigned" | "deadline" | "status" | "updated" | "chat";

const SORT_KEYS: readonly SortKey[] = ["vertical", "title", "priority", "assigned", "deadline", "status", "updated", "chat"];

const SORT_LABEL: Record<SortKey, string> = {
  vertical: "Vertical",
  title: "Task / Activity",
  priority: "Priority",
  assigned: "Assigned",
  deadline: "Deadline",
  status: "Status",
  updated: "Updated Next Action",
  chat: "Chat",
};

const STATUS_ORDER: Record<string, number> = {
  NOT_STARTED: 0,
  IN_PROGRESS: 1,
  WAITING_FOR_INPUT: 2,
  WAITING_FOR_APPROVAL: 3,
  DELAYED: 4,
  COMPLETED: 5,
  PARKED: 6,
  DROPPED: 7,
};

function isSortKey(v: string | undefined): v is SortKey {
  return !!v && (SORT_KEYS as readonly string[]).includes(v);
}

type TaskRow = {
  id: string;
  code: string;
  title: string;
  vertical: { sortOrder: number; name: string; colorHex: string };
  priority: { rank: number; code: string };
  status: string;
  deadline: Date | null;
  nextAction: string | null;
  teamAssignments: { team: { name: string } }[];
  assignees: { member: { name: string } }[];
  updates: { createdAt: Date }[];
  _count: { messages: number };
};

function assigneeLabel(t: TaskRow) {
  return t.teamAssignments.length > 0
    ? t.teamAssignments.map((ta) => `[${ta.team.name}]`).join(", ")
    : t.assignees.map((a) => a.member.name).join(", ") || "—";
}

function sortValue(t: TaskRow, key: SortKey): string | number {
  switch (key) {
    case "vertical": return t.vertical.sortOrder;
    case "title": return t.title.toLowerCase();
    case "priority": return t.priority.rank;
    case "assigned": return assigneeLabel(t).toLowerCase();
    case "deadline": return t.deadline ? t.deadline.getTime() : Infinity;
    case "status": return STATUS_ORDER[t.status] ?? 0;
    case "updated": return t.updates[0]?.createdAt ? t.updates[0].createdAt.getTime() : -Infinity;
    case "chat": return t._count.messages;
  }
}

function SortTh({
  label,
  col,
  sortKey,
  sortDir,
  href,
  center = false,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  href: string;
  center?: boolean;
}) {
  const active = sortKey === col;
  return (
    <div className="flex min-w-0 items-center border-l border-border/60 px-2 py-2 first:border-l-0 first:pl-3">
      <Link
        href={href}
        title={`Sort by ${label}`}
        className={`inline-flex items-center gap-1 transition-colors ${center ? "w-full justify-center" : ""} ${active ? "text-primary" : "hover:text-foreground"}`}
      >
        {label}
        {active ? (
          sortDir === "asc" ? <ArrowUp className="h-3 w-3 shrink-0" /> : <ArrowDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-40" />
        )}
      </Link>
    </div>
  );
}
