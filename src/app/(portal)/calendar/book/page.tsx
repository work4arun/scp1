import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageTasks, isCBO } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { generateSlots, addDays, startOfDay } from "@/lib/calendar";
import { BookingForm } from "./booking-form";

export default async function BookPage({ searchParams }: { searchParams: { intervention?: string; task?: string } }) {
  const session = await auth();
  if (!session?.user.id) redirect("/login");
  const role = session.user.systemRole;
  if (!canManageTasks(role) || isCBO(role)) redirect("/calendar"); // SM only

  const cbo = await prisma.user.findFirst({ where: { systemRole: "CBO", active: true } });
  if (!cbo) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Book a Slot" description="No active CBO user in the system. Ask Super Admin to create one." />
      </div>
    );
  }

  let availabilities: { dayOfWeek: number; startMin: number; endMin: number }[] = [];
  let busy: { startAt: Date; endAt: Date }[] = [];
  try {
    [availabilities, busy] = await Promise.all([
      prisma.availability.findMany({ where: { userId: cbo.id, active: true } }),
      prisma.appointment.findMany({
        where: { attendeeId: cbo.id, status: { in: ["PENDING", "CONFIRMED"] } },
        select: { startAt: true, endAt: true },
      }),
    ]);
  } catch { /* */ }

  // Build slot suggestions for next 14 days, 30-minute slots
  const today = startOfDay(new Date());
  const days: { date: Date; slots: { start: Date; end: Date }[] }[] = [];
  for (let i = 0; i < 14; i++) {
    const date = addDays(today, i);
    const slots = generateSlots({ date, rules: availabilities, busy, durationMin: 30 });
    if (slots.length > 0) days.push({ date, slots });
  }

  // Pre-fill from query if linked from escalation
  let intervention: { id: string; issue: string; whyNeeded: string; decisionRequired: string } | null = null;
  if (searchParams.intervention) {
    intervention = await prisma.intervention.findUnique({
      where: { id: searchParams.intervention },
      select: { id: true, issue: true, whyNeeded: true, decisionRequired: true },
    });
  }
  let taskTitle: string | null = null;
  if (searchParams.task) {
    const t = await prisma.task.findUnique({ where: { id: searchParams.task }, select: { title: true } });
    taskTitle = t?.title ?? null;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Book a Slot with Dr. BN"
        description="Pick from open slots, or propose a different time. Dr. BN will confirm."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/calendar"><ArrowLeft className="h-4 w-4" /> Back to calendar</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-5">
          <BookingForm
            cboId={cbo.id}
            cboName={cbo.name}
            availableDays={days.slice(0, 5).map((d) => ({
              dateIso: d.date.toISOString(),
              slots: d.slots.map((s) => ({ startIso: s.start.toISOString(), endIso: s.end.toISOString() })),
            }))}
            interventionId={intervention?.id ?? null}
            interventionPrefill={intervention ? `Re: ${intervention.issue}` : null}
            interventionDecisionContext={intervention?.decisionRequired ?? null}
            taskId={searchParams.task ?? null}
            taskTitle={taskTitle}
          />
        </CardContent>
      </Card>
    </div>
  );
}
