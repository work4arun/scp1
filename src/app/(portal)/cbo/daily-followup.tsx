// ─────────────────────────────────────────────────────────────────────────────
//  Daily Follow-Up — date-wise view of SM task updates for the CBO overview.
//
//  Mirrors the CBO Office follow-up register: a month calendar where every date
//  carrying updates is clickable, and the selected date opens that day's
//  follow-ups grouped by vertical.
//
//  Server component — day/month selection travels through searchParams so the
//  whole thing renders on the server and links stay shareable.
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import type { TaskStatus } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import { ChevronLeft, ChevronRight, CalendarDays, LayoutList, Rows3, Users, Crown, History } from "lucide-react";
import {
  classifyUpdate,
  dayKey,
  dayLabel,
  formatMonthKey,
  monthGrid,
  monthLabel,
  shiftMonth,
  timeOfDay,
  todayKey,
} from "@/lib/followups";

export type FollowUpEntry = {
  id: string;
  createdAt: Date;
  note: string;
  newStatus: TaskStatus | null;
  authorName: string;
  task: {
    id: string;
    code: string;
    title: string;
    status: TaskStatus;
    vertical: { id: string; name: string; colorHex: string; sortOrder: number };
    priority: { code: string };
    /** Assigned teams — this is the register's "owner" column. `head` is null until one is set in Admin → Teams. */
    teams: { name: string; head: string | null }[];
    /** Individually assigned members, shown only when no team is assigned. */
    members: string[];
  };
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** How the selected day's entries are laid out. */
export type FollowUpView = "vertical" | "table";

export function DailyFollowUp({
  entries,
  year,
  month,
  selectedDay,
  view,
  searchParams,
}: {
  /** Every update filed in the displayed month (already timezone-bucketed by the caller's query range). */
  entries: FollowUpEntry[];
  year: number;
  month: number;
  /** "2026-07-21", or null when no date is selected. */
  selectedDay: string | null;
  /** "vertical" = grouped cards per vertical, "table" = one flat horizontal register. */
  view: FollowUpView;
  /** Current page searchParams, so month/day links preserve the task-list filters. */
  searchParams: Record<string, string | undefined>;
}) {
  // Bucket the month's entries by local calendar day.
  const byDay = new Map<string, FollowUpEntry[]>();
  for (const entry of entries) {
    const key = dayKey(entry.createdAt);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(entry);
    else byDay.set(key, [entry]);
  }

  const { days, firstWeekday } = monthGrid(year, month);
  const today = todayKey();
  const monthPrefix = formatMonthKey(year, month);

  function hrefWith(overrides: Record<string, string | undefined>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...searchParams, ...overrides })) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `/cbo?${qs}` : "/cbo";
  }

  const daysWithEntries = Array.from(byDay.keys()).filter((key) => key.startsWith(monthPrefix)).sort();
  // Open on today when it has follow-ups, else the most recent day that does — so
  // the CBO reads the latest follow-up without spending a click.
  const fallbackDay = byDay.has(today) && today.startsWith(monthPrefix) ? today : daysWithEntries[daysWithEntries.length - 1] ?? null;
  const openDay = selectedDay ?? fallbackDay;

  const dayEntries = openDay ? byDay.get(openDay) ?? [] : [];
  const monthTotal = daysWithEntries.reduce((sum, key) => sum + (byDay.get(key)?.length ?? 0), 0);
  const activeDays = daysWithEntries.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Daily Follow-Up</CardTitle>
          <span className="text-[11px] text-muted-foreground">
            {monthTotal > 0 ? `${monthTotal} update${monthTotal === 1 ? "" : "s"} across ${activeDays} day${activeDays === 1 ? "" : "s"}` : "no updates filed"}
          </span>
        </div>
      </CardHeader>

      <CardContent>
        {/* Compact calendar sits beside the day's follow-ups on wide screens. */}
        <div className="grid gap-4 lg:grid-cols-[218px_minmax(0,1fr)]">
          {/* ── Calendar ── */}
          {/* Capped and centred on phones so the 7-day grid keeps square-ish cells
              instead of stretching into wide slivers; pinned beside the detail on lg. */}
          <div className="mx-auto w-full max-w-[260px] lg:mx-0 lg:max-w-none lg:sticky lg:top-4 lg:self-start">
            {/* Month shifter sits directly above the weekday row so the whole calendar
                control reads top-down: month → weekdays → dates. */}
            <div className="mb-1.5 flex items-center justify-between gap-1">
              <Link
                href={hrefWith({ m: shiftMonth(year, month, -1), d: undefined })}
                aria-label="Previous month"
                className="rounded-md border border-border p-1 hover:bg-accent transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Link>
              <span className="text-xs font-bold">{monthLabel(year, month)}</span>
              <Link
                href={hrefWith({ m: shiftMonth(year, month, 1), d: undefined })}
                aria-label="Next month"
                className="rounded-md border border-border p-1 hover:bg-accent transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-7 gap-[3px]">
              {WEEKDAYS.map((w) => (
                <div key={w} className="pb-0.5 text-center text-[9px] font-bold uppercase text-muted-foreground">
                  {w.slice(0, 1)}
                </div>
              ))}
              {Array.from({ length: firstWeekday }).map((_, i) => (
                <div key={`blank-${i}`} />
              ))}
              {Array.from({ length: days }).map((_, i) => {
                const dayNum = i + 1;
                const key = `${monthPrefix}-${String(dayNum).padStart(2, "0")}`;
                const count = byDay.get(key)?.length ?? 0;
                const isSelected = key === openDay;
                const isToday = key === today;

                if (count === 0) {
                  return (
                    <div
                      key={key}
                      className={`flex h-7 items-center justify-center rounded border border-dashed border-border/50 text-[10px] text-muted-foreground/40 ${isToday ? "ring-1 ring-primary/40" : ""}`}
                    >
                      {dayNum}
                    </div>
                  );
                }

                return (
                  <Link
                    key={key}
                    href={hrefWith({ d: key, m: monthPrefix })}
                    title={`${count} update${count === 1 ? "" : "s"}`}
                    className={`relative flex h-7 items-center justify-center rounded border text-[10px] font-bold transition-colors ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : `border-border bg-card text-foreground hover:bg-accent ${isToday ? "ring-1 ring-primary/40" : ""}`
                    }`}
                  >
                    {dayNum}
                    <span
                      className={`absolute bottom-[3px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${isSelected ? "bg-primary-foreground/80" : "bg-primary"}`}
                    />
                  </Link>
                );
              })}
            </div>
            <div className="mt-2 space-y-0.5 text-[9px] leading-relaxed text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-1 w-1 rounded-full bg-primary" /> has follow-ups — click to open
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm ring-1 ring-primary/40" /> today
              </div>
            </div>
          </div>

          {/* ── Selected day ── */}
          {openDay ? (
            <DayDetail dayKeyValue={openDay} entries={dayEntries} view={view} hrefWith={hrefWith} />
          ) : (
            <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
              No follow-ups filed in {monthLabel(year, month)} yet.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type TaskGroup = { task: FollowUpEntry["task"]; entries: FollowUpEntry[] };
type VerticalGroup = { name: string; colorHex: string; sortOrder: number; tasks: Map<string, TaskGroup> };

function DayDetail({
  dayKeyValue,
  entries,
  view,
  hrefWith,
}: {
  dayKeyValue: string;
  entries: FollowUpEntry[];
  view: FollowUpView;
  hrefWith: (overrides: Record<string, string | undefined>) => string;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
        No follow-up entries filed on {dayLabel(dayKeyValue)}.
      </div>
    );
  }

  const written = entries.filter((e) => classifyUpdate(e.note) === "note");
  const taskIds = new Set(entries.map((e) => e.task.id));
  const completed = new Set(entries.filter((e) => e.newStatus === "COMPLETED").map((e) => e.task.id));

  // Group by vertical → task, preserving vertical sortOrder and chronological entries.
  const verticals = new Map<string, VerticalGroup>();
  for (const entry of entries) {
    const v = entry.task.vertical;
    let group = verticals.get(v.id);
    if (!group) {
      group = { name: v.name, colorHex: v.colorHex, sortOrder: v.sortOrder, tasks: new Map() };
      verticals.set(v.id, group);
    }
    let taskGroup = group.tasks.get(entry.task.id);
    if (!taskGroup) {
      taskGroup = { task: entry.task, entries: [] };
      group.tasks.set(entry.task.id, taskGroup);
    }
    taskGroup.entries.push(entry);
  }
  const orderedVerticals = Array.from(verticals.values()).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold">Follow-Up — {dayLabel(dayKeyValue)}</h3>
          <span className="text-[11px] text-muted-foreground">{written.length} written · {entries.length} total</span>
        </div>
        <ViewToggle view={view} hrefWith={hrefWith} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi value={taskIds.size} label="Tasks touched" />
        <Kpi value={written.length} label="Follow-ups" />
        <Kpi value={completed.size} label="Marked done" />
        <Kpi value={orderedVerticals.length} label="Verticals" />
      </div>

      {view === "table" ? <TableView verticals={orderedVerticals} /> : <VerticalView verticals={orderedVerticals} />}
    </div>
  );
}

