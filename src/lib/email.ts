/**
 * Email notification utility for StartOS.
 *
 * Configure the following environment variables in your .env.local:
 *   SMTP_HOST    — e.g. smtp.gmail.com
 *   SMTP_PORT    — e.g. 587
 *   SMTP_SECURE  — "true" for port 465 (SSL), leave empty / "false" for STARTTLS
 *   SMTP_USER    — your sending email address
 *   SMTP_PASS    — your SMTP password / app password
 *   SMTP_FROM    — display name + address, e.g. "StartOS <noreply@example.com>"
 *   NEXT_PUBLIC_APP_URL — base URL for task links, e.g. https://your-domain.com
 *
 * If SMTP_HOST or SMTP_USER are not set, emails are silently skipped (console.log only).
 */

import nodemailer from "nodemailer";

function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export type TaskEmailArgs = {
  to: string;
  recipientName: string;
  taskCode: string;
  taskTitle: string;
  taskId: string;
  verticalName: string;
  priorityLabel: string;
  deadline: string | null;
  assignedAs: "Owner" | "Sub-owner";
  eventType: "assigned" | "updated";
  updatedByName: string;
  changedSummary?: string; // e.g. "Status → IN PROGRESS, Deadline → 2026-05-01"
};

function buildSubject(args: TaskEmailArgs): string {
  if (args.eventType === "assigned") {
    return `[StartOS] You have been assigned as ${args.assignedAs} — ${args.taskCode}: ${args.taskTitle}`;
  }
  return `[StartOS] Task update (${args.assignedAs}) — ${args.taskCode}: ${args.taskTitle}`;
}

/** Escape user-supplied strings before embedding in HTML email. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml(args: TaskEmailArgs): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const taskLink = `${appUrl}/sm/tasks/${args.taskId}`;

  const headerColor = "#4f46e5";
  const actionLabel = args.eventType === "assigned"
    ? `You have been assigned as <strong>${esc(args.assignedAs)}</strong> for the following task.`
    : `The task you are <strong>${esc(args.assignedAs)}</strong> for has been updated by <strong>${esc(args.updatedByName)}</strong>.`;

  const changesBlock = args.changedSummary
    ? `
    <tr>
      <td style="padding:12px 24px 0;">
        <div style="background:#f3f4f6;border-radius:6px;padding:12px 16px;font-size:13px;color:#374151;">
          <strong>What changed:</strong><br/>
          <span style="white-space:pre-line;">${esc(args.changedSummary).replace(/\n/g, "<br/>")}</span>
        </div>
      </td>
    </tr>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:ui-sans-serif,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
          <!-- Header -->
          <tr>
            <td style="background:${headerColor};padding:20px 24px;">
              <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:.5px;">StartOS</span>
              <span style="color:#c7d2fe;font-size:13px;margin-left:8px;">Strategic Control Portal</span>
            </td>
          </tr>
          <!-- Greeting -->
          <tr>
            <td style="padding:24px 24px 12px;font-size:15px;color:#111827;">
              Hi <strong>${esc(args.recipientName)}</strong>,
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 16px;font-size:14px;color:#374151;">
              ${actionLabel}
            </td>
          </tr>
          <!-- Task card -->
          <tr>
            <td style="padding:0 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
                <tr style="background:#f9fafb;">
                  <td style="padding:10px 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;border-bottom:1px solid #e5e7eb;">
                    ${esc(args.taskCode)} · ${esc(args.verticalName)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;font-size:15px;font-weight:600;color:#111827;">
                    ${esc(args.taskTitle)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 16px 14px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right:16px;font-size:12px;color:#6b7280;">
                          <span style="font-weight:600;">Priority:</span> ${esc(args.priorityLabel)}
                        </td>
                        <td style="font-size:12px;color:#6b7280;">
                          <span style="font-weight:600;">Deadline:</span> ${args.deadline ? esc(args.deadline) : "Not set"}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 16px 16px;">
                    <span style="display:inline-block;padding:6px 12px;background:${headerColor};color:#fff;border-radius:4px;font-size:12px;font-weight:600;text-decoration:none;">
                      <a href="${taskLink}" style="color:#fff;text-decoration:none;">View Task →</a>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${changesBlock}
          <!-- Footer -->
          <tr>
            <td style="padding:24px;font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;margin-top:16px;">
              This is an automated notification from StartOS. If you have questions, contact your strategic manager.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send a task assignment or update notification email.
 * Errors are swallowed — email must never break the primary action.
 */
