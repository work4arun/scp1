import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/notifications?since=ISO  → returns unseen notifications (newest first)
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user.id) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const sinceStr = url.searchParams.get("since");
  const since = sinceStr ? new Date(sinceStr) : null;

  try {
    const items = await prisma.notification.findMany({
      where: {
        recipientId: session.user.id,
        seenAt: null,
        ...(since ? { createdAt: { gt: since } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    return Response.json({
      items: items.map((n) => ({
        id: n.id, kind: n.kind, title: n.title, body: n.body,
        link: n.link, refId: n.refId, createdAt: n.createdAt.toISOString(),
      })),
      now: new Date().toISOString(),
    });
  } catch {
    // Table not migrated yet
    return Response.json({ items: [], now: new Date().toISOString(), notReady: true });
  }
}
