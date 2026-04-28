import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isCBO, canManageTasks } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Plus, Clock, CalendarPlus, Download } from "lucide-react";
import Link from "next/link";
import { formatDate, formatRelative } from "@/lib/utils";
import { DAY_NAMES, minutesToHHMM } from "@/lib/calendar";
import { AvailabilityForm, AvailabilityRow } from "./availability-client";
import { AppointmentRow } from "./appointment-client";
import { CreateMrmButton } from "./mrm-client";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user.id) redirect("/login");
  const role = session.user.systemRole;
  const myId = session.user.id;

  const isCbo = isCBO(role);
  const isSm = canManageTasks(role) && !isCbo; // pure SM
  if (!isCbo && !canManageTasks(role)) redirect("/");

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let availabilities: { id: string; dayOfWeek: number; startMin: number; endMin: number; label: string | null; active: boolean }[] = [];
  try {
    availabilities = await prisma.availability.findMany({
      where: { userId: myId },
      orderBy: [{ dayOfWeek: "asc" }, { startMin: "asc" }],
    });
  } catch { /* migration pending */ }

  let myAppointments: Array<{
    id: string; title: string; startAt: Date; endAt: Date; status: string;
    location: string | null; recurrence: string; description: string | null;
    organizer: { name: string; email: string }; attendee: { name: string; email: string };
    intervention: { id: string; issue: string } | null;
  }> = [];
  try {
    myAppointments = await prisma.appointment.findMany({
      where: {
        OR: [{ organizerId: myId }, { attendeeId: myId }],
        startAt: { gte: now, lte: in30Days },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      orderBy: { startAt: "asc" },
      include: {
        organizer: { select: { name: true, email: true } },
        attendee: { select: { name: true, email: true } },
        intervention: { select: { id: true, issue: true } },
      },
    });
  } catch { /* migration pending */ }

  const incomingPending = isCbo ? myAppointments.filter((a) => a.status === "PENDING" && a.attendee.email === session.user.email) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Calendar"
        description={isCbo
          ? "Set your weekly availability, review incoming requests, and run recurring meetings."
          : "View upcoming meetings and book a slot with the CBO."}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/calendar/${myId}.ics`} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" /> Subscribe (.ics)
              </a>
            </Button>
            {isSm && (
              <Button asChild>
                <Link href="/calendar/book"><Plus className="h-4 w-4" /> Book a slot</Link>
              </Button>
            )}
            {isCbo && <CreateMrmButton />}
          </div>
        }
      />

      {availabilities.length === 0 && myAppointments.length === 0 ? null : null}

      {/* Pending requests for CBO */}
      {isCbo && incomingPending.length > 0 && (
        <Card className="border-warning/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarPlus className="h-4 w-4 text-warning" /> Incoming Requests ({incomingPending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {incomingPending.map((a) => (
              <AppointmentRow key={a.id} appt={serializeAppt(a)} viewerRole="cbo" />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upcoming meetings (next 30 days) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4" /> Upcoming (next 30 days)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {myAppointments.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">No meetings scheduled.</div>
          ) : (
            myAppointments.map((a) => (
              <AppointmentRow key={a.id} appt={serializeAppt(a)} viewerRole={isCbo ? "cbo" : "sm"} />
            ))
          )}
        </CardContent>
      </Card>

      {/* Availability — CBO only */}
      {isCbo && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" /> Weekly Availability
            </CardTitle>
            <span className="text-xs text-muted-foreground">Slots SM can book against</span>
          </CardHeader>
          <CardContent className="space-y-3">
            <AvailabilityForm />
            {availabilities.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground text-center">
                No availability rules yet. Add at least one (e.g., Mon 10:00 → 12:00) so the SM can book a slot.
              </div>
            ) : (
              <div className="space-y-2">
                {availabilities.map((a) => (
                  <AvailabilityRow key={a.id} a={a} />
                ))}
              </div>
            )}
            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              💡 Tip: Set short windows for "Decision slots" so the SM can book 15-min meetings to resolve escalations.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick reference for SM about CBO availability */}
      {isSm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dr. BN's Working Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <CboAvailabilityHint />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function serializeAppt(a: {
  id: string; title: string; startAt: Date; endAt: Date; status: string; location: string | null;
  recurrence: string; description: string | null;
  organizer: { name: string; email: string }; attendee: { name: string; email: string };
  intervention: { id: string; issue: string } | null;
}) {
  return {
    id: a.id, title: a.title, startAtIso: a.startAt.toISOString(), endAtIso: a.endAt.toISOString(),
    status: a.status, location: a.location, recurrence: a.recurrence, description: a.description,
    organizerName: a.organizer.name, attendeeName: a.attendee.name,
    interventionId: a.intervention?.id ?? null, interventionIssue: a.intervention?.issue ?? null,
  };
}

async function CboAvailabilityHint() {
  const cbo = await prisma.user.findFirst({ where: { systemRole: "CBO", active: true } });
  if (!cbo) return <div className="text-sm text-muted-foreground">No CBO user is active in the system.</div>;
  let rules: { dayOfWeek: number; startMin: number; endMin: number; label: string | null }[] = [];
  try {
    rules = await prisma.availability.findMany({
      where: { userId: cbo.id, active: true },
      orderBy: [{ dayOfWeek: "asc" }, { startMin: "asc" }],
    });
  } catch { /* */ }
  if (rules.length === 0) {
    return <div className="text-sm text-muted-foreground">Dr. BN hasn't published availability yet. Use Book a slot anyway and they'll propose a time.</div>;
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {rules.map((r, i) => (
        <div key={i} className="rounded-lg border border-border p-2.5 text-center">
          <div className="text-[10px] font-bold uppercase text-muted-foreground">{DAY_NAMES[r.dayOfWeek]}</div>
          <div className="text-sm font-semibold mt-0.5">{minutesToHHMM(r.startMin)}–{minutesToHHMM(r.endMin)}</div>
          {r.label ? <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{r.label}</div> : null}
        </div>
      ))}
    </div>
  );
}
