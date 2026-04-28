"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { updateTaskAction } from "./actions";
import type { TaskStatus, TaskSource, InterventionFlag } from "@prisma/client";

type Vertical = { id: string; code: string; name: string };
type SubVertical = { id: string; name: string; verticalId: string };
type Priority = { id: string; code: string; label: string };
type OwnerRole = { id: string; name: string };

export function EditTaskForm({
  taskId,
  verticals,
  subVerticals,
  priorities,
  ownerRoles,
  initial,
}: {
  taskId: string;
  verticals: Vertical[];
  subVerticals: SubVertical[];
  priorities: Priority[];
  ownerRoles: OwnerRole[];
  initial: {
    title: string;
    verticalId: string;
    subVerticalId: string | null;
    priorityId: string;
    ownerRoleId: string | null;
    deadline: string;
    frequency: string | null;
    source: TaskSource;
    expectedOutput: string | null;
    supportNeeded: string | null;
    nextAction: string | null;
    intervention: InterventionFlag;
    status: TaskStatus;
  };
}) {
  const [pending, startTransition] = useTransition();
  const [verticalId, setVerticalId] = useState(initial.verticalId);
  const filteredSubs = useMemo(
    () => subVerticals.filter((s) => s.verticalId === verticalId),
    [subVerticals, verticalId]
  );

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateTaskAction(taskId, form);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Vertical" htmlFor="verticalId">
          <Select id="verticalId" name="verticalId" required value={verticalId} onChange={(e) => setVerticalId(e.target.value)}>
            {verticals.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>
        </Field>
        <Field label="Sub-vertical" htmlFor="subVerticalId">
          <Select id="subVerticalId" name="subVerticalId" defaultValue={initial.subVerticalId || ""}>
            <option value="">— None —</option>
            {filteredSubs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
      </div>

      <Field label="Task title" htmlFor="title">
        <Input id="title" name="title" required defaultValue={initial.title} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Priority" htmlFor="priorityId">
          <Select id="priorityId" name="priorityId" required defaultValue={initial.priorityId}>
            {priorities.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.label}</option>)}
          </Select>
        </Field>
        <Field label="Status" htmlFor="status">
          <Select id="status" name="status" required defaultValue={initial.status}>
            <option value="NOT_STARTED">Not Started</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_FOR_INPUT">Waiting for Input</option>
            <option value="WAITING_FOR_APPROVAL">Waiting for Approval</option>
            <option value="DELAYED">Delayed</option>
            <option value="COMPLETED">Completed</option>
            <option value="PARKED">Parked</option>
          </Select>
        </Field>
        <Field label="Owner role" htmlFor="ownerRoleId">
          <Select id="ownerRoleId" name="ownerRoleId" defaultValue={initial.ownerRoleId || ""}>
            <option value="">— Unassigned —</option>
            {ownerRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Deadline" htmlFor="deadline">
          <Input id="deadline" name="deadline" type="date" defaultValue={initial.deadline} />
        </Field>
        <Field label="Frequency" htmlFor="frequency">
          <Select id="frequency" name="frequency" defaultValue={initial.frequency || ""}>
            <option value="">—</option>
            <option>Daily</option>
            <option>Weekly</option>
            <option>Monthly</option>
            <option>Need-based</option>
            <option>Campaign-based</option>
            <option>Event-based</option>
          </Select>
        </Field>
        <Field label="Source" htmlFor="source">
          <Select id="source" name="source" defaultValue={initial.source}>
            <option value="SELF_STRATEGY">Self Strategy</option>
            <option value="BOSS_INSTRUCTION">Boss Instruction</option>
            <option value="WHATSAPP_GROUP">WhatsApp Group</option>
            <option value="MANAGEMENT_MEETING">Management Meeting</option>
            <option value="DEPARTMENT_MEETING">Department Meeting</option>
            <option value="MARKETING_REVIEW">Marketing Review</option>
            <option value="MRM">MRM</option>
            <option value="PLACEMENT_REVIEW">Placement Review</option>
            <option value="RTC_REVIEW">RTC Review</option>
            <option value="DIGITAL_REVIEW">Digital Review</option>
            <option value="NEW_IDEA">New Idea</option>
          </Select>
        </Field>
      </div>

      <Field label="Expected output" htmlFor="expectedOutput">
        <Input id="expectedOutput" name="expectedOutput" defaultValue={initial.expectedOutput || ""} />
      </Field>

      <Field label="Support needed" htmlFor="supportNeeded">
        <Input id="supportNeeded" name="supportNeeded" defaultValue={initial.supportNeeded || ""} />
      </Field>

      <Field label="Next action" htmlFor="nextAction">
        <Textarea id="nextAction" name="nextAction" defaultValue={initial.nextAction || ""} />
      </Field>

      <Field label="Dr. BN intervention" htmlFor="intervention">
        <Select id="intervention" name="intervention" defaultValue={initial.intervention}>
          <option value="NO">No</option>
          <option value="YES">Yes</option>
          <option value="ONLY_IF_DELAYED">Only if delayed</option>
        </Select>
      </Field>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
        <Button type="button" variant="outline" onClick={() => history.back()}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
      </div>
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
