// ── Task Filter Bar (always expanded, GET form) ──
"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

type FilterRefData = {
  verticals: { id: string; code: string; name: string }[];
  subVerticals: { id: string; name: string; verticalCode: string }[];
  priorities: { id: string; code: string; label: string }[];
  teams: { id: string; name: string }[];
};

export function TaskFilterBar({
  active,
  options,
  basePath = "/cbo",
}: {
  active: Record<string, string | undefined>;
  options: FilterRefData;
  basePath?: string;
}) {
  const router = useRouter();

  function apply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    for (const [k, v] of form.entries()) {
      const val = String(v).trim();
      if (val) params.set(k, val);
    }
    router.push(`${basePath}?${params.toString()}`);
  }

  function clear() {
    router.push(basePath);
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Filters</span>
          {Object.values(active).some(Boolean) && (
            <Button variant="ghost" size="sm" onClick={clear}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>
        <form onSubmit={apply} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Input name="q" defaultValue={active.q || ""} placeholder="Search title…" />
          <Select name="vertical" defaultValue={active.vertical || ""}>
            <option value="">All verticals</option>
            {options.verticals.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </Select>
          <Select name="subVertical" defaultValue={active.subVertical || ""}>
            <option value="">All sub-verticals</option>
            {options.subVerticals.map((s) => (
              <option key={s.id} value={s.id}>{s.verticalCode}: {s.name}</option>
            ))}
          </Select>
          <Select name="priority" defaultValue={active.priority || ""}>
            <option value="">All priorities</option>
            {options.priorities.map((p) => (
              <option key={p.id} value={p.id}>{p.code}</option>
            ))}
          </Select>
          <Select name="team" defaultValue={active.team || ""}>
            <option value="">All teams</option>
            {options.teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
          <Select name="status" defaultValue={active.status || ""}>
            <option value="">All statuses</option>
            <option value="NOT_STARTED">Not started</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="WAITING_FOR_INPUT">Waiting input</option>
            <option value="WAITING_FOR_APPROVAL">Waiting approval</option>
            <option value="DELAYED">Delayed</option>
            <option value="COMPLETED">Completed</option>
            <option value="PARKED">Parked</option>
          </Select>

          {/* Date range filters */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-[11px] text-muted-foreground">Deadline From – To</Label>
            <div className="flex gap-2">
              <Input name="deadlineFrom" type="date" defaultValue={active.deadlineFrom || ""} className="text-xs" />
              <Input name="deadlineTo" type="date" defaultValue={active.deadlineTo || ""} className="text-xs" />
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-[11px] text-muted-foreground">Created From – To</Label>
            <div className="flex gap-2">
              <Input name="createdFrom" type="date" defaultValue={active.createdFrom || ""} className="text-xs" />
              <Input name="createdTo" type="date" defaultValue={active.createdTo || ""} className="text-xs" />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <Button type="submit" size="sm">Apply</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}