import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageTasks } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelative } from "@/lib/utils";
import { Mic, Mail } from "lucide-react";

export default async function SmNotes() {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole)) redirect("/");

  // SMs see all notes whose audience role matches theirs.
  const notes = await prisma.note.findMany({
    where: { audienceRole: session.user.systemRole },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      text: true,
      audioMime: true,
      audioDurationS: true,
      createdAt: true,
      author: { select: { name: true, email: true, systemRole: true } },
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Notes from CBO"
        description="Messages and voice notes sent by the CBO."
      />

      {notes.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No notes yet. New notes from the CBO appear here in real time.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <Card key={n.id} className="hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                      <Mail className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{n.author.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {n.author.email} · {n.author.systemRole}
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground shrink-0">
                    {formatRelative(n.createdAt)}
                  </div>
                </div>

                {n.text && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{n.text}</p>}

                {n.audioMime && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
                    <Mic className="h-4 w-4 text-primary" />
                    <audio src={`/api/notes/${n.id}/audio`} controls className="flex-1" preload="metadata" />
                    {n.audioDurationS ? (
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {Math.floor(n.audioDurationS / 60)}:{String(n.audioDurationS % 60).padStart(2, "0")}
                      </span>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
