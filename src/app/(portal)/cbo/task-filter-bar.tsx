"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { X } from "lucide-react";
import { buildSearchParams, toList } from "./task-filter-utils";
import { STATUS_OPTIONS } from "@/components/status-badges";

export function TaskFilterBar({
  active,
  basePath,
  options,
}: {
  active: Record<string, string | string[] | undefined>;
  basePath: string;
  options: {
    verticals: { id: string; code: string; name: string }[];
    priorities: { id: string; code: string; label: string }[];
    teams: { id: string; name: string }[];
  };
}) {
  const router = useRouter();
  const [q, setQ] = useState(Array.isArray(active.q) ? active.q[0] || "" : active.q || "");

  const selectedVerticals = new Set(toList(active.vertical));
  const selectedPriorities = new Set(toList(active.priority));
  const selectedTeams = new Set(toList(active.team));
  const selectedStatuses = new Set(toList(active.status));

  const filterDims = [
    { key: "vertical", dim: "Vertical", values: toList(active.vertical).map((v) => ({ value: v, label: options.verticals.find((o) => o.id === v)?.name ?? v })) },
    { key: "priority", dim: "Priority", values: toList(active.priority).map((v) => ({ value: v, label: options.priorities.find((o) => o.id === v)?.code ?? v })) },
    { key: "team", dim: "Team", values: toList(active.team).map((v) => ({ value: v, label: options.teams.find((o) => o.id === v)?.name ?? v })) },
    { key: "status", dim: "Status", values: toList(active.status).map((v) => ({ value: v, label: STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v })) },
  ];
  const chips = filterDims.flatMap((d) => d.values.map((x) => ({ key: d.key, dim: d.dim, value: x.value, label: x.label })));

  function apply(params: Record<string, string | undefined>) {
    router.push(`${basePath}?${buildSearchParams({ ...active, ...params }).toString()}`);
  }

  function addFilter(key: string, value: string) {
    const next: Record<string, string | string[]> = {};
    for (const [k, v] of Object.entries(active)) {
      if (!v) continue;
      if (Array.isArray(v)) next[k] = [...v];
      else next[k] = v;
    }
    const existing = Array.isArray(next[key]) ? (next[key] as string[]) : next[key] ? [next[key] as string] : [];
    next[key] = [...existing, value];
    router.push(`${basePath}?${buildSearchParams(next).toString()}`);
  }

  function removeFilter(key: string, value: string) {
    const next: Record<string, string | string[]> = {};
    for (const [k, v] of Object.entries(active)) {
      if (!v) continue;
      if (Array.isArray(v)) {
        const filtered = v.filter((x) => !(k === key && x === value));
        if (filtered.length) next[k] = filtered;
      } else {
        if (!(k === key && v === value)) next[k] = v;
      }
    }
    router.push(`${basePath}?${buildSearchParams(next).toString()}`);
  }

  function clearAll() { router.push(basePath); }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Vertical</label>
          <Select value="" onChange={(e) => { const v = e.target.value; if (v) addFilter("vertical", v); }} className="h-8 text-xs w-44">
            <option value="" disabled>{selectedVerticals.size > 0 ? "Add another…" : "Add Vertical…"}</option>
            {options.verticals.filter((v) => !selectedVerticals.has(v.id)).map((v) => <option key={v.id} value={v.id}>{v.code}: {v.name}</option>)}
            {options.verticals.length > 0 && selectedVerticals.size === options.verticals.length ? <option value="" disabled>All added</option> : null}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Priority</label>
          <Select value="" onChange={(e) => { const v = e.target.value; if (v) addFilter("priority", v); }} className="h-8 text-xs w-44">
            <option value="" disabled>{selectedPriorities.size > 0 ? "Add another…" : "Add Priority…"}</option>
            {options.priorities.filter((p) => !selectedPriorities.has(p.id)).map((p) => <option key={p.id} value={p.id}>{p.code}: {p.label}</option>)}
            {options.priorities.length > 0 && selectedPriorities.size === options.priorities.length ? <option value="" disabled>All added</option> : null}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Team</label>
          <Select value="" onChange={(e) => { const v = e.target.value; if (v) addFilter("team", v); }} className="h-8 text-xs w-44">
            <option value="" disabled>{selectedTeams.size > 0 ? "Add another…" : "Add Team…"}</option>
            {options.teams.filter((t) => !selectedTeams.has(t.id)).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            {options.teams.length > 0 && selectedTeams.size === options.teams.length ? <option value="" disabled>All added</option> : null}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Status</label>
          <Select value="" onChange={(e) => { const v = e.target.value; if (v) addFilter("status", v); }} className="h-8 text-xs w-44">
            <option value="" disabled>{selectedStatuses.size > 0 ? "Add another…" : "Add Status…"}</option>
            {STATUS_OPTIONS.filter((s) => !selectedStatuses.has(s.value)).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            {selectedStatuses.size === STATUS_OPTIONS.length ? <option value="" disabled>All added</option> : null}
          </Select>
        </div>
        <div className="space-y-1 flex-1 min-w-[150px]">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Search</label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && apply({ q: q || undefined })} placeholder="Search title..." className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Deadline From</label>
          <Input type="date" value={active.deadlineFrom || ""} onChange={(e) => apply({ deadlineFrom: e.target.value || undefined })} className="h-8 text-xs w-36" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Deadline To</label>
          <Input type="date" value={active.deadlineTo || ""} onChange={(e) => apply({ deadlineTo: e.target.value || undefined })} className="h-8 text-xs w-36" />
        </div>
        <Button variant="outline" size="sm" onClick={clearAll} className="h-8 text-xs">Clear</Button>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border/70 bg-muted/20 px-2 py-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Filters</span>
          {chips.map((c) => (
            <span key={`${c.key}:${c.value}`} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">{c.dim}</span>
              <span className="font-medium">{c.label}</span>
              <button
                type="button"
                onClick={() => removeFilter(c.key, c.value)}
                className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Remove ${c.dim} ${c.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
