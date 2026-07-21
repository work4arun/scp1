import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageTasks } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";

export default async function EmailsPage() {
  const session = await auth();
  if (!canManageTasks(session?.user.systemRole)) redirect("/");

  const logs = await prisma.emailLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      recipient: true,
      subject: true,
      status: true,
      errorMsg: true,
      createdAt: true,
      task: { select: { code: true, title: true } },
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Email Logs"
        description="Recent email notification history sent via Nodemailer SMTP."
      />

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No email logs yet. Emails are sent when tasks are created and assigned to teams/members.</p>
      ) : (
        <>
        {/* Mobile — one card per log; a 5-column table forces sideways scrolling on a phone. */}
        <div className="space-y-2 md:hidden">
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border border-border p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="font-mono text-[11px] break-all">{log.recipient}</span>
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    log.status === "sent"
                      ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400"
                      : log.status === "pending"
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400"
                      : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400"
                  }`}
                >
                  {log.status}
                </span>
              </div>
              <div className="mt-1 break-words font-medium">{log.subject}</div>
              {log.errorMsg && <p className="mt-0.5 text-[10px] text-destructive break-words">{log.errorMsg}</p>}
              <div className="mt-1 break-words text-[11px] text-muted-foreground">
                {log.task ? `${log.task.code} — ${log.task.title}` : "—"}
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
          <table className="w-full text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left">Recipient</th>
                <th className="px-3 py-2 text-left">Subject</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Task</th>
                <th className="px-3 py-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-[11px]">{log.recipient}</td>
                  <td className="px-3 py-2 max-w-[200px] truncate">{log.subject}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        log.status === "sent"
                          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400"
                          : log.status === "pending"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400"
                          : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400"
                      }`}
                    >
                      {log.status}
                    </span>
                    {log.errorMsg && <p className="text-[10px] text-destructive mt-0.5">{log.errorMsg}</p>}
                  </td>
                  <td className="px-3 py-2">{log.task ? `${log.task.code} — ${log.task.title}` : "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}