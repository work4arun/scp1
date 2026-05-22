"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isCBO, canManageTasks, canConfigureSystem } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { addMinutes, rangeOverlaps } from "@/lib/calendar";
import { notifyUser } from "@/lib/notify";
import { friendlyPrismaError } from "@/lib/prisma-errors";
import type { AppointmentStatus, AppointmentRecurrence, SystemRole } from "@prisma/client";

const FORBIDDEN_MSG =
  "Your session is no longer valid or you don't have permission for this action. Please sign in again.";

type AuthedUser = { userId: string; role: SystemRole };
type AuthResult = { ok: true } & AuthedUser | { ok: false; error: string };

async function ensureAuthed(): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user.id || !session.user.systemRole) return { ok: false, error: FORBIDDEN_MSG };
  return { ok: true, userId: session.user.id, role: session.user.systemRole as SystemRole };
}

export type CalendarResult = { success: true } | { success: false; error: string };
export type BookResult = { success: true; id: string } | { success: false; error: string };

// ────────── Availability (CBO only sets their own) ──────────
export async function setAvailabilityAction(formData: FormData): Promise<CalendarResult> {
  const authed = await ensureAuthed();
  if (!authed.ok) return { success: false, error: authed.error };
  if (!isCBO(authed.role)) return { success: false, error: FORBIDDEN_MSG };

  const id = (formData.get("id") as string) || null;
  const dayOfWeek = Number(formData.get("dayOfWeek") || -1);
  const startMin = Number(formData.get("startMin") || 0);
  const endMin = Number(formData.get("endMin") || 0);
  const label = (formData.get("label") as string) || null;

  if (dayOfWeek < 0 || dayOfWeek > 6 || endMin <= startMin) {
    return { success: false, error: "Invalid time window — end time must be after start time and day must be valid." };
  }

  try {
    if (id) {
      await prisma.availability.update({ where: { id }, data: { dayOfWeek, startMin, endMin, label } });
    } else {
      await prisma.availability.create({ data: { userId: authed.userId, dayOfWeek, startMin, endMin, label } });
    }
  } catch (err) {
    console.error("[setAvailabilityAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not save availability. Please try again." };
  }

  revalidatePath("/calendar");
  return { success: true };
}

export async function deleteAvailabilityAction(id: string): Promise<CalendarResult> {
  const authed = await ensureAuthed();
  if (!authed.ok) return { success: false, error: authed.error };

  const a = await prisma.availability.findUnique({ where: { id } });
  if (!a || a.userId !== authed.userId) return { success: false, error: FORBIDDEN_MSG };

  try {
    await prisma.availability.delete({ where: { id } });
  } catch (err) {
    console.error("[deleteAvailabilityAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not delete availability. Please try again." };
  }

  revalidatePath("/calendar");
  return { success: true };
}

