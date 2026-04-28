import { prisma } from "@/lib/prisma";

type NotifyArgs = {
  kind: string;
  title: string;
  body?: string;
  link?: string;
  refId?: string;
  senderId?: string;
};

/**
 * Send an in-app notification to every active CBO user.
 * Failures are swallowed — notifications must never break the primary action.
 */
export async function notifyAllCBO(args: NotifyArgs) {
  try {
    const cbos = await prisma.user.findMany({
      where: { systemRole: "CBO", active: true },
      select: { id: true },
    });
    if (cbos.length === 0) return;
    await prisma.notification.createMany({
      data: cbos.map((c) => ({
        recipientId: c.id,
        senderId: args.senderId ?? null,
        kind: args.kind,
        title: args.title,
        body: args.body ?? null,
        link: args.link ?? null,
        refId: args.refId ?? null,
      })),
    });
  } catch {
    // Notification table may not be migrated yet — silently skip.
  }
}

export async function notifyUser(recipientId: string, args: NotifyArgs) {
  try {
    await prisma.notification.create({
      data: {
        recipientId,
        senderId: args.senderId ?? null,
        kind: args.kind,
        title: args.title,
        body: args.body ?? null,
        link: args.link ?? null,
        refId: args.refId ?? null,
      },
    });
  } catch { /* swallow */ }
}
