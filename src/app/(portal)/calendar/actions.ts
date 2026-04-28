"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isCBO, canManageTasks, canConfigureSystem } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { addMinutes, rangeOverlaps } from "@/lib/calendar";
import { notifyUser } from "@/lib/notify";
import type { AppointmentStatus, AppointmentRecurrence } from "@prisma/client";

async function ensureAuthed() {
  const session = await auth();
  if (!session?.user.id) throw new Error("Forbidden");
  return { userId: session.user.id, role: session.user.systemRole };
}

// ────────── Availability (CBO only sets their own) ──────────
export async function setAvailabilityAction(formData: FormData) {
  const { userId, role } = await ensureAuthed();
  if (!isCBO(role)) throw new Error("Forbidden");

  const id = (formData.get("id") as string) || null;
  const dayOfWeek = Number(formData.get("dayOfWeek") || -1);
  const startMin = Number(formData.get("startMin") || 0);
  const endMin = Number(formData.get("endMin") || 0);
  const label = (formData.get("label") as string) || null;

  if (dayOfWeek < 0 || dayOfWeek > 6 || endMin <= startMin) throw new Error("Invalid time window.");

  if (id) {
    await prisma.availability.update({ where: { id }, data: { dayOfWeek, startMin, endMin, label } });
  } else {
    await prisma.availability.create({ data: { userId, dayOfWeek, startMin, endMin, label } });
  }
  revalidatePath("/calendar");
}

export async function deleteAvailabilityAction(id: string) {
  const { userId } = await ensureAuthed();
  const a = await prisma.availability.findUnique({ where: { id } });
  if (!a || a.userId !== userId) throw new Error("Forbidden");
  await prisma.availability.delete({ where: { id } });
  revalidatePath("/calendar");
}

// ────────── Booking (SM books a slot with the CBO) ──────────
export async function bookAppointmentAction(formData: FormData): Promise<string> {
  const { userId, role } = await ensureAuthed();
  if (!canManageTasks(role)) throw new Error("Only the SM can book appointments.");

  const title = String(formData.get("title") || "").trim();
  const description = (formData.get("description") as string) || null;
  const agenda = (formData.get("agenda") as string) || null;
  const startISO = String(formData.get("startAt") || "");
  const endISO = String(formData.get("endAt") || "");
  const location = (formData.get("location") as string) || null;
  const interventionId = (formData.get("interventionId") as string) || null;
  const taskId = (formData.get("taskId") as string) || null;
  const attendeeId = String(formData.get("attendeeId") || "");

  if (!title || !startISO || !endISO || !attendeeId) throw new Error("Missing required fields.");

  const startAt = new Date(startISO);
  const endAt = new Date(endISO);
  if (endAt <= startAt) throw new Error("End time must be after start.");
  if (startAt < new Date()) throw new Error("Cannot book a past slot.");

  // Conflict check on attendee's calendar (confirmed appointments only)
  const existing = await prisma.appointment.findMany({
    where: {
      attendeeId,
      status: { in: ["PENDING", "CONFIRMED"] },
      AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
    },
    select: { id: true, startAt: true, endAt: true },
  });
  if (existing.some((e) => rangeOverlaps(startAt, endAt, e.startAt, e.endAt))) {
    throw new Error("That slot is no longer available. Please pick another time.");
  }

  const created = await prisma.appointment.create({
    data: {
      title,
      description,
      agenda,
      organizerId: userId,
      attendeeId,
      startAt,
      endAt,
      location,
      interventionId,
      taskId,
      status: "PENDING",
    },
  });
  revalidatePath("/calendar");
  revalidatePath("/cbo");
  revalidatePath("/sm");

  await notifyUser(attendeeId, {
    kind: "appointment.requested",
    title: "📅 Meeting requested",
    body: `${title} · ${startAt.toLocaleString("en-IN", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`,
    link: "/calendar",
    refId: created.id,
    senderId: userId,
  });

  return created.id;
}

