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
import { ChevronLeft, ChevronRight, CalendarDays, LayoutList, Rows3 } from "lucide-react";
import {
  classifyUpdate,
  dayKey,
  dayLabel,
  dayName,
  formatMonthKey,
  monthGrid,
  monthLabel,
  shiftMonth,
  todayKey,
} from "@/lib/followups";
// Shared with the client table so the two views render follow-ups identically.
import { RegisterTable, Owner, EntryLine, TimelineLink, type RegisterRow } from "./register-table";

export type FollowUpEntry = {
  id: string;
  createdAt: Date;
  note: string;
  newStatus: TaskStatus | null;
  authorName: string;
  /** Attachments filed with this update. */
  files: { id: string; fileName: string; fileMime: string; fileSize: number }[];
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
    /* Width comes from the container — the sidebar slot on lg+, a capped inline
       block on smaller screens. */
    <div className="w-full rounded-lg border border-border bg-card p-2.5">
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

      {view === "table" ? <RegisterTable rows={toRegisterRows(orderedVerticals)} /> : <VerticalView verticals={orderedVerticals} />}
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
                <div className="mt-1"><Owner teams={task.teams} members={task.members} compact /></div>
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
 * Flatten the grouped structure into the flat rows the client table wants.
 * Everything crossing into the client component must be serialisable — plain
 * objects and Dates only, which is why the Maps are unwound here.
 */
function toRegisterRows(verticals: VerticalGroup[]): RegisterRow[] {
  return verticals.flatMap((group) =>
    Array.from(group.tasks.values()).map(({ task, entries }) => ({
      taskId: task.id,
      code: task.code,
      title: task.title,
      status: task.status,
      priorityCode: task.priority.code,
      verticalId: task.vertical.id,
      verticalName: group.name,
      verticalColor: group.colorHex,
      verticalSort: group.sortOrder,
      teams: task.teams,
      members: task.members,
      entries: entries.map((e) => ({
        id: e.id,
        createdAt: e.createdAt,
        note: e.note,
        newStatus: e.newStatus,
        authorName: e.authorName,
        files: e.files,
      })),
    })),
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
