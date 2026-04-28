import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canConfigureSystem } from "@/lib/rbac";
import { buildIcs } from "@/lib/calendar";

// GET /api/calendar/[userId].ics
// Returns a personal calendar feed. The user can subscribe in
// Apple Calendar / Google Calendar / Outlook by URL. Anyone authenticated
// can subscribe to their own; Super Admin can subscribe to anyone's.
export async function GET(req: Request, { params }: { params: { userId: string } }) {
  const session = await auth();
  if (!session?.user.id) return new Response("Unauthorized", { status: 401 });

  const targetUserId = params.userId.replace(/\.ics$/i, "");
  if (session.user.id !== targetUserId && !canConfigureSystem(session.user.systemRole)) {
    return new Response("Forbidden", { status: 403 });
  }

  let appts: Array<{
    id: string; title: string; description: string | null; agenda: string | null; location: string | null;
    startAt: Date; endAt: Date; status: string;
    organizer: { name: string; email: string }; attendee: { name: string; email: string };
  }> = [];
  try {
    appts = await prisma.appointment.findMany({
      where: {
        OR: [{ organizerId: targetUserId }, { attendeeId: targetUserId }],
        status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
      },
      orderBy: { startAt: "asc" },
      include: {
        organizer: { select: { name: true, email: true } },
        attendee: { select: { name: true, email: true } },
      },
      take: 500,
    });
  } catch {
    // table not yet migrated
    return new Response("Calendar not yet initialized. Run prisma db push.", { status: 200 });
  }

  const ics = buildIcs(
    appts.map((a) => ({
      uid: a.id,
      title: `${a.status === "PENDING" ? "[Pending] " : ""}${a.title}`,
      description: [a.agenda ? `Agenda:\n${a.agenda}` : null, a.description].filter(Boolean).join("\n\n"),
      location: a.location,
      start: a.startAt,
      end: a.endAt,
      organizerName: a.organizer.name,
      organizerEmail: a.organizer.email,
      attendeeName: a.attendee.name,
      attendeeEmail: a.attendee.email,
    }))
  );

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="scp-calendar.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
