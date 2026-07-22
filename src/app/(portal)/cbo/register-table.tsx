"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Follow-up register — sortable, filterable table view.
//
//  Client-side because the CBO filters and re-sorts while reading; round-tripping
//  each keystroke through the server would make it feel dead. The day's rows are
//  already in memory (one day's follow-ups), so filtering here is cheap.
//
//  Two levels of filtering, both requested:
//    • Top bar   — applies to the whole table, plus a vertical picker.
//    • Per-band  — each vertical section carries its own filters, scoped to it.
//  The follow-up text column is deliberately not filterable; it's the content
//  being read, not a facet to slice by.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import Link from "next/link";
import type { TaskStatus } from "@prisma/client";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import { Users, Crown, History, ArrowUp, ArrowDown, ChevronsUpDown, X } from "lucide-react";
import { classifyUpdate, timeOfDay } from "@/lib/followups";
import { LinkifiedText } from "@/components/linkified-text";

export type RegisterEntry = {
  id: string;
  createdAt: Date;
  note: string;
  newStatus: TaskStatus | null;
  authorName: string;
};

export type RegisterRow = {
  taskId: string;
  code: string;
  title: string;
  status: TaskStatus;
  priorityCode: string;
  verticalId: string;
  verticalName: string;
  verticalColor: string;
  verticalSort: number;
  teams: { name: string; head: string | null }[];
  members: string[];
  entries: RegisterEntry[];
};

type SortKey = "task" | "team" | "priority" | "status";
type SortDir = "asc" | "desc";
type Facets = { q: string; team: string; priority: string; status: string };

const EMPTY_FACETS: Facets = { q: "", team: "", priority: "", status: "" };

function ownerText(row: RegisterRow): string {
  return [...row.teams.flatMap((t) => [t.name, t.head ?? ""]), ...row.members].join(" ").toLowerCase();
}

function matches(row: RegisterRow, f: Facets): boolean {
  if (f.q && !`${row.title} ${row.code}`.toLowerCase().includes(f.q.toLowerCase())) return false;
  if (f.team && !ownerText(row).includes(f.team.toLowerCase())) return false;
  if (f.priority && row.priorityCode !== f.priority) return false;
  if (f.status && row.status !== f.status) return false;
  return true;
}

function compare(a: RegisterRow, b: RegisterRow, key: SortKey, dir: SortDir): number {
  let n = 0;
  switch (key) {
    case "task": n = a.title.localeCompare(b.title); break;
    // P1 → P4 sorts naturally as a string, and that is the priority order.
    case "priority": n = a.priorityCode.localeCompare(b.priorityCode); break;
    case "status": n = a.status.localeCompare(b.status); break;
    case "team": n = ownerText(a).localeCompare(ownerText(b)); break;
  }
  return dir === "asc" ? n : -n;
}

