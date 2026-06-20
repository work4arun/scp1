"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, X, Mail, Save, Send } from "lucide-react";
import { updateTaskAction } from "./actions";
import type { TaskSource, InterventionFlag, TaskStatus } from "@prisma/client";

type Vertical  = { id: string; code: string; name: string };
type Priority  = { id: string; code: string; label: string };
type Team = { id: string; name: string; members: { id: string; name: string; email: string; designation: string | null }[] };

export function EditTaskForm({
  task,
  verticals,
  priorities,
  teams,
}: {
  task: { id: string; code: string; title: string; verticalId: string; priorityId: string; deadline: string; frequency: string; source: TaskSource; expectedOutput: string; supportNeeded: string; delayReason: string; nextAction: string; intervention: InterventionFlag; status: TaskStatus; teamIds: string[]; memberIds: string[] };
  verticals: Vertical[];
  priorities: Priority[];
  teams: Team[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [verticalId, setVerticalId] = useState(task.verticalId);

  // ── Assignment (To) ───────────────────────────────────────────────────
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set(task.teamIds));
  const [teamEmailFlags, setTeamEmailFlags] = useState<Map<string, boolean>>(() => {
    const m = new Map<string, boolean>();
    for (const tid of task.teamIds) m.set(tid, true);
    return m;
  });
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set(task.memberIds));
  const [memberEmailFlags, setMemberEmailFlags] = useState<Map<string, boolean>>(() => {
    const m = new Map<string, boolean>();
    for (const mid of task.memberIds) m.set(mid, true);
    return m;
  });

  // ── CC ─────────────────────────────────────────────────────────────────
  const [ccTeamIds, setCcTeamIds] = useState<Set<string>>(new Set());
  const [ccMemberIds, setCcMemberIds] = useState<Set<string>>(new Set());

  // ── BCC ────────────────────────────────────────────────────────────────
  const [bccTeamIds, setBccTeamIds] = useState<Set<string>>(new Set());
  const [bccMemberIds, setBccMemberIds] = useState<Set<string>>(new Set());

  // ── Extra message ──────────────────────────────────────────────────────
  const [extraMessage, setExtraMessage] = useState("");

  // ── Search state ───────────────────────────────────────────────────────
  const [teamSearch, setTeamSearch] = useState(""); const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState(""); const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [ccTeamSearch, setCcTeamSearch] = useState(""); const [ccTeamOpen, setCcTeamOpen] = useState(false);
  const [ccMemberSearch, setCcMemberSearch] = useState(""); const [ccMemberOpen, setCcMemberOpen] = useState(false);
  const [bccTeamSearch, setBccTeamSearch] = useState(""); const [bccTeamOpen, setBccTeamOpen] = useState(false);
  const [bccMemberSearch, setBccMemberSearch] = useState(""); const [bccMemberOpen, setBccMemberOpen] = useState(false);

  const allMembers = useMemo(() => teams.flatMap((t) => t.members.map((m) => ({ ...m, teamName: t.name }))), [teams]);

  const filterTeams = (q: string) => q ? teams.filter((t) => t.name.toLowerCase().includes(q.toLowerCase())) : teams;
  const filterMembers = (q: string) => q ? allMembers.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()) || m.email.toLowerCase().includes(q.toLowerCase()) || m.teamName.toLowerCase().includes(q.toLowerCase())) : allMembers;

  // ── To helpers ─────────────────────────────────────────────────────────
  const selectTeam = (id: string) => { setSelectedTeamIds((prev) => new Set(prev).add(id)); setTeamEmailFlags((prev) => new Map(prev).set(id, true)); setTeamSearch(""); setTeamDropdownOpen(false); };
  const removeTeam = (id: string) => { setSelectedTeamIds((prev) => { const n = new Set(prev); n.delete(id); return n; }); setTeamEmailFlags((prev) => { const m = new Map(prev); m.delete(id); return m; }); };
  const toggleTeamEmail = (id: string) => setTeamEmailFlags((prev) => new Map(prev).set(id, !(prev.get(id) ?? true)));
  const selectMember = (id: string) => { setSelectedMemberIds((prev) => new Set(prev).add(id)); setMemberEmailFlags((prev) => new Map(prev).set(id, true)); setMemberSearch(""); setMemberDropdownOpen(false); };
  const removeMember = (id: string) => { setSelectedMemberIds((prev) => { const n = new Set(prev); n.delete(id); return n; }); setMemberEmailFlags((prev) => { const m = new Map(prev); m.delete(id); return m; }); };
  const toggleMemberEmail = (id: string) => setMemberEmailFlags((prev) => new Map(prev).set(id, !(prev.get(id) ?? true)));

  // ── CC/BCC toggle ──────────────────────────────────────────────────────
  const toggleSetItem = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setter((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  function onSubmit(e: React.FormEvent<HTMLFormElement>, sendEmail: boolean) {
    e.preventDefault(); setError(null);
    const form = new FormData(e.currentTarget);
    form.set("teamIds", Array.from(selectedTeamIds).join(","));
    for (const tid of selectedTeamIds) form.set(`teamsend_${tid}`, String(teamEmailFlags.get(tid) ?? true));
    form.set("memberIds", Array.from(selectedMemberIds).join(","));
    for (const mid of selectedMemberIds) form.set(`membersend_${mid}`, String(memberEmailFlags.get(mid) ?? true));
    form.set("ccTeamIds", Array.from(ccTeamIds).join(","));
    form.set("ccMemberIds", Array.from(ccMemberIds).join(","));
    form.set("bccTeamIds", Array.from(bccTeamIds).join(","));
    form.set("bccMemberIds", Array.from(bccMemberIds).join(","));
    form.set("extraMessage", extraMessage);
    form.set("sendEmail", sendEmail ? "true" : "false");
    startTransition(async () => {
      try {
        const result = await updateTaskAction(task.id, form);
        if (!result.success) { setError(result.error); return; }
        router.push(result.redirectTo || `/sm/tasks/${task.id}`);
      } catch (err) { setError((err as Error)?.message || "Could not reach the server."); }
    });
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
      {error && <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span></div>}

      <Field label="Vertical" htmlFor="verticalId"><Select id="verticalId" name="verticalId" required value={verticalId} onChange={(e) => setVerticalId(e.target.value)}>{verticals.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select></Field>
      <Field label="Task title" htmlFor="title"><Input id="title" name="title" required defaultValue={task.title} /></Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Priority" htmlFor="priorityId"><Select id="priorityId" name="priorityId" required defaultValue={task.priorityId}>{priorities.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.label}</option>)}</Select></Field>
        <Field label="Source" htmlFor="source"><Select id="source" name="source" defaultValue={task.source}><option value="SELF_STRATEGY">Self Strategy</option><option value="BOSS_INSTRUCTION">Boss Instruction</option><option value="WHATSAPP_GROUP">WhatsApp Group</option><option value="MANAGEMENT_MEETING">Management Meeting</option><option value="DEPARTMENT_MEETING">Department Meeting</option><option value="MARKETING_REVIEW">Marketing Review</option><option value="MRM">MRM</option><option value="PLACEMENT_REVIEW">Placement Review</option><option value="RTC_REVIEW">RTC Review</option><option value="DIGITAL_REVIEW">Digital Review</option><option value="NEW_IDEA">New Idea</option></Select></Field>
      </div>

      {/* ── Extra message ── */}
      <Field label="Email message (optional)" htmlFor="extraMessage">
        <Textarea id="extraMessage" name="extraMessage" value={extraMessage} onChange={(e) => setExtraMessage(e.target.value)} placeholder="Additional instructions for the email notification…" className="min-h-[80px]" />
      </Field>

      {/* ── Assignment (To) ── */}
      <Section label="Assignment (To)">
        <SearchableSelect
          placeholder="Search teams…"
          search={teamSearch} setSearch={setTeamSearch} open={teamDropdownOpen} setOpen={setTeamDropdownOpen}
          items={filterTeams(teamSearch).map((t) => ({ id: t.id, label: `${t.name} (${t.members.length} members)` }))}
          onSelect={(id: string) => selectTeam(id)}
        />
        <SelectedChips teams={teams} ids={selectedTeamIds} allMembers={allMembers} memberIds={selectedMemberIds}
          teamEmailFlags={teamEmailFlags} memberEmailFlags={memberEmailFlags}
          onToggleTeam={toggleTeamEmail} onRemoveTeam={(id: string) => removeTeam(id)}
          onToggleMember={toggleMemberEmail} onRemoveMember={(id: string) => removeMember(id)}
        />
        <SearchableSelect
          placeholder="Search individual members…"
          search={memberSearch} setSearch={setMemberSearch} open={memberDropdownOpen} setOpen={setMemberDropdownOpen}
          items={filterMembers(memberSearch).map((m) => ({ id: m.id, label: `${m.name}${m.designation ? ` (${m.designation})` : ""}`, sub: m.teamName }))}
          onSelect={(id: string) => selectMember(id)}
        />
      </Section>

      {/* ── CC ── */}
      <Section label="CC">
        <SearchableSelect
          placeholder="Search CC teams…"
          search={ccTeamSearch} setSearch={setCcTeamSearch} open={ccTeamOpen} setOpen={setCcTeamOpen}
          items={filterTeams(ccTeamSearch).map((t) => ({ id: t.id, label: `${t.name} (${t.members.length} members)` }))}
          onSelect={(id: string) => toggleSetItem(setCcTeamIds, id)}
        />
        <CcBccChips teams={teams} ids={ccTeamIds} allMembers={allMembers} memberIds={ccMemberIds}
          onRemoveTeam={(id: string) => toggleSetItem(setCcTeamIds, id)}
          onRemoveMember={(id: string) => toggleSetItem(setCcMemberIds, id)}
        />
        <SearchableSelect
          placeholder="Search CC members…"
          search={ccMemberSearch} setSearch={setCcMemberSearch} open={ccMemberOpen} setOpen={setCcMemberOpen}
          items={filterMembers(ccMemberSearch).map((m) => ({ id: m.id, label: `${m.name}${m.designation ? ` (${m.designation})` : ""}`, sub: m.teamName }))}
          onSelect={(id: string) => toggleSetItem(setCcMemberIds, id)}
        />
      </Section>

      {/* ── BCC ── */}
      <Section label="BCC">
        <SearchableSelect
          placeholder="Search BCC teams…"
          search={bccTeamSearch} setSearch={setBccTeamSearch} open={bccTeamOpen} setOpen={setBccTeamOpen}
          items={filterTeams(bccTeamSearch).map((t) => ({ id: t.id, label: `${t.name} (${t.members.length} members)` }))}
          onSelect={(id: string) => toggleSetItem(setBccTeamIds, id)}
        />
        <CcBccChips teams={teams} ids={bccTeamIds} allMembers={allMembers} memberIds={bccMemberIds}
          onRemoveTeam={(id: string) => toggleSetItem(setBccTeamIds, id)}
          onRemoveMember={(id: string) => toggleSetItem(setBccMemberIds, id)}
        />
        <SearchableSelect
          placeholder="Search BCC members…"
          search={bccMemberSearch} setSearch={setBccMemberSearch} open={bccMemberOpen} setOpen={setBccMemberOpen}
          items={filterMembers(bccMemberSearch).map((m) => ({ id: m.id, label: `${m.name}${m.designation ? ` (${m.designation})` : ""}`, sub: m.teamName }))}
          onSelect={(id: string) => toggleSetItem(setBccMemberIds, id)}
        />
      </Section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Deadline" htmlFor="deadline"><Input id="deadline" name="deadline" type="date" defaultValue={task.deadline} /></Field>
        <Field label="Frequency" htmlFor="frequency"><Select id="frequency" name="frequency" defaultValue={task.frequency}><option value="">—</option><option>Daily</option><option>Weekly</option><option>Monthly</option><option>Need-based</option><option>Campaign-based</option><option>Event-based</option></Select></Field>
        <Field label="Status" htmlFor="status"><Select id="status" name="status" defaultValue={task.status}><option value="NOT_STARTED">Not started</option><option value="IN_PROGRESS">In progress</option><option value="WAITING_FOR_INPUT">Waiting for input</option><option value="WAITING_FOR_APPROVAL">Waiting for approval</option><option value="DELAYED">Delayed</option><option value="COMPLETED">Completed</option><option value="PARKED">Parked</option></Select></Field>
      </div>

      <Field label="Expected output" htmlFor="expectedOutput"><Input id="expectedOutput" name="expectedOutput" defaultValue={task.expectedOutput} /></Field>
      <Field label="Support needed" htmlFor="supportNeeded"><Input id="supportNeeded" name="supportNeeded" defaultValue={task.supportNeeded} /></Field>
      <Field label="Delay reason" htmlFor="delayReason"><Input id="delayReason" name="delayReason" defaultValue={task.delayReason} /></Field>
      <Field label="Next action" htmlFor="nextAction"><Textarea id="nextAction" name="nextAction" defaultValue={task.nextAction} /></Field>
      <Field label="Dr. BN intervention" htmlFor="intervention"><Select id="intervention" name="intervention" defaultValue={task.intervention}><option value="NO">No</option><option value="YES">Yes</option><option value="ONLY_IF_DELAYED">Only if delayed</option></Select></Field>

      {/* ── Action buttons ── */}
      <div className="flex justify-end gap-2 pt-2 flex-wrap">
        <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
        <Button variant="outline" type="button" disabled={pending} onClick={(e) => onSubmit(e as unknown as React.FormEvent<HTMLFormElement>, false)}>
          <Save className="h-4 w-4 mr-1.5" />
          {pending ? "Saving…" : "Save without sending mail"}
        </Button>
        <Button type="button" disabled={pending} onClick={(e) => onSubmit(e as unknown as React.FormEvent<HTMLFormElement>, true)}>
          <Send className="h-4 w-4 mr-1.5" />
          {pending ? "Sending…" : "Save changes & send mail"}
        </Button>
      </div>
    </form>
  );
}

// ── Reusable components ────────────────────────────────────────────────────

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label htmlFor={htmlFor}>{label}</Label>{children}</div>;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="rounded-lg border border-border p-3 space-y-3">
    <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
    {children}
  </div>;
}

function SearchableSelect({ placeholder, search, setSearch, open, setOpen, items, onSelect }: {
  placeholder: string;
  search: string; setSearch: (v: string) => void;
  open: boolean; setOpen: (v: boolean) => void;
  items: { id: string; label: string; sub?: string }[];
  onSelect: (id: string) => void;
}) {
  return <div className="relative">
    <Input value={search} onChange={(e) => { setSearch(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)} placeholder={placeholder} className="h-8 text-xs" />
    {open && (search || items.length > 0) && (
      <div className="absolute z-10 mt-1 w-full max-h-44 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
        {items.map((item) => (
          <button key={item.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onSelect(item.id)} className="w-full px-3 py-2 text-left text-xs hover:bg-accent flex items-center justify-between">
            <span>{item.label}</span>
            {item.sub && <span className="text-muted-foreground text-[10px]">{item.sub}</span>}
          </button>
        ))}
      </div>
    )}
  </div>;
}

function SelectedChips({ teams, ids, allMembers, memberIds, teamEmailFlags, memberEmailFlags, onToggleTeam, onRemoveTeam, onToggleMember, onRemoveMember }: any) {
  const selectedTeams = teams.filter((t: any) => ids.has(t.id));
  const selectedMembers = allMembers.filter((m: any) => memberIds.has(m.id));
  return (ids.size > 0 || memberIds.size > 0) ? (
    <div className="flex flex-wrap gap-1.5">
      {selectedTeams.map((t: any) => {
        const send = teamEmailFlags.get(t.id) ?? true;
        return <Chip key={t.id} label={`${t.name} (${t.members.length})`} badge={send ? <><Mail className="h-2.5 w-2.5" /> Email</> : "No"} badgeActive={send} onBadge={() => onToggleTeam(t.id)} onRemove={() => onRemoveTeam(t.id)} />;
      })}
      {selectedMembers.map((m: any) => {
        const send = memberEmailFlags.get(m.id) ?? true;
        return <Chip key={m.id} label={`${m.name}${m.designation ? ` (${m.designation})` : ""}`} sub={m.teamName} badge={send ? <><Mail className="h-2.5 w-2.5" /> Email</> : "No"} badgeActive={send} onBadge={() => onToggleMember(m.id)} onRemove={() => onRemoveMember(m.id)} />;
      })}
    </div>
  ) : null;
}

function CcBccChips({ teams, ids, allMembers, memberIds, onRemoveTeam, onRemoveMember }: any) {
  const selectedTeams = teams.filter((t: any) => ids.has(t.id));
  const selectedMembers = allMembers.filter((m: any) => memberIds.has(m.id));
  return (ids.size > 0 || memberIds.size > 0) ? (
    <div className="flex flex-wrap gap-1.5">
      {selectedTeams.map((t: any) => <ChipSimple key={t.id} label={`${t.name} (${t.members.length})`} onRemove={() => onRemoveTeam(t.id)} />)}
      {selectedMembers.map((m: any) => <ChipSimple key={m.id} label={m.name} sub={m.teamName} onRemove={() => onRemoveMember(m.id)} />)}
    </div>
  ) : null;
}

function Chip({ label, sub, badge, badgeActive, onBadge, onRemove }: { label: string; sub?: string; badge: React.ReactNode; badgeActive: boolean; onBadge: () => void; onRemove: () => void }) {
  return <div className="inline-flex items-center gap-1 rounded-md border border-primary bg-primary/10 px-2 py-1 text-xs text-primary font-medium">
    <span>{label}{sub ? <span className="text-[10px] opacity-50 ml-0.5">{sub}</span> : null}</span>
    <button type="button" onClick={onBadge} className={`ml-1 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] ${badgeActive ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>{badge}</button>
    <button type="button" onClick={onRemove} className="ml-0.5 rounded p-0.5 hover:bg-primary/20"><X className="h-3 w-3" /></button>
  </div>;
}

function ChipSimple({ label, sub, onRemove }: { label: string; sub?: string; onRemove: () => void }) {
  return <div className="inline-flex items-center gap-1 rounded-md border border-primary bg-primary/10 px-2 py-1 text-xs text-primary font-medium">
    <span>{label}{sub ? <span className="text-[10px] opacity-50 ml-0.5">{sub}</span> : null}</span>
    <button type="button" onClick={onRemove} className="ml-0.5 rounded p-0.5 hover:bg-primary/20"><X className="h-3 w-3" /></button>
  </div>;
}