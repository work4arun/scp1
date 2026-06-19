"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, X, Mail, Send } from "lucide-react";
import { STATUS_OPTIONS } from "@/components/status-badges";
import { addUpdateAction } from "./actions";
import { triggerEmailAction } from "./trigger-email-action";
import type { TaskStatus } from "@prisma/client";

type Team = { id: string; name: string; members: { id: string; name: string; email: string; designation: string | null }[] };

export function TaskUpdateForm({
  taskId,
  currentStatus,
  teams,
  assignedTeamIds,
  assignedMemberIds,
}: {
  taskId: string;
  currentStatus: TaskStatus;
  teams: Team[];
  assignedTeamIds: string[];
  assignedMemberIds: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // ── Email trigger state ───────────────────────────────────────────────
  const [emailMode, setEmailMode] = useState(false);
  const [emailNote, setEmailNote] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);

  // Existing assignment toggles
  const [teamFlags, setTeamFlags] = useState<Map<string, boolean>>(new Map(assignedTeamIds.map((id) => [id, true])));
  const [memberFlags, setMemberFlags] = useState<Map<string, boolean>>(new Map(assignedMemberIds.map((id) => [id, true])));

  // CC/BCC for email trigger
  const [ccTeamIds, setCcTeamIds] = useState<Set<string>>(new Set());
  const [ccMemberIds, setCcMemberIds] = useState<Set<string>>(new Set());
  const [bccTeamIds, setBccTeamIds] = useState<Set<string>>(new Set());
  const [bccMemberIds, setBccMemberIds] = useState<Set<string>>(new Set());

  const [ccTeamSearch, setCcTeamSearch] = useState(""); const [ccTeamOpen, setCcTeamOpen] = useState(false);
  const [ccMemberSearch, setCcMemberSearch] = useState(""); const [ccMemberOpen, setCcMemberOpen] = useState(false);
  const [bccTeamSearch, setBccTeamSearch] = useState(""); const [bccTeamOpen, setBccTeamOpen] = useState(false);
  const [bccMemberSearch, setBccMemberSearch] = useState(""); const [bccMemberOpen, setBccMemberOpen] = useState(false);

  const allMembers = useMemo(() => teams.flatMap((t) => t.members.map((m) => ({ ...m, teamName: t.name }))), [teams]);

  const showDelayReason = selectedStatus === "DELAYED" || (selectedStatus === "" && currentStatus === "DELAYED");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const note = String(form.get("note") || "").trim();
    const status = String(form.get("status") || "").trim();
    if (!note && !status) { setError("Please add a note or pick a new status."); return; }
    setError(null);
    startTransition(async () => {
      const result = await addUpdateAction(taskId, form);
      if (!result.success) { setError(result.error); return; }
      formEl.reset(); setSelectedStatus(""); router.refresh();
    });
  }

  async function handleTriggerEmail(e: React.MouseEvent) {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(false);
    const toTeamIds = assignedTeamIds.filter((id) => teamFlags.get(id) !== false);
    const toMemberIds = assignedMemberIds.filter((id) => memberFlags.get(id) !== false);
    const ccTIds = Array.from(ccTeamIds);
    const ccMIds = Array.from(ccMemberIds);
    const bccTIds = Array.from(bccTeamIds);
    const bccMIds = Array.from(bccMemberIds);

    if (toTeamIds.length === 0 && toMemberIds.length === 0) {
      setEmailError("Select at least one team or member to send email.");
      return;
    }

    startTransition(async () => {
      const result = await triggerEmailAction({
        taskId,
        note: emailNote,
        toTeamIds, toMemberIds,
        ccTeamIds: ccTIds, ccMemberIds: ccMIds,
        bccTeamIds: bccTIds, bccMemberIds: bccMIds,
      });
      if (!result.success) { setEmailError(result.error); return; }
      setEmailSuccess(true);
      setEmailNote("");
      setCcTeamIds(new Set()); setCcMemberIds(new Set());
      setBccTeamIds(new Set()); setBccMemberIds(new Set());
      setTimeout(() => setEmailSuccess(false), 3000);
      router.refresh();
    });
  }

  const filterTeams = (q: string) => q ? teams.filter((t) => t.name.toLowerCase().includes(q.toLowerCase())) : teams;
  const filterMembers = (q: string) => q ? allMembers.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()) || m.email.toLowerCase().includes(q.toLowerCase()) || m.teamName.toLowerCase().includes(q.toLowerCase())) : allMembers;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <div className="rounded-md bg-destructive/10 text-destructive px-3 py-2 text-sm font-medium">{error}</div> : null}

      <div className="space-y-1.5">
        <Label htmlFor="note">What's the update? <span className="text-xs font-normal text-muted-foreground">(optional when changing status)</span></Label>
        <Textarea id="note" name="note" placeholder="Action taken, who responded, what's blocking…" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="status">New status (optional)</Label>
          <Select id="status" name="status" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option value="">— No change —</option>
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value} disabled={s.value === currentStatus}>{s.label}</option>)}
          </Select>
        </div>
        <div className="flex items-end"><Button type="submit" className="w-full" disabled={pending}>{pending ? "Saving…" : "Add update"}</Button></div>
      </div>

      {showDelayReason && (
        <div className="space-y-1.5 rounded-lg border border-warning/40 bg-warning/5 p-3">
          <Label htmlFor="delayReason" className="text-warning">Delay reason <span className="text-xs font-normal text-muted-foreground">(required when delayed)</span></Label>
          <Textarea id="delayReason" name="delayReason" placeholder="Explain the cause of delay — resource constraint, dependency, approval pending…" className="border-warning/40 focus:border-warning" />
        </div>
      )}

      {/* ── Email Trigger Section ──────────────────────────────────────── */}
      <div className="rounded-lg border border-border p-4 space-y-3">
        <button type="button" onClick={() => setEmailMode(!emailMode)} className="flex items-center gap-2 text-sm font-semibold hover:text-primary transition-colors">
          <Send className="h-4 w-4" />
          {emailMode ? "▼ Hide email trigger" : "▶ Trigger email notification"}
        </button>

        {emailMode && (
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Email message (optional)</Label>
              <Textarea value={emailNote} onChange={(e) => setEmailNote(e.target.value)} placeholder="Additional message to include in the notification…" className="min-h-[60px] mt-1" />
            </div>

            {/* Assigned Teams toggle */}
            {assignedTeamIds.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Assigned Teams</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {assignedTeamIds.map((tid) => {
                    const t = teams.find((t) => t.id === tid);
                    if (!t) return null;
                    const send = teamFlags.get(tid) ?? true;
                    return <button key={tid} type="button" onClick={() => setTeamFlags((prev) => new Map(prev).set(tid, !send))} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${send ? "border-primary bg-primary/10 text-primary" : "border-muted bg-muted text-muted-foreground"}`}>{t.name} ({t.members.length}){send ? <Mail className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}</button>;
                  })}
                </div>
              </div>
            )}

            {/* Assigned Members toggle */}
            {assignedMemberIds.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Assigned Members</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {assignedMemberIds.map((mid) => {
                    const m = allMembers.find((m) => m.id === mid);
                    if (!m) return null;
                    const send = memberFlags.get(mid) ?? true;
                    return <button key={mid} type="button" onClick={() => setMemberFlags((prev) => new Map(prev).set(mid, !send))} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${send ? "border-primary bg-primary/10 text-primary" : "border-muted bg-muted text-muted-foreground"}`}>{m.name}{send ? <Mail className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}</button>;
                  })}
                </div>
              </div>
            )}

            {/* CC */}
            <div>
              <Label className="text-xs text-muted-foreground">CC</Label>
              <SearchableChip
                placeholder="Search CC teams…" search={ccTeamSearch} setSearch={setCcTeamSearch} open={ccTeamOpen} setOpen={setCcTeamOpen}
                items={filterTeams(ccTeamSearch).map((t) => ({ id: t.id, label: `${t.name} (${t.members.length})` }))}
                onSelect={(id) => setCcTeamIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
              />
              <ChipsSimple items={teams.filter((t) => ccTeamIds.has(t.id)).map((t) => ({ id: t.id, label: `${t.name} (${t.members.length})` }))} onRemove={(id) => setCcTeamIds((prev) => { const n = new Set(prev); n.delete(id); return n; })} />
              <SearchableChip
                placeholder="Search CC members…" search={ccMemberSearch} setSearch={setCcMemberSearch} open={ccMemberOpen} setOpen={setCcMemberOpen}
                items={filterMembers(ccMemberSearch).map((m) => ({ id: m.id, label: `${m.name}${m.designation ? ` (${m.designation})` : ""}`, sub: m.teamName }))}
                onSelect={(id) => setCcMemberIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
              />
              <ChipsSimple items={allMembers.filter((m) => ccMemberIds.has(m.id)).map((m) => ({ id: m.id, label: m.name, sub: m.teamName }))} onRemove={(id) => setCcMemberIds((prev) => { const n = new Set(prev); n.delete(id); return n; })} />
            </div>

            {/* BCC */}
            <div>
              <Label className="text-xs text-muted-foreground">BCC</Label>
              <SearchableChip
                placeholder="Search BCC teams…" search={bccTeamSearch} setSearch={setBccTeamSearch} open={bccTeamOpen} setOpen={setBccTeamOpen}
                items={filterTeams(bccTeamSearch).map((t) => ({ id: t.id, label: `${t.name} (${t.members.length})` }))}
                onSelect={(id) => setBccTeamIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
              />
              <ChipsSimple items={teams.filter((t) => bccTeamIds.has(t.id)).map((t) => ({ id: t.id, label: `${t.name} (${t.members.length})` }))} onRemove={(id) => setBccTeamIds((prev) => { const n = new Set(prev); n.delete(id); return n; })} />
              <SearchableChip
                placeholder="Search BCC members…" search={bccMemberSearch} setSearch={setBccMemberSearch} open={bccMemberOpen} setOpen={setBccMemberOpen}
                items={filterMembers(bccMemberSearch).map((m) => ({ id: m.id, label: `${m.name}${m.designation ? ` (${m.designation})` : ""}`, sub: m.teamName }))}
                onSelect={(id) => setBccMemberIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
              />
              <ChipsSimple items={allMembers.filter((m) => bccMemberIds.has(m.id)).map((m) => ({ id: m.id, label: m.name, sub: m.teamName }))} onRemove={(id) => setBccMemberIds((prev) => { const n = new Set(prev); n.delete(id); return n; })} />
            </div>

            {emailError && <div className="text-xs text-destructive">{emailError}</div>}
            {emailSuccess && <div className="text-xs text-green-600 dark:text-green-400">✓ Email sent successfully!</div>}
            <Button type="button" variant="secondary" onClick={handleTriggerEmail} disabled={pending} className="w-full">
              <Send className="h-3.5 w-3.5 mr-1" />
              {pending ? "Sending…" : "Send email notification"}
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}

// ── Mini searchable chip components ──────────────────────────────────────

function SearchableChip({ placeholder, search, setSearch, open, setOpen, items, onSelect }: {
  placeholder: string; search: string; setSearch: (v: string) => void; open: boolean; setOpen: (v: boolean) => void;
  items: { id: string; label: string; sub?: string }[]; onSelect: (id: string) => void;
}) {
  return <div className="relative mt-1">
    <Input value={search} onChange={(e) => { setSearch(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)} placeholder={placeholder} className="h-8 text-xs" />
    {open && (search || items.length > 0) && (
      <div className="absolute z-10 mt-1 w-full max-h-36 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
        {items.map((item) => <button key={item.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onSelect(item.id)} className="w-full px-3 py-2 text-left text-xs hover:bg-accent flex items-center justify-between"><span>{item.label}</span>{item.sub && <span className="text-[10px] text-muted-foreground">{item.sub}</span>}</button>)}
      </div>
    )}
  </div>;
}

function ChipsSimple({ items, onRemove }: { items: { id: string; label: string; sub?: string }[]; onRemove: (id: string) => void }) {
  if (items.length === 0) return null;
  return <div className="flex flex-wrap gap-1 mt-1">
    {items.map((item) => <div key={item.id} className="inline-flex items-center gap-1 rounded-md border border-primary bg-primary/10 px-2 py-1 text-xs text-primary font-medium"><span>{item.label}{item.sub ? <span className="text-[10px] opacity-50 ml-0.5">{item.sub}</span> : null}</span><button type="button" onClick={() => onRemove(item.id)} className="ml-0.5 rounded p-0.5 hover:bg-primary/20"><X className="h-3 w-3" /></button></div>)}
  </div>;
}