export function RegisterTable({ rows }: { rows: RegisterRow[] }) {
  const [facets, setFacets] = useState<Facets>(EMPTY_FACETS);
  const [vertical, setVertical] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "priority", dir: "asc" });

  const priorities = useMemo(() => Array.from(new Set(rows.map((r) => r.priorityCode))).sort(), [rows]);
  const statuses = useMemo(() => Array.from(new Set(rows.map((r) => r.status))).sort(), [rows]);
  const verticalOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) seen.set(r.verticalId, r.verticalName);
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  // Apply the table-wide filters, then group into vertical bands, then apply each
  // band's own filters and the active sort within it.
  const bands = useMemo(() => {
    const grouped = new Map<string, { id: string; name: string; color: string; sortOrder: number; rows: RegisterRow[] }>();
    for (const row of rows) {
      if (vertical && row.verticalId !== vertical) continue;
      if (!matches(row, facets)) continue;
      let band = grouped.get(row.verticalId);
      if (!band) {
        band = { id: row.verticalId, name: row.verticalName, color: row.verticalColor, sortOrder: row.verticalSort, rows: [] };
        grouped.set(row.verticalId, band);
      }
      band.rows.push(row);
    }
    return Array.from(grouped.values())
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map((band) => ({
        ...band,
        rows: [...band.rows].sort((a, b) => compare(a, b, sort.key, sort.dir)),
      }));
  }, [rows, facets, vertical, sort]);

  const shown = bands.reduce((n, b) => n + b.rows.length, 0);
  const filtered = shown !== rows.length;

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  function clearAll() {
    setFacets(EMPTY_FACETS);
    setVertical("");
  }

  return (
    <div className="space-y-2">
      {/* ── Table-wide filter bar ── */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-muted/30 p-2">
        <input
          value={facets.q}
          onChange={(e) => setFacets({ ...facets, q: e.target.value })}
          placeholder="Search task or code…"
          className="h-7 min-w-[150px] flex-1 rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary"
        />
        <input
          value={facets.team}
          onChange={(e) => setFacets({ ...facets, team: e.target.value })}
          placeholder="Team / head…"
          className="h-7 w-[130px] rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary"
        />
        <Select value={vertical} onChange={setVertical} className="w-[140px]">
          <option value="">All verticals</option>
          {verticalOptions.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </Select>
        <Select value={facets.priority} onChange={(v) => setFacets({ ...facets, priority: v })} className="w-[92px]">
          <option value="">Priority</option>
          {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
        <Select value={facets.status} onChange={(v) => setFacets({ ...facets, status: v })} className="w-[130px]">
          <option value="">Status</option>
          {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </Select>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {filtered ? `${shown} of ${rows.length} tasks` : `${rows.length} task${rows.length === 1 ? "" : "s"}`}
        </span>
        {(filtered || sort.key !== "priority" || sort.dir !== "asc") && (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] font-semibold hover:bg-accent"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* ── Mobile: sections as cards ── */}
      <div className="space-y-3 md:hidden">
        {bands.map((band) => (
          <div key={band.id}>
            <div className="mb-1.5 flex items-center justify-between gap-2 rounded-md px-2 py-1" style={{ backgroundColor: `${band.color}1a` }}>
              <span className="flex items-center gap-1.5 text-xs font-bold">
                <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: band.color }} />
                {band.name}
              </span>
              <span className="text-[10px] text-muted-foreground">{band.rows.length} task{band.rows.length === 1 ? "" : "s"}</span>
            </div>
            <div className="space-y-2">
              {band.rows.map((row) => (
                <div key={row.taskId} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <PriorityBadge code={row.priorityCode} />
                    <StatusBadge status={row.status} />
                    <span className="font-mono text-[10px] font-bold text-muted-foreground">{row.code}</span>
                  </div>
                  <Link href={`/cbo/tasks/${row.taskId}`} className="mt-1 block break-words text-sm font-medium hover:text-primary">
                    {row.title}
                  </Link>
                  <div className="mt-1.5"><Owner teams={row.teams} members={row.members} compact /></div>
                  <ul className="mt-2 space-y-1.5">
                    {row.entries.map((e) => <EntryLine key={e.id} entry={e} />)}
                  </ul>
                  <div className="mt-2"><TimelineLink taskId={row.taskId} /></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop: sectioned table ── */}
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40 text-left [&>th]:border-r [&>th]:border-border [&>th:last-child]:border-r-0">
              <SortableTh label="Task / Activity" sortKey="task" sort={sort} onSort={toggleSort} className="w-[30%]" />
              <SortableTh label="Team / Head" sortKey="team" sort={sort} onSort={toggleSort} className="w-[18%]" />
              <SortableTh label="Priority" sortKey="priority" sort={sort} onSort={toggleSort} className="w-[8%]" />
              <SortableTh label="Status" sortKey="status" sort={sort} onSort={toggleSort} className="w-[12%]" />
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Follow-up Done Today</th>
            </tr>
          </thead>

          {bands.map((band) => {
            return (
              <tbody key={band.id}>
                {/* Vertical banner */}
                <tr>
                  <td colSpan={5} className="border-y border-border px-3 py-1.5" style={{ backgroundColor: `${band.color}1a` }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold">
                        <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: band.color }} />
                        {band.name}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {band.rows.length} task{band.rows.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </td>
                </tr>

                {band.rows.map((row) => (
                  <tr key={row.taskId} className="border-b border-border/50 align-top last:border-b-0 [&>td]:border-r [&>td]:border-border [&>td:last-child]:border-r-0">
                    <td className="px-3 py-2.5">
                      <Link href={`/cbo/tasks/${row.taskId}`} className="text-sm font-medium hover:text-primary hover:underline">
                        {row.title}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-muted-foreground">{row.code}</span>
                        <TimelineLink taskId={row.taskId} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><Owner teams={row.teams} members={row.members} /></td>
                    <td className="px-3 py-2.5"><PriorityBadge code={row.priorityCode} /></td>
                    <td className="px-3 py-2.5"><StatusBadge status={row.status} /></td>
                    <td className="px-3 py-2.5">
                      <ul className="space-y-1.5">
                        {row.entries.map((e) => <EntryLine key={e.id} entry={e} />)}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            );
          })}
        </table>

        {bands.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">No tasks match the current filters.</div>
        )}
      </div>
    </div>
  );
}

// ── Small shared pieces ──────────────────────────────────────────────────────

function Select({
  value, onChange, children, className = "",
}: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-7 rounded border border-border bg-background px-1.5 text-xs outline-none focus:border-primary ${className}`}
    >
      {children}
    </select>
  );
}

function SortableTh({
  label, sortKey, sort, onSort, className = "",
}: {
  label: string; sortKey: SortKey; sort: { key: SortKey; dir: SortDir }; onSort: (k: SortKey) => void; className?: string;
}) {
  const active = sort.key === sortKey;
  const Icon = active ? (sort.dir === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;
  return (
    <th className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wide ${active ? "text-primary" : "text-muted-foreground"} ${className}`}>
      <button onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 hover:text-primary" title={`Sort by ${label}`}>
        {label}
        <Icon className={`h-3 w-3 ${active ? "" : "opacity-40"}`} />
      </button>
    </th>
  );
}

/** Assigned team with its head named underneath; falls back to individual members. */
export function Owner({
  teams, members, compact = false,
}: {
  teams: { name: string; head: string | null }[]; members: string[]; compact?: boolean;
}) {
  if (teams.length === 0 && members.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className={compact ? "flex flex-wrap items-center gap-x-2 gap-y-0.5" : "space-y-1"}>
      {teams.map((t) => (
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
      {teams.length === 0 && members.length > 0 ? (
        <span className="text-xs text-muted-foreground">{members.join(", ")}</span>
      ) : null}
    </div>
  );
}

/** One follow-up line — dimmed and smaller when it's a system-generated row. */
export function EntryLine({ entry }: { entry: RegisterEntry }) {
  const kind = classifyUpdate(entry.note);
  const isSystem = kind !== "note";
  return (
    <li className={`min-w-0 border-l-2 pl-2.5 text-sm ${isSystem ? "border-border text-muted-foreground" : "border-primary/50"}`}>
      <LinkifiedText text={entry.note} className={`whitespace-pre-line break-words ${isSystem ? "text-xs" : ""}`} />
      <div className="mt-0.5 text-[10px] text-muted-foreground">
        {timeOfDay(entry.createdAt)} · {entry.authorName}
        {isSystem ? <span className="ml-1 opacity-70">· {kind === "edit" ? "field edit" : "status change"}</span> : null}
      </div>
    </li>
  );
}

/** Jump from a day's entry to this task's full follow-up history across all days. */
export function TimelineLink({ taskId }: { taskId: string }) {
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
