"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, X, Mail, ChevronDown } from "lucide-react";
import { createTaskAction } from "./actions";

type Vertical  = { id: string; code: string; name: string };
type SubVertical = { id: string; name: string; verticalId: string };
type Priority  = { id: string; code: string; label: string };
type Team = { id: string; name: string; members: { id: string; name: string; email: string; designation: string | null }[] };

export function NewTaskForm({
  verticals,
  subVerticals,
  priorities,
  teams,
}: {
  verticals: Vertical[];
  subVerticals: SubVertical[];
  priorities: Priority[];
  teams: Team[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [verticalId, setVerticalId] = useState(verticals[0]?.id || "");
  const [error, setError] = useState<string | null>(null);

  // Selected teams + email flags
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [teamEmailFlags, setTeamEmailFlags] = useState<Map<string, boolean>>(new Map());
  // Selected members + email flags
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [memberEmailFlags, setMemberEmailFlags] = useState<Map<string, boolean>>(new Map());

  // Search dropdown state
  const [teamSearch, setTeamSearch] = useState("");
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);

  const filteredSubs = useMemo(() => subVerticals.filter((s) => s.verticalId === verticalId), [subVerticals, verticalId]);
  const allMembers = useMemo(() => teams.flatMap((t) => t.members.map((m) => ({ ...m, teamName: t.name }))), [teams]);

  // Filtered teams for dropdown
  const filteredTeams = useMemo(() => {
    if (!teamSearch) return teams;
    const q = teamSearch.toLowerCase();
    return teams.filter((t) => t.name.toLowerCase().includes(q));
  }, [teams, teamSearch]);

  // Filtered members for dropdown
  const filteredMembers = useMemo(() => {
    if (!memberSearch) return allMembers;
    const q = memberSearch.toLowerCase();
    return allMembers.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.teamName.toLowerCase().includes(q));
  }, [allMembers, memberSearch]);

  const selectTeam = (id: string) => {
    setSelectedTeamIds((prev) => new Set(prev).add(id));
    setTeamEmailFlags((prev) => new Map(prev).set(id, true));
    setTeamSearch("");
    setTeamDropdownOpen(false);
  };
  const removeTeam = (id: string) => {
    setSelectedTeamIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    setTeamEmailFlags((prev) => { const m = new Map(prev); m.delete(id); return m; });
  };
  const toggleTeamEmail = (id: string) => setTeamEmailFlags((prev) => new Map(prev).set(id, !(prev.get(id) ?? true)));

  const selectMember = (id: string) => {
    setSelectedMemberIds((prev) => new Set(prev).add(id));
    setMemberEmailFlags((prev) => new Map(prev).set(id, true));
    setMemberSearch("");
    setMemberDropdownOpen(false);
  };
  const removeMember = (id: string) => {
    setSelectedMemberIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    setMemberEmailFlags((prev) => { const m = new Map(prev); m.delete(id); return m; });
  };
  const toggleMemberEmail = (id: string) => setMemberEmailFlags((prev) => new Map(prev).set(id, !(prev.get(id) ?? true)));

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    form.set("teamIds", Array.from(selectedTeamIds).join(","));
    for (const tid of selectedTeamIds) form.set(`teamsend_${tid}`, String(teamEmailFlags.get(tid) ?? true));
    form.set("memberIds", Array.from(selectedMemberIds).join(","));
    for (const mid of selectedMemberIds) form.set(`membersend_${mid}`, String(memberEmailFlags.get(mid) ?? true));

    startTransition(async () => {
      try {
        const result = await createTaskAction(form);
        if (!result.success) { setError(result.error); return; }
        router.push(`/sm/tasks/${result.id}`);
      } catch (err) {
        const msg = (err as Error)?.message;
        setError(msg && !msg.toLowerCase().includes("digest") ? msg : "Could not reach the server.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span></div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Vertical" htmlFor="verticalId"><Select id="verticalId" name="verticalId" required value={verticalId} onChange={(e) => setVerticalId(e.target.value)}>{verticals.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select></Field>
        <Field label="Sub-vertical" htmlFor="subVerticalId"><Select id="subVerticalId" name="subVerticalId"><option value="">— None —</option>{filteredSubs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
      </div>

      <Field label="Task title" htmlFor="title"><Input id="title" name="title" required placeholder="What needs to happen?" /></Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Priority" htmlFor="priorityId"><Select id="priorityId" name="priorityId" required>{priorities.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.label}</option>)}</Select></Field>
        <Field label="Source" htmlFor="source"><Select id="source" name="source"><option value="SELF_STRATEGY">Self Strategy</option><option value="BOSS_INSTRUCTION">Boss Instruction</option><option value="WHATSAPP_GROUP">WhatsApp Group</option><option value="MANAGEMENT_MEETING">Management Meeting</option><option value="DEPARTMENT_MEETING">Department Meeting</option><option value="MARKETING_REVIEW">Marketing Review</option><option value="MRM">MRM</option><option value="PLACEMENT_REVIEW">Placement Review</option><option value="RTC_REVIEW">RTC Review</option><option value="DIGITAL_REVIEW">Digital Review</option><option value="NEW_IDEA">New Idea</option></Select></Field>
      </div>

      {/* ── Assignment ── */}
      <div className="rounded-lg border border-border p-3 space-y-4">
        <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Assignment</div>

        {/* Team search dropdown + selected chips */}
        <div>
          <Label className="text-xs text-muted-foreground">Select teams</Label>
          <div className="relative mt-1">
            <div className="flex items-center gap-2">
              <Input value={teamSearch} onChange={(e) => { setTeamSearch(e.target.value); setTeamDropdownOpen(true); }} onFocus={() => setTeamDropdownOpen(true)} onBlur={() => setTimeout(() => setTeamDropdownOpen(false), 200)} placeholder="Search teams…" className="h-8 text-xs flex-1" />
            </div>
            {teamDropdownOpen && (teamSearch || filteredTeams.length > 0) && (
              <div className="absolute z-10 mt-1 w-full max-h-36 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
                {filteredTeams.length === 0 ? <div className="px-3 py-2 text-xs text-muted-foreground">No teams found.</div> : filteredTeams.map((t) => <button key={t.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => selectTeam(t.id)} className="w-full px-3 py-2 text-left text-xs hover:bg-accent transition-colors">{t.name} ({t.members.length} members)</button>)}
              </div>
            )}
          </div>
          {/* Selected team chips */}
          {selectedTeamIds.size > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {teams.filter((t) => selectedTeamIds.has(t.id)).map((t) => {
                const sendEmail = teamEmailFlags.get(t.id) ?? true;
                return (
                  <div key={t.id} className="inline-flex items-center gap-1 rounded-md border border-primary bg-primary/10 px-2 py-1 text-xs text-primary font-medium">
                    <span>{t.name} ({t.members.length})</span>
                    <button type="button" onClick={() => toggleTeamEmail(t.id)} className={`ml-1 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] ${sendEmail ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`} title={sendEmail ? "Email ON" : "Email OFF"}><Mail className="h-2.5 w-2.5" /> {sendEmail ? "Email" : "No"}</button>
                    <button type="button" onClick={() => removeTeam(t.id)} className="ml-0.5 rounded p-0.5 hover:bg-primary/20"><X className="h-3 w-3" /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Member search dropdown + selected chips */}
        <div>
          <Label className="text-xs text-muted-foreground">Or select individual members</Label>
          <div className="relative mt-1">
            <Input value={memberSearch} onChange={(e) => { setMemberSearch(e.target.value); setMemberDropdownOpen(true); }} onFocus={() => setMemberDropdownOpen(true)} onBlur={() => setTimeout(() => setMemberDropdownOpen(false), 200)} placeholder="Search members by name, email, or team…" className="h-8 text-xs" />
            {memberDropdownOpen && (memberSearch || filteredMembers.length > 0) && (
              <div className="absolute z-10 mt-1 w-full max-h-44 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
                {filteredMembers.length === 0 ? <div className="px-3 py-2 text-xs text-muted-foreground">No members found.</div> : filteredMembers.map((m) => <button key={m.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => selectMember(m.id)} className="w-full px-3 py-2 text-left text-xs hover:bg-accent transition-colors flex items-center justify-between"><span><span className="font-medium">{m.name}</span>{m.designation && <span className="text-muted-foreground ml-1">({m.designation})</span>}</span><span className="text-muted-foreground text-[10px]">{m.teamName}</span></button>)}
              </div>
            )}
          </div>
          {/* Selected member chips */}
          {selectedMemberIds.size > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {allMembers.filter((m) => selectedMemberIds.has(m.id)).map((m) => {
                const sendEmail = memberEmailFlags.get(m.id) ?? true;
                return (
                  <div key={m.id} className="inline-flex items-center gap-1 rounded-md border border-primary bg-primary/10 px-2 py-1 text-xs text-primary font-medium">
                    <span>{m.name}{m.designation ? ` (${m.designation})` : ""}</span>
                    <span className="text-[10px] opacity-50">{m.teamName}</span>
                    <button type="button" onClick={() => toggleMemberEmail(m.id)} className={`ml-1 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] ${sendEmail ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`} title={sendEmail ? "Email ON" : "Email OFF"}><Mail className="h-2.5 w-2.5" /> {sendEmail ? "Email" : "No"}</button>
                    <button type="button" onClick={() => removeMember(m.id)} className="ml-0.5 rounded p-0.5 hover:bg-primary/20"><X className="h-3 w-3" /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Deadline" htmlFor="deadline"><Input id="deadline" name="deadline" type="date" /></Field>
        <Field label="Frequency" htmlFor="frequency"><Select id="frequency" name="frequency"><option value="">—</option><option>Daily</option><option>Weekly</option><option>Monthly</option><option>Need-based</option><option>Campaign-based</option><option>Event-based</option></Select></Field>
      </div>

      <Field label="Expected output" htmlFor="expectedOutput"><Input id="expectedOutput" name="expectedOutput" placeholder="What does success look like?" /></Field>
      <Field label="Support needed" htmlFor="supportNeeded"><Input id="supportNeeded" name="supportNeeded" placeholder="Data / approval / budget / team / content" /></Field>
      <Field label="Next action" htmlFor="nextAction"><Textarea id="nextAction" name="nextAction" placeholder="The very next step." /></Field>
      <Field label="Dr. BN intervention" htmlFor="intervention"><Select id="intervention" name="intervention" defaultValue="NO"><option value="NO">No</option><option value="YES">Yes</option><option value="ONLY_IF_DELAYED">Only if delayed</option></Select></Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="reset" variant="outline" onClick={() => { setError(null); setSelectedTeamIds(new Set()); setSelectedMemberIds(new Set()); setTeamEmailFlags(new Map()); setMemberEmailFlags(new Map()); }}>Reset</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Add to register"}</Button>
      </div>
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label htmlFor={htmlFor}>{label}</Label>{children}</div>;
}