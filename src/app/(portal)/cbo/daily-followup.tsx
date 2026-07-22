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
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import { ChevronLeft, ChevronRight, CalendarDays, LayoutList, Rows3, Users, Crown, History } from "lucide-react";
import {
  classifyUpdate,
  dayKey,
  dayLabel,
  dayName,
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

/**
 * Shared state for the calendar and the day panel. They render in two different
 * places on the page (header corner vs full-width card) but must agree on which
 * day is open, so the bucketing happens once here and both read from it.
 */
export type FollowUpModel = {
  byDay: Map<string, FollowUpEntry[]>;
  /** The day being shown — the explicit selection, else today, else the latest day with entries. */
  openDay: string | null;
  dayEntries: FollowUpEntry[];
  monthTotal: number;
  activeDays: number;
};

export function buildFollowUpModel(
  entries: FollowUpEntry[],
  year: number,
  month: number,
  selectedDay: string | null,
): FollowUpModel {
  const byDay = new Map<string, FollowUpEntry[]>();
  for (const entry of entries) {
    const key = dayKey(entry.createdAt);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(entry);
    else byDay.set(key, [entry]);
  }

  const monthPrefix = formatMonthKey(year, month);
  const today = todayKey();
  const daysWithEntries = Array.from(byDay.keys()).filter((key) => key.startsWith(monthPrefix)).sort();

  // Open on today when it has follow-ups, else the most recent day that does — so
  // the CBO reads the latest follow-up without spending a click.
  const fallbackDay = byDay.has(today) && today.startsWith(monthPrefix) ? today : daysWithEntries[daysWithEntries.length - 1] ?? null;
  const openDay = selectedDay ?? fallbackDay;

  return {
    byDay,
    openDay,
    dayEntries: openDay ? byDay.get(openDay) ?? [] : [],
    monthTotal: daysWithEntries.reduce((sum, key) => sum + (byDay.get(key)?.length ?? 0), 0),
    activeDays: daysWithEntries.length,
  };
}

function makeHrefWith(searchParams: Record<string, string | undefined>) {
  return (overrides: Record<string, string | undefined>): string => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...searchParams, ...overrides })) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `/cbo?${qs}` : "/cbo";
  };
}

/**
 * The compact month picker. Sized to sit in the page-header corner so the
 * follow-up register below it gets the full page width.
 */
export function FollowUpCalendar({
  model,
  year,
  month,
  searchParams,
}: {
  model: FollowUpModel;
  year: number;
  month: number;
  searchParams: Record<string, string | undefined>;
}) {
  const { byDay, openDay, monthTotal, activeDays } = model;
  const { days, firstWeekday } = monthGrid(year, month);
  const today = todayKey();
  const monthPrefix = formatMonthKey(year, month);
  const hrefWith = makeHrefWith(searchParams);

  return (
    <div className="w-full rounded-lg border border-border bg-card p-2.5 sm:w-[228px]">
      <div className="mb-1.5 flex items-center gap-1.5">
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="text-[11px] font-bold">Daily Follow-Up</span>
      </div>
          {/* Month shifter sits directly above the weekday row so the whole calendar
              control reads top-down: month → weekdays → dates. */}
          <div>
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
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[9px] leading-relaxed text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block h-1 w-1 rounded-full bg-primary" /> has follow-ups
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm ring-1 ring-primary/40" /> today
              </span>
            </div>
            <div className="mt-1 text-[9px] text-muted-foreground">
              {monthTotal > 0 ? `${monthTotal} update${monthTotal === 1 ? "" : "s"} · ${activeDays} day${activeDays === 1 ? "" : "s"}` : "no updates filed"}
            </div>
          </div>
    </div>
  );
}

/** The day's follow-up register — rendered full width, below the header. */
export function DailyFollowUpPanel({
  model,
  year,
  month,
  view,
  searchParams,
}: {
  model: FollowUpModel;
  year: number;
  month: number;
  /** "vertical" = grouped cards per vertical, "table" = one flat horizontal register. */
  view: FollowUpView;
  searchParams: Record<string, string | undefined>;
}) {
  const { openDay, dayEntries } = model;
  const hrefWith = makeHrefWith(searchParams);

  return (
    <Card>
      <CardContent className="pt-4">
        {openDay ? (
          <DayDetail dayKeyValue={openDay} entries={dayEntries} view={view} hrefWith={hrefWith} />
        ) : (
          <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
            No follow-ups filed in {monthLabel(year, month)} yet.
          </div>
        )}
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
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Follow-Up</div>
          <h3 className="mt-0.5 text-lg font-bold leading-tight tracking-tight text-primary sm:text-xl">
            {dayName(dayKeyValue)}
            <span className="text-foreground">, {dayLabel(dayKeyValue)}</span>
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">{written.length}</span> written
            <span className="text-border">•</span>
            <span className="font-semibold text-foreground">{entries.length}</span> total
          </div>
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
 * Horizontal register from the CBO Office follow-up sheet, split into vertical
 * sections inside the table: each vertical gets a full-width banner row, and its
 * tasks follow underneath. That drops the repeating Vertical column and hands the
 * space back to the follow-up text. Scrolls inside its own container when narrow.
 */
function TableView({ verticals }: { verticals: VerticalGroup[] }) {
  return (
    <>
      {/* Mobile — the same sections as stacked cards; a table can't be read on a phone. */}
      <div className="space-y-3 md:hidden">
        {verticals.map((group) => (
          <div key={group.name}>
            <div className="mb-1.5 flex items-center justify-between gap-2 rounded-md px-2 py-1" style={{ backgroundColor: `${group.colorHex}1a` }}>
              <span className="flex items-center gap-1.5 text-xs font-bold">
                <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: group.colorHex }} />
                {group.name}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {group.tasks.size} task{group.tasks.size === 1 ? "" : "s"}
              </span>
            </div>
            <div className="space-y-2">
              {Array.from(group.tasks.values()).map(({ task, entries: taskEntries }) => (
                <div key={task.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
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
          </div>
        ))}
      </div>

      {/* Desktop — full horizontal register, sectioned by vertical. */}
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-border bg-muted/40 text-left [&>th]:border-r [&>th]:border-border [&>th:last-child]:border-r-0">
            <Th className="w-[30%]">Task / Activity</Th>
            <Th className="w-[18%]">Team / Head</Th>
            <Th className="w-[8%]">Priority</Th>
            <Th className="w-[12%]">Status</Th>
            <Th>Follow-up Done Today</Th>
          </tr>
        </thead>
        {verticals.map((group) => (
          <tbody key={group.name}>
            {/* Vertical banner — spans the table, tinted with the vertical's own colour. */}
            <tr>
              <td colSpan={5} className="border-y border-border px-3 py-1.5" style={{ backgroundColor: `${group.colorHex}1a` }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold">
                    <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: group.colorHex }} />
                    {group.name}
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {group.tasks.size} task{group.tasks.size === 1 ? "" : "s"}
                  </span>
                </div>
              </td>
            </tr>
            {Array.from(group.tasks.values()).map(({ task, entries: taskEntries }) => (
            /* Light horizontal rule between rows, solid vertical rules between columns. */
            <tr key={task.id} className="border-b border-border/50 align-top last:border-b-0 [&>td]:border-r [&>td]:border-border [&>td:last-child]:border-r-0">
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
        ))}
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
