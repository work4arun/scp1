import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageTasks } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, PriorityBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { formatRelative, formatDate } from "@/lib/utils";
import { CboNotePlayer } from "./note-player";

export default async function SmNotesPage() {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole)) redirect("/");

  const tasks = await prisma.task.findMany({
    where: { cboNotes: { some: {} }, status: { not: "DROPPED" } },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      vertical: true,
      priority: true,
      teamAssignments: { include: { team: true } },
      assignees: { include: { member: true } },
      cboNotes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Notes from CBO" description="Tasks with voice or text instructions from the Chief Business Officer." />
      <Card><CardHeader><CardTitle>{tasks.length} task{tasks.length !== 1 ? "s" : ""} with notes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {tasks.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">No tasks with CBO notes yet.</div> : tasks.map((t) => {
            const assigneeNames = t.teamAssignments.length > 0 ? t.teamAssignments.map((ta) => `[${ta.team.name}]`).join(", ") : t.assignees.map((a) => a.member.name).join(", ") || "—";
            return (
              <div key={t.id} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1"><span className="font-mono text-[10px] font-bold text-muted-foreground">{t.code}</span><span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: t.vertical.colorHex }}>{t.vertical.name}</span></div>
                    <div className="text-sm font-semibold">{t.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{assigneeNames}{t.deadline ? ` · Deadline: ${formatDate(t.deadline)}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0"><PriorityBadge code={t.priority.code} /><StatusBadge status={t.status} /></div>
                </div>
                <div className="space-y-2 pl-3 border-l-2 border-primary/30">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Instructions ({t.cboNotes.length})</div>
                  {t.cboNotes.map((n) => (
                    <div key={n.id} className="rounded border border-border bg-muted/20 p-2.5">
                      {n.kind === "text" ? <p className="text-sm whitespace-pre-wrap">{n.text}</p> : <CboNotePlayer audioBase64={n.audioBytes ? Buffer.from(n.audioBytes).toString("base64") : null} audioMime={n.audioMime ?? "audio/webm"} durationS={n.audioDurationS} />}
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground"><Badge variant="info" className="text-[9px]">{n.kind === "text" ? "Text" : "Voice"}</Badge><span>{n.author.name}</span><span>·</span><span>{new Date(n.createdAt).toLocaleString()}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}