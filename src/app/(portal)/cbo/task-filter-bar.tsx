// ─────────────────────────────────────────────────────────────────────────────
//  Task Filter Bar (server-rendered)
// ─────────────────────────────────────────────────────────────────────────────
//  GET form that drives the Full Task Register on /cbo. Every filter is a
//  query-string param; pressing "Apply" navigates with the new params and the
//  page re-renders with the filtered set. Works without any client JS.
//
//  Filters supported:
//    q             — free text (matches title, description, code)
//    vertical      — vertical CODE (MKT, RTC, …)
//    subVertical   — sub-vertical id
//    priority      — priority CODE (P1–P4)
//    status        — TaskStatus enum
//    ownerRole     — OwnerRole id        (the operational role label)
//    ownerUser     — User id             (the enrolled user we keep on file)
//    source        — TaskSource enum
//    intervention  — InterventionFlag enum
//    deadline      — "overdue" | "today" | "this_week" | "no_deadline"
//    dateType      — "assigned" | "deadline_exact"  (exact-day filter)
//    dateValue     — YYYY-MM-DD
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X, RotateCcw } from "lucide-react";
import type { TaskFilterParams } from "./task-filter-utils";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "WAITING_FOR_INPUT", label: "Waiting Input" },
  { value: "WAITING_FOR_APPROVAL", label: "Waiting Approval" },
  { value: "DELAYED", label: "Delayed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PARKED", label: "Parked" },
];

const SOURCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "BOSS_INSTRUCTION", label: "Boss Instruction" },
  { value: "WHATSAPP_GROUP", label: "WhatsApp Group" },
  { value: "MANAGEMENT_MEETING", label: "Management Meeting" },
  { value: "DEPARTMENT_MEETING", label: "Department Meeting" },
  { value: "MARKETING_REVIEW", label: "Marketing Review" },
  { value: "MRM", label: "MRM" },
  { value: "PLACEMENT_REVIEW", label: "Placement Review" },
  { value: "RTC_REVIEW", label: "RTC Review" },
  { value: "DIGITAL_REVIEW", label: "Digital Review" },
  { value: "SELF_STRATEGY", label: "Self Strategy" },
  { value: "NEW_IDEA", label: "New Idea" },
];

const INTERVENTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "NO", label: "No" },
  { value: "YES", label: "Yes" },
  { value: "ONLY_IF_DELAYED", label: "Only if delayed" },
];

const DEADLINE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "overdue",     label: "Overdue" },
  { value: "today",       label: "Due today" },
  { value: "this_week",   label: "Due this week" },
  { value: "no_deadline", label: "No deadline set" },
];

export type FilterRefData = {
  verticals: Array<{ id: string; code: string; name: string }>;
  subVerticals: Array<{ id: string; name: string; verticalCode: string }>;
  priorities: Array<{ id: string; code: string; label: string }>;
  ownerRoles: Array<{ id: string; name: string }>;
  ownerUsers: Array<{ id: string; name: string; email: string }>;
};