export async function sendTaskEmail(args: TaskEmailArgs): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(
      `[email] SMTP not configured — skipping email to ${args.to} (${args.eventType} · ${args.taskCode})`
    );
    return;
  }

  try {
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transporter.sendMail({
      from: fromAddress,
      to: args.to,
      subject: buildSubject(args),
      html: buildHtml(args),
    });
    console.log(`[email] Sent "${buildSubject(args)}" to ${args.to}`);
  } catch (err) {
    console.error(`[email] Failed to send to ${args.to}:`, err);
  }
}

/**
 * Send task emails to both owner and sub-owner in parallel.
 * Pass null for either to skip.
 */
export async function sendTaskEmailToOwners(args: {
  owner: { email: string; name: string } | null;
  subOwner: { email: string; name: string } | null;
  taskCode: string;
  taskTitle: string;
  taskId: string;
  verticalName: string;
  priorityLabel: string;
  deadline: string | null;
  eventType: "assigned" | "updated";
  updatedByName: string;
  changedSummary?: string;
}): Promise<void> {
  const jobs: Promise<void>[] = [];

  if (args.owner) {
    jobs.push(
      sendTaskEmail({
        to: args.owner.email,
        recipientName: args.owner.name,
        assignedAs: "Owner",
        taskCode: args.taskCode,
        taskTitle: args.taskTitle,
        taskId: args.taskId,
        verticalName: args.verticalName,
        priorityLabel: args.priorityLabel,
        deadline: args.deadline,
        eventType: args.eventType,
        updatedByName: args.updatedByName,
        changedSummary: args.changedSummary,
      })
    );
  }

  if (args.subOwner) {
    jobs.push(
      sendTaskEmail({
        to: args.subOwner.email,
        recipientName: args.subOwner.name,
        assignedAs: "Sub-owner",
        taskCode: args.taskCode,
        taskTitle: args.taskTitle,
        taskId: args.taskId,
        verticalName: args.verticalName,
        priorityLabel: args.priorityLabel,
        deadline: args.deadline,
        eventType: args.eventType,
        updatedByName: args.updatedByName,
        changedSummary: args.changedSummary,
      })
    );
  }

  await Promise.all(jobs);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Timer Alarm Email
// ─────────────────────────────────────────────────────────────────────────────
//  Fired when a personal countdown timer set on the master dashboard reaches
//  zero. Errors are logged and swallowed — alarm misses must not crash the
//  request that triggered them.
// ─────────────────────────────────────────────────────────────────────────────

export type TimerAlarmArgs = {
  to: string;
  recipientName: string;
  label: string | null;
  setAt: Date;
  firedAt: Date;
  durationMinutes: number;
};

function fmtIst(d: Date): string {
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export async function sendTimerAlarmEmail(args: TimerAlarmArgs): Promise<void> {
  const transporter = getTransporter();
  const subjectLabel = args.label ? args.label : "Timer";
  const subject = `⏰ ${subjectLabel} — time's up`;

  if (!transporter) {
    console.log(`[email] SMTP not configured — skipping timer alarm to ${args.to} (${subject})`);
    return;
  }

  const html = `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#f5f7fb;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;padding:22px 22px 18px">
      <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:.9">StartOS Timer</div>
      <div style="font-size:22px;font-weight:700;margin-top:4px">⏰ Time's up — ${escapeHtml(subjectLabel)}</div>
    </div>
    <div style="padding:22px">
      <p style="margin:0 0 14px;font-size:15px;color:#111827">Hi ${escapeHtml(args.recipientName)},</p>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#374151">
        Your ${args.durationMinutes}-minute timer has just ended. Time to wrap up the meeting and move to the next item.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:6px 0 18px">
        <tr><td style="padding:6px 0;color:#6b7280;font-size:12px">Set at</td><td style="padding:6px 0;font-size:13px;font-weight:600">${fmtIst(args.setAt)} IST</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:12px">Fired at</td><td style="padding:6px 0;font-size:13px;font-weight:600">${fmtIst(args.firedAt)} IST</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:12px">Duration</td><td style="padding:6px 0;font-size:13px;font-weight:600">${args.durationMinutes} minute${args.durationMinutes === 1 ? "" : "s"}</td></tr>
      </table>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || ""}/cbo" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;font-size:14px;font-weight:600">Open Master Dashboard →</a>
    </div>
    <div style="padding:14px 22px;background:#f9fafb;color:#6b7280;font-size:11px;border-top:1px solid #e5e7eb">
      You're receiving this because you set a personal timer in the StartOS master dashboard.
    </div>
  </div>
</body></html>`;

  try {
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transporter.sendMail({
      from: fromAddress,
      to: args.to,
      subject,
      html,
    });
    console.log(`[email] Timer alarm sent to ${args.to} ("${subjectLabel}")`);
  } catch (err) {
    console.error(`[email] Failed to send timer alarm to ${args.to}:`, err);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