// ────────── CBO actions on incoming requests ──────────
export async function setAppointmentStatusAction(id: string, status: AppointmentStatus, reason?: string) {
  const { userId, role } = await ensureAuthed();
  const appt = await prisma.appointment.findUnique({ where: { id } });
  if (!appt) throw new Error("Not found");

  // Only attendee can confirm/reject. Organizer can cancel. Both can mark completed.
  const isAttendee = appt.attendeeId === userId;
  const isOrganizer = appt.organizerId === userId;
  const isAdmin = canConfigureSystem(role);

  if (status === "CONFIRMED" || status === "REJECTED") {
    if (!isAttendee && !isAdmin) throw new Error("Only the attendee can confirm or reject.");
  }
  if (status === "CANCELLED") {
    if (!isOrganizer && !isAttendee && !isAdmin) throw new Error("Forbidden");
  }

  await prisma.appointment.update({
    where: { id },
    data: {
      status,
      ...(status === "REJECTED" ? { rejectionReason: reason || null } : {}),
      ...(status === "CANCELLED" ? { cancelledReason: reason || null } : {}),
    },
  });
  revalidatePath("/calendar");
  revalidatePath("/cbo");
  revalidatePath("/sm");
}

// ────────── Record outcome — auto-link to escalation ──────────
export async function recordAppointmentOutcomeAction(id: string, outcome: string, alsoResolveIntervention: boolean) {
  const { userId, role } = await ensureAuthed();
  const appt = await prisma.appointment.findUnique({ where: { id } });
  if (!appt) throw new Error("Not found");
  if (appt.attendeeId !== userId && appt.organizerId !== userId && !canConfigureSystem(role)) throw new Error("Forbidden");

  await prisma.appointment.update({
    where: { id },
    data: { outcome, status: "COMPLETED" },
  });

  // Auto-link: if the appointment came from an escalation, write the outcome back as resolution
  if (appt.interventionId && alsoResolveIntervention) {
    await prisma.intervention.update({
      where: { id: appt.interventionId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        decisionType: "meeting_decided",
        resolutionNote: `Decided in meeting on ${new Date(appt.startAt).toLocaleString("en-IN")}: ${outcome}`,
        snoozedUntil: null,
      },
    });
  }
  revalidatePath("/calendar");
  revalidatePath("/cbo");
  revalidatePath("/cbo/intervention");
  revalidatePath("/sm");
}

// ────────── MRM auto-creator ──────────
export async function createMrmAction() {
  const { userId, role } = await ensureAuthed();
  if (!isCBO(role)) throw new Error("Only the CBO can set the MRM.");

  // Find the SM (any one) to set as organizer of the recurring meeting series.
  // The CBO is the attendee.
  const sm = await prisma.user.findFirst({ where: { systemRole: "SM", active: true } });
  if (!sm) throw new Error("No active Strategic Manager found. Create one first.");

  // Schedule next Monday 10:00–11:00 IST
  const now = new Date();
  const next = new Date(now);
  const daysToMonday = (1 + 7 - now.getDay()) % 7 || 7;
  next.setDate(now.getDate() + daysToMonday);
  next.setHours(10, 0, 0, 0);
  const start = next;
  const end = addMinutes(start, 60);

  await prisma.appointment.create({
    data: {
      title: "Weekly MRM (Marketing Review Meeting)",
      description: "Standing weekly review of marketing actions, lead pipeline, and poor-performing courses.",
      agenda: [
        "1. Action points from previous MRM",
        "2. Lead generation & nurturing dashboard",
        "3. Walk-in to admission conversion",
        "4. Poor-performing course strategy (RTC, Viscom, MBA, MCA, Pharmacy, Physio)",
        "5. Digital ad performance & budget review",
        "6. New strategy adoption & impact",
        "7. Decisions required",
      ].join("\n"),
      organizerId: sm.id,
      attendeeId: userId,
      startAt: start,
      endAt: end,
      location: "Office / Online",
      status: "CONFIRMED",
      recurrence: "WEEKLY",
      recurrenceUntil: addMinutes(start, 60 * 24 * 7 * 52), // 52 weeks
    },
  });
  revalidatePath("/calendar");
}

// Save outcome of a confirmed appointment quickly via the CBO calendar
export async function quickOutcomeAction(id: string, outcome: string) {
  return recordAppointmentOutcomeAction(id, outcome, true);
}

// ────────── Cancel a recurring meeting (deletes the parent + future instances) ──────────
export async function cancelRecurringAction(id: string) {
  const { userId, role } = await ensureAuthed();
  const appt = await prisma.appointment.findUnique({ where: { id } });
  if (!appt) throw new Error("Not found");
  if (appt.attendeeId !== userId && appt.organizerId !== userId && !canConfigureSystem(role)) throw new Error("Forbidden");
  await prisma.appointment.update({
    where: { id },
    data: { status: "CANCELLED", recurrence: "NONE" as AppointmentRecurrence, recurrenceUntil: null },
  });
  revalidatePath("/calendar");
}