export function TaskFilterBar({
  active,
  options: data,
  baseHref = "/cbo",
}: {
  active: TaskFilterParams;
  options: FilterRefData;
  baseHref?: string;
}) {
  const pills = activePills(active, data);
  const hasAny = pills.length > 0;

  return (
    <Card className="reveal" style={{ animationDelay: "200ms" }}>
      <CardContent className="p-4">
        <form method="get" action={baseHref} className="space-y-3">
          {/* Hash anchor so Apply scrolls back to the table */}
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4 text-primary" />
            Filter the Full Task Register
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {hasAny ? `${pills.length} filter${pills.length === 1 ? "" : "s"} active` : "No filters applied"}
            </span>
          </div>

          {/* Row 1 — search spans full width on small screens */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div className="space-y-1 sm:col-span-3 lg:col-span-2">
              <Label htmlFor="f-q" className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Search
              </Label>
              <Input
                id="f-q"
                name="q"
                placeholder="Title, code (MKT-001), or description…"
                defaultValue={active.q ?? ""}
              />
            </div>

            <SelectField id="f-vertical" name="vertical" label="Vertical" value={active.vertical}>
              <option value="">All verticals</option>
              {data.verticals.map((v) => (
                <option key={v.id} value={v.code}>
                  {v.code} — {v.name}
                </option>
              ))}
            </SelectField>

            <SelectField id="f-subvertical" name="subVertical" label="Sub-Vertical" value={active.subVertical}>
              <option value="">All sub-verticals</option>
              {data.subVerticals.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.verticalCode} · {s.name}
                </option>
              ))}
            </SelectField>

            <SelectField id="f-priority" name="priority" label="Priority" value={active.priority}>
              <option value="">All priorities</option>
              {data.priorities.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.code} — {p.label}
                </option>
              ))}
            </SelectField>
          </div>

          {/* Row 2 — Status / Owner Role / Owner User */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <SelectField id="f-status" name="status" label="Status" value={active.status}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </SelectField>

            <SelectField id="f-ownerrole" name="ownerRole" label="Owner Role" value={active.ownerRole}>
              <option value="">All owner roles</option>
              {data.ownerRoles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </SelectField>

            <SelectField id="f-owneruser" name="ownerUser" label="Owner (registered user)" value={active.ownerUser}>
              <option value="">All users</option>
              <option value="__unassigned__">— Unassigned —</option>
              {data.ownerUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </SelectField>

            <SelectField id="f-source" name="source" label="Source" value={active.source}>
              <option value="">All sources</option>
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </SelectField>

            <SelectField id="f-intervention" name="intervention" label="Intervention" value={active.intervention}>
              <option value="">Any</option>
              {INTERVENTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </SelectField>
          </div>

          {/* Row 3 — Deadline state */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <SelectField id="f-deadline" name="deadline" label="Deadline" value={active.deadline}>
              <option value="">Any deadline</option>
              {DEADLINE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </SelectField>
          </div>

          {/* Row 4 — Exact date filter (Assigned Date / Deadline Date + date picker) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5 items-end rounded-lg border border-dashed border-border bg-muted/30 p-3">
            <div className="sm:col-span-1">
              <Label htmlFor="f-datetype" className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Filter by date
              </Label>
              <Select id="f-datetype" name="dateType" defaultValue={active.dateType ?? ""}>
                <option value="">— Select type —</option>
                <option value="assigned">Assigned Date</option>
                <option value="deadline_exact">Deadline Date</option>
              </Select>
            </div>
            <div className="sm:col-span-1">
              <Label htmlFor="f-datevalue" className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Pick a date
              </Label>
              <Input
                id="f-datevalue"
                name="dateValue"
                type="date"
                defaultValue={active.dateValue ?? ""}
              />
            </div>
            <div className="sm:col-span-1 text-xs text-muted-foreground self-end pb-1">
              {active.dateType && active.dateValue
                ? `Showing tasks where ${active.dateType === "assigned" ? "assigned on" : "deadline is"} ${active.dateValue}`
                : "Select a type and date, then click Apply filters"}
            </div>
          </div>

          {/* Active pills + actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="flex flex-wrap gap-1.5 flex-1">
              {pills.map((p) => (
                <Link
                  key={p.key}
                  href={p.removeHref(baseHref, active)}
                  className="group inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors"
                  aria-label={`Remove ${p.label}`}
                >
                  <span className="text-muted-foreground font-medium">{p.dim}:</span>
                  {p.label}
                  <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                </Link>
              ))}
            </div>
            <div className="flex gap-2 shrink-0">
              {hasAny && (
                <Button asChild variant="outline" size="sm">
                  <Link href={baseHref}>
                    <RotateCcw className="h-4 w-4" /> Reset
                  </Link>
                </Button>
              )}
              <Button type="submit" size="sm">Apply filters</Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SelectField({
  id,
  name,
  label,
  value,
  children,
}: {
  id: string;
  name: string;
  label: string;
  value: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Select id={id} name={name} defaultValue={value ?? ""}>
        {children}
      </Select>
    </div>
  );
}

// ────────── Active filter pill descriptors ──────────
//
// Each pill renders a "Dim: value ✕" chip. Clicking the chip removes only
// that single filter dimension (preserves all the other active params).

type Pill = {
  key: string;
  dim: string;
  label: string;
  removeHref: (base: string, active: TaskFilterParams) => string;
};

function activePills(active: TaskFilterParams, data: FilterRefData): Pill[] {
  const out: Pill[] = [];

  const without = (drop: keyof TaskFilterParams) => (base: string, a: TaskFilterParams) => {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(a)) {
      if (k === drop || !v) continue;
      usp.set(k, String(v));
    }
    const qs = usp.toString();
    return qs ? `${base}?${qs}` : base;
  };

  if (active.q) out.push({ key: "q", dim: "Search", label: active.q, removeHref: without("q") });
  if (active.vertical) {
    const v = data.verticals.find((x) => x.code === active.vertical);
    out.push({ key: "vertical", dim: "Vertical", label: v ? v.name : active.vertical, removeHref: without("vertical") });
  }
  if (active.subVertical) {
    const s = data.subVerticals.find((x) => x.id === active.subVertical);
    out.push({ key: "subVertical", dim: "Sub-Vertical", label: s ? s.name : "—", removeHref: without("subVertical") });
  }
  if (active.priority) out.push({ key: "priority", dim: "Priority", label: active.priority, removeHref: without("priority") });
  if (active.status) {
    const so = STATUS_OPTIONS.find((x) => x.value === active.status);
    out.push({ key: "status", dim: "Status", label: so ? so.label : active.status, removeHref: without("status") });
  }
  if (active.ownerRole) {
    const r = data.ownerRoles.find((x) => x.id === active.ownerRole);
    out.push({ key: "ownerRole", dim: "Owner Role", label: r ? r.name : "—", removeHref: without("ownerRole") });
  }
  if (active.ownerUser) {
    if (active.ownerUser === "__unassigned__") {
      out.push({ key: "ownerUser", dim: "Owner", label: "Unassigned", removeHref: without("ownerUser") });
    } else {
      const u = data.ownerUsers.find((x) => x.id === active.ownerUser);
      out.push({ key: "ownerUser", dim: "Owner", label: u ? u.name : "—", removeHref: without("ownerUser") });
    }
  }
  if (active.source) {
    const so = SOURCE_OPTIONS.find((x) => x.value === active.source);
    out.push({ key: "source", dim: "Source", label: so ? so.label : active.source, removeHref: without("source") });
  }
  if (active.intervention) {
    const io = INTERVENTION_OPTIONS.find((x) => x.value === active.intervention);
    out.push({ key: "intervention", dim: "Intervention", label: io ? io.label : active.intervention, removeHref: without("intervention") });
  }
  if (active.deadline) {
    const do_ = DEADLINE_OPTIONS.find((x) => x.value === active.deadline);
    out.push({ key: "deadline", dim: "Deadline", label: do_ ? do_.label : active.deadline, removeHref: without("deadline") });
  }
  if (active.dateType && active.dateValue) {
    const typeLabel = active.dateType === "assigned" ? "Assigned Date" : "Deadline Date";
    out.push({
      key: "dateFilter",
      dim: typeLabel,
      label: active.dateValue,
      removeHref: (base, a) => {
        const usp = new URLSearchParams();
        for (const [k, v] of Object.entries(a)) {
          if (k === "dateType" || k === "dateValue" || !v) continue;
          usp.set(k, String(v));
        }
        const qs = usp.toString();
        return qs ? `${base}?${qs}` : base;
      },
    });
  }
  return out;
}