// ────────── Booking (SM books a slot with the CBO) ──────────
export async function bookAppointmentAction(formData: FormData): Promise<BookResult> {
  const authed = await ensureAuthed();
  if (!authed.ok) return { success: false, error: authed.error };
  if (!canManageTasks(authed.role)) return { success: false, error: "Only the Strategic Manager can book appointments." };

  const title = String(formData.get("title") || "").trim();
  const description = (formData.get("description") as string) || null;
  const agenda = (formData.get("agenda") as string) || null;
  const startISO = String(formData.get("startAt") || "");
  const endISO = String(formData.get("endAt") || "");
  const location = (formData.get("location") as string) || null;
  const interventionId = (formData.get("interventionId") as string) || null;
  const taskId = (formData.get("taskId") as string) || null;
  const attendeeId = String(formData.get("attendeeId") || "");

  if (!title || !startISO || !endISO || !attendeeId) {
    return { success: false, error: "Title, time slot, and attendee are required." };
  }

  const startAt = new Date(startISO);
  const endAt = new Date(endISO);
  if (endAt <= startAt) return { success: false, error: "End time must be after start time." };
  if (startAt < new Date()) return { success: false, error: "Cannot book a slot in the past." };

  // Conflict check on attendee's calendar (pending + confirmed appointments only)
  try {
    const existing = await prisma.appointment.findMany({
      where: {
        attendeeId,
        status: { in: ["PENDING", "CONFIRMED"] },
        AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
      },
      select: { id: true, startAt: true, endAt: true },
    });
    if (existing.some((e) => rangeOverlaps(startAt, endAt, e.startAt, e.endAt))) {
      return { success: false, error: "That slot is no longer available. Please pick another time." };
    }

    const created = await prisma.appointment.create({
      data: {
        title,
        description,
        agenda,
        organizerId: authed.userId,
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

    // notifyUser swallows its own errors.
    await notifyUser(attendeeId, {
      kind: "appointment.requested",
      title: "📅 Meeting requested",
      body: `${title} · ${startAt.toLocaleString("en-IN", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`,
      link: "/calendar",
      refId: created.id,
      senderId: authed.userId,
    });

    return { success: true, id: created.id };
  } catch (err) {
    console.error("[bookAppointmentAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not book the appointment. Please try again." };
  }
}

// ────────── CBO actions on incoming requests ──────────
export async function setAppointmentStatusAction(
  id: string,
  status: AppointmentStatus,
  reason?: string,
): Promise<CalendarResult> {
  const authed = await ensureAuthed();
  if (!authed.ok) return { success: false, error: authed.error };

  const appt = await prisma.appointment.findUnique({ where: { id } });
  if (!appt) return { success: false, error: "Appointment not found — it may have been cancelled. Please refresh." };

  // Only attendee can confirm/reject. Organizer can cancel. Both can mark completed.
  const isAttendee = appt.attendeeId === authed.userId;
  const isOrganizer = appt.organizerId === authed.userId;
  const isAdmin = canConfigureSystem(authed.role);

  if (status === "CONFIRMED" || status === "REJECTED") {
    if (!isAttendee && !isAdmin) return { success: false, error: "Only the attendee can confirm or reject an appointment." };
  }
  if (status === "CANCELLED") {
    if (!isOrganizer && !isAttendee && !isAdmin) return { success: false, error: FORBIDDEN_MSG };
  }

  try {
    await prisma.appointment.update({
      where: { id },
      data: {
        status,
        ...(status === "REJECTED" ? { rejectionReason: reason || null } : {}),
        ...(status === "CANCELLED" ? { cancelledReason: reason || null } : {}),
      },
    });
  } catch (err) {
    console.error("[setAppointmentStatusAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not update the appointment. Please try again." };
  }

  revalidatePath("/calendar");
  revalidatePath("/cbo");
  revalidatePath("/sm");
  return { success: true };
}

// ────────── Record outcome — auto-link to escalation ──────────
export async function recordAppointmentOutcomeAction(
  id: string,
  outcome: string,
  alsoResolveIntervention: boolean,
): Promise<CalendarResult> {
  const authed = await ensureAuthed();
  if (!authed.ok) return { success: false, error: authed.error };

  const appt = await prisma.appointment.findUnique({ where: { id } });
  if (!appt) return { success: false, error: "Appointment not found — please refresh." };
  if (appt.attendeeId !== authed.userId && appt.organizerId !== authed.userId && !canConfigureSystem(authed.role)) {
    return { success: false, error: FORBIDDEN_MSG };
  }

  try {
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
  } catch (err) {
    console.error("[recordAppointmentOutcomeAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not record the outcome. Please try again." };
  }

  revalidatePath("/calendar");
  revalidatePath("/cbo");
  revalidatePath("/cbo/intervention");
  revalidatePath("/sm");
  return { success: true };
}

// ────────── MRM auto-creator ──────────
export async function createMrmAction(): Promise<CalendarResult> {
  const authed = await ensureAuthed();
  if (!authed.ok) return { success: false, error: authed.error };
  if (!isCBO(authed.role)) return { success: false, error: "Only the CBO can create the MRM series." };

  // Find the SM (any one) to set as organizer of the recurring meeting series.
  // The CBO is the attendee.
  const sm = await prisma.user.findFirst({ where: { systemRole: "SM", active: true } });
  if (!sm) return { success: false, error: "No active Strategic Manager found. Create one first at /admin/users." };

  // Schedule next Monday 10:00–11:00 IST
  const now = new Date();
  const next = new Date(now);
  const daysToMonday = (1 + 7 - now.getDay()) % 7 || 7;
  next.setDate(now.getDate() + daysToMonday);
  next.setHours(10, 0, 0, 0);
  const start = next;
  const end = addMinutes(start, 60);

  try {
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
        attendeeId: authed.userId,
        startAt: start,
        endAt: end,
        location: "Office / Online",
        status: "CONFIRMED",
        recurrence: "WEEKLY",
        recurrenceUntil: addMinutes(start, 60 * 24 * 7 * 52), // 52 weeks
      },
    });
  } catch (err) {
    console.error("[createMrmAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not create the MRM series. Please try again." };
  }

  revalidatePath("/calendar");
  return { success: true };
}

// Save outcome of a confirmed appointment quickly via the CBO calendar
export async function quickOutcomeAction(id: string, outcome: string): Promise<CalendarResult> {
  return recordAppointmentOutcomeAction(id, outcome, true);
}

// ────────── Cancel a recurring meeting (deletes the parent + future instances) ──────────
export async function cancelRecurringAction(id: string): Promise<CalendarResult> {
  const authed = await ensureAuthed();
  if (!authed.ok) return { success: false, error: authed.error };

  const appt = await prisma.appointment.findUnique({ where: { id } });
  if (!appt) return { success: false, error: "Appointment not found — please refresh." };
  if (appt.attendeeId !== authed.userId && appt.organizerId !== authed.userId && !canConfigureSystem(authed.role)) {
    return { success: false, error: FORBIDDEN_MSG };
  }

  try {
    await prisma.appointment.update({
      where: { id },
      data: { status: "CANCELLED", recurrence: "NONE" as AppointmentRecurrence, recurrenceUntil: null },
    });
  } catch (err) {
    console.error("[cancelRecurringAction] DB error", err);
    return { success: false, error: friendlyPrismaError(err) ?? "Could not cancel the appointment. Please try again." };
  }

  revalidatePath("/calendar");
  return { success: true };
}
