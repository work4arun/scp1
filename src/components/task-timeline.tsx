// ─────────────────────────────────────────────────────────────────────────────
//  Task follow-up timeline — one task, every follow-up, grouped by the day it
//  was filed and read start-to-end.
//
//  The daily register answers "what happened on the 3rd?". This answers the
//  other question: "how has this one task been followed up since it opened?"
//  Gaps between filing days are called out, because a task with no follow-up
//  for nine days is the thing a CBO most wants to notice.
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import type { TaskStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { ArrowDownUp, CalendarDays } from "lucide-react";
import { LinkifiedText } from "@/components/linkified-text";
import { AttachmentChip } from "@/components/attachment-chip";
import { classifyUpdate, dayKey, dayLabel, timeOfDay } from "@/lib/followups";

export type TimelineEntry = {
  id: string;
  createdAt: Date;
  note: string;
  newStatus: TaskStatus | null;
  authorName: string;
  files: { id: string; fileName: string; fileMime: string; fileSize: number }[];
};

/** Whole days between two day keys — used to surface follow-up gaps. */
function daysBetween(earlier: string, later: string): number {
  const a = Date.parse(`${earlier}T00:00:00Z`);
  const b = Date.parse(`${later}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

export function TaskTimeline({
  entries,
  order = "asc",
  toggleHref,
}: {
  /** All updates for one task, any order — grouped and sorted here. */
  entries: TimelineEntry[];
  /** "asc" reads start → end (default); "desc" puts the newest first. */
  order?: "asc" | "desc";
  /** Link that flips the order. Omitted = no toggle rendered. */
  toggleHref?: string;
}) {
  if (entries.length === 0) {
    return <div className="text-sm text-muted-foreground">No follow-ups filed yet.</div>;
  }

  const sorted = [...entries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Group into days, chronologically.
  const days = new Map<string, TimelineEntry[]>();
  for (const entry of sorted) {
    const key = dayKey(entry.createdAt);
    const bucket = days.get(key);
    if (bucket) bucket.push(entry);
    else days.set(key, [entry]);
  }

  const dayKeys = Array.from(days.keys());
  const firstDay = dayKeys[0];
  const lastDay = dayKeys[dayKeys.length - 1];
  const written = sorted.filter((e) => classifyUpdate(e.note) === "note").length;
  const span = daysBetween(firstDay, lastDay) + 1;

  // Gap sizes are always computed in chronological order, then the display order flips.
  const gapBefore = new Map<string, number>();
  for (let i = 1; i < dayKeys.length; i++) {
    const gap = daysBetween(dayKeys[i - 1], dayKeys[i]);
    if (gap > 1) gapBefore.set(dayKeys[i], gap);
  }
  const ordered = order === "desc" ? [...dayKeys].reverse() : dayKeys;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {dayLabel(firstDay)} → {dayLabel(lastDay)}
          </span>
          <span>{dayKeys.length} follow-up day{dayKeys.length === 1 ? "" : "s"} across {span} day{span === 1 ? "" : "s"}</span>
          <span>{written} written · {sorted.length} total</span>
        </div>
        {toggleHref ? (
          <Link
            href={toggleHref}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold hover:bg-accent transition-colors"
          >
            <ArrowDownUp className="h-3 w-3" />
            {order === "asc" ? "Oldest first" : "Newest first"}
          </Link>
        ) : null}
      </div>

      <ol className="relative space-y-4 border-l border-border pl-4">
        {ordered.map((key) => {
          const gap = gapBefore.get(key);
          const dayItems = days.get(key) ?? [];
          const items = order === "desc" ? [...dayItems].reverse() : dayItems;

          return (
            <li key={key} className="relative">
              {/* Gap marker belongs above the later day in chronological reading order. */}
              {gap && order === "asc" ? <GapMarker days={gap} /> : null}

              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
              <div className="flex flex-wrap items-baseline gap-2">
                <h4 className="text-xs font-bold">{dayLabel(key)}</h4>
                <span className="text-[10px] text-muted-foreground">
                  {dayItems.length} entr{dayItems.length === 1 ? "y" : "ies"}
                </span>
              </div>

              <div className="mt-1.5 space-y-2">
                {items.map((entry) => {
                  const kind = classifyUpdate(entry.note);
                  const isSystem = kind !== "note";
                  return (
                    <div
                      key={entry.id}
                      className={`rounded-lg border p-2.5 ${isSystem ? "border-dashed border-border bg-muted/20" : "border-border"}`}
                    >
                      <LinkifiedText
                        text={entry.note}
                        className={`whitespace-pre-line break-words ${isSystem ? "text-xs text-muted-foreground" : "text-sm"}`}
                      />
                      {entry.files.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {entry.files.map((f) => (
                            <AttachmentChip key={f.id} file={{ fileId: f.id, name: f.fileName, mime: f.fileMime, size: f.fileSize }} />
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{timeOfDay(entry.createdAt)}</span>
                        <span>· {entry.authorName}</span>
                        {isSystem ? <span className="opacity-70">· {kind === "edit" ? "field edit" : "status change"}</span> : null}
                        {entry.newStatus ? (
                          <Badge variant="info" className="text-[9px]">Status → {entry.newStatus.replace(/_/g, " ")}</Badge>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {gap && order === "desc" ? <GapMarker days={gap} /> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function GapMarker({ days }: { days: number }) {
  return (
    <div className="my-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
      ┈ {days - 1} day{days - 1 === 1 ? "" : "s"} with no follow-up ┈
    </div>
  );
}