/** Segmented switch between the grouped and flat-register layouts. */
function ViewToggle({ view, hrefWith }: { view: FollowUpView; hrefWith: (o: Record<string, string | undefined>) => string }) {
  // Table is the default view, so it's the one that drops the `fv` param.
  const options: { key: FollowUpView; label: string; icon: typeof Rows3 }[] = [
    { key: "table", label: "Table", icon: Rows3 },
    { key: "vertical", label: "By vertical", icon: LayoutList },
  ];
  return (
    <div className="inline-flex rounded-md border border-border p-0.5">
      {options.map((o) => {
        const Icon = o.icon;
        const active = o.key === view;
        return (
          <Link
            key={o.key}
            href={hrefWith({ fv: o.key === "table" ? undefined : o.key })}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Icon className="h-3 w-3" />
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

/** Grouped layout — one card per vertical, tasks stacked inside. */
function VerticalView({ verticals }: { verticals: VerticalGroup[] }) {
  return (
    <>
      {verticals.map((group) => (
        <div key={group.name} className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: group.colorHex }} />
              <h4 className="text-xs font-bold">{group.name}</h4>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {group.tasks.size} task{group.tasks.size === 1 ? "" : "s"}
            </span>
          </div>
          <div>
            {Array.from(group.tasks.values()).map(({ task, entries: taskEntries }) => (
              <div key={task.id} className="border-b border-border px-3 py-2.5 last:border-b-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[10px] font-bold text-muted-foreground">{task.code}</span>
                  <PriorityBadge code={task.priority.code} />
                  <StatusBadge status={task.status} />
                  <Link href={`/cbo/tasks/${task.id}`} className="break-words text-sm font-medium hover:text-primary hover:underline">
                    {task.title}
                  </Link>
                  <TimelineLink taskId={task.id} />
                </div>
                <div className="mt-1"><Owner task={task} compact /></div>
                <ul className="mt-1.5 space-y-1.5">
                  {taskEntries.map((entry) => (
                    <EntryLine key={entry.id} entry={entry} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Flat register layout — the horizontal Task / Priority / Status / Follow-up table
 * from the CBO Office follow-up sheet, with the vertical as a column instead of a
 * grouping header. Scrolls inside its own container on narrow screens.
 */
function TableView({ verticals }: { verticals: VerticalGroup[] }) {
  const rows = verticals.flatMap((group) =>
    Array.from(group.tasks.values()).map((taskGroup) => ({ group, ...taskGroup })),
  );

  return (
    <>
      {/* Mobile — the same register as stacked cards; a 6-column table can't be read on a phone. */}
      <div className="space-y-2 md:hidden">
        {rows.map(({ group, task, entries: taskEntries }) => (
          <div key={task.id} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: group.colorHex }}>
                {group.name}
              </span>
              <PriorityBadge code={task.priority.code} />
              <StatusBadge status={task.status} />
              <span className="font-mono text-[10px] font-bold text-muted-foreground">{task.code}</span>
            </div>
            <Link href={`/cbo/tasks/${task.id}`} className="mt-1 block break-words text-sm font-medium hover:text-primary">
              {task.title}
            </Link>
            <div className="mt-1.5"><Owner task={task} compact /></div>
            <ul className="mt-2 space-y-1.5">
              {taskEntries.map((entry) => (
                <EntryLine key={entry.id} entry={entry} />
              ))}
            </ul>
            <div className="mt-2"><TimelineLink taskId={task.id} /></div>
          </div>
        ))}
      </div>

      {/* Desktop — full horizontal register. */}
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left">
            <Th className="w-[16%]">Vertical</Th>
            <Th className="w-[26%]">Task / Activity</Th>
            <Th className="w-[16%]">Team / Head</Th>
            <Th className="w-[7%]">Priority</Th>
            <Th className="w-[11%]">Status</Th>
            <Th>Follow-up Done Today</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ group, task, entries: taskEntries }) => (
            <tr key={task.id} className="border-b border-border align-top last:border-b-0">
              <td className="px-3 py-2.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: group.colorHex }} />
                  {group.name}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <Link href={`/cbo/tasks/${task.id}`} className="text-sm font-medium hover:text-primary hover:underline">
                  {task.title}
                </Link>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-muted-foreground">{task.code}</span>
                  <TimelineLink taskId={task.id} />
                </div>
              </td>
              <td className="px-3 py-2.5"><Owner task={task} /></td>
              <td className="px-3 py-2.5"><PriorityBadge code={task.priority.code} /></td>
              <td className="px-3 py-2.5"><StatusBadge status={task.status} /></td>
              <td className="px-3 py-2.5">
                <ul className="space-y-1.5">
                  {taskEntries.map((entry) => (
                    <EntryLine key={entry.id} entry={entry} />
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground ${className}`}>{children}</th>;
}

/** Jump from a day's entry to this task's full follow-up history across all days. */
function TimelineLink({ taskId }: { taskId: string }) {
  return (
    <Link
      href={`/cbo/tasks/${taskId}#timeline`}
      title="See every follow-up for this task, start to end"
      className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground hover:text-primary"
    >
      <History className="h-3 w-3" />
      Timeline
    </Link>
  );
}

/**
 * The register's owner column: assigned team, with its head named underneath.
 * Falls back to individually assigned members when a task has no team.
 */
function Owner({ task, compact = false }: { task: FollowUpEntry["task"]; compact?: boolean }) {
  if (task.teams.length === 0 && task.members.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className={compact ? "flex flex-wrap items-center gap-x-2 gap-y-0.5" : "space-y-1"}>
      {task.teams.map((t) => (
        <div key={t.name} className={compact ? "inline-flex items-center gap-1" : ""}>
          <span className="inline-flex items-center gap-1 text-xs font-semibold">
            <Users className="h-3 w-3 shrink-0 text-muted-foreground" />
            {t.name}
          </span>
          {t.head ? (
            <span className={`text-[10px] text-muted-foreground ${compact ? "ml-1" : "ml-4 block"}`}>
              <Crown className="mr-0.5 inline h-2.5 w-2.5" />
              {t.head}
            </span>
          ) : null}
        </div>
      ))}
      {task.teams.length === 0 && task.members.length > 0 ? (
        <span className="text-xs text-muted-foreground">{task.members.join(", ")}</span>
      ) : null}
    </div>
  );
}

/** One follow-up line — dimmed and smaller when it's a system-generated row. */
function EntryLine({ entry }: { entry: FollowUpEntry }) {
  const kind = classifyUpdate(entry.note);
  const isSystem = kind !== "note";
  return (
    <li className={`min-w-0 border-l-2 pl-2.5 text-sm ${isSystem ? "border-border text-muted-foreground" : "border-primary/50"}`}>
      <div className={`whitespace-pre-line break-words ${isSystem ? "text-xs" : ""}`}>{entry.note}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">
        {timeOfDay(entry.createdAt)} · {entry.authorName}
        {isSystem ? <span className="ml-1 opacity-70">· {kind === "edit" ? "field edit" : "status change"}</span> : null}
      </div>
    </li>
  );
}

function Kpi({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <div className="text-xl font-bold text-primary">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
