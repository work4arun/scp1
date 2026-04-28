import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/notifications/seen  body: { ids: string[] | "all" }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user.id) return new Response("Unauthorized", { status: 401 });

  let payload: { ids?: string[] | "all" } = {};
  try { payload = await req.json(); } catch {}

  try {
    if (payload.ids === "all") {
      await prisma.notification.updateMany({
        where: { recipientId: session.user.id, seenAt: null },
        data: { seenAt: new Date() },
      });
    } else if (Array.isArray(payload.ids) && payload.ids.length > 0) {
      await prisma.notification.updateMany({
        where: { id: { in: payload.ids }, recipientId: session.user.id },
        data: { seenAt: new Date() },
      });
    }
  } catch { /* not migrated */ }

  return Response.json({ ok: true });
}
