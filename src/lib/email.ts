/**
 * Email notification utility for StartOS.
 *
 * Configure the following environment variables in your .env / .env.local:
 *   SMTP_HOST    — e.g. smtp.office365.com
 *   SMTP_PORT    — e.g. 587
 *   SMTP_SECURE  — "true" for port 465 (SSL), leave empty / "false" for STARTTLS
 *   SMTP_USER    — your sending email address
 *   SMTP_PASS    — your SMTP password / app password
 *   SMTP_FROM    — display name + address, e.g. "StartOS <noreply@example.com>"
 *   NEXT_PUBLIC_APP_URL — base URL (used in email footer only)
 *
 * If SMTP_HOST or SMTP_USER are not set, emails are silently skipped (console.log only).
 */

import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Transporter
// ---------------------------------------------------------------------------

let warnedUnconfigured = false;

function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      console.warn(
        "\n" +
          "════════════════════════════════════════════════════════════════════\n" +
          "  [email] SMTP IS NOT CONFIGURED.\n" +
          "  No task notification emails will be delivered.\n" +
          "  Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM\n" +
          "  in .env (or .env.local) and restart the server.\n" +
          "════════════════════════════════════════════════════════════════════\n"
      );
    }
    return null;
  }
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function humanStatus(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function humanSource(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusBadgeColor(s: string): { bg: string; text: string } {
  switch (s) {
    case "NOT_STARTED":         return { bg: "#e5e7eb", text: "#374151" };
    case "IN_PROGRESS":         return { bg: "#dbeafe", text: "#1d4ed8" };
    case "WAITING_FOR_INPUT":   return { bg: "#fef9c3", text: "#92400e" };
    case "WAITING_FOR_APPROVAL":return { bg: "#ffedd5", text: "#c2410c" };
    case "DELAYED":             return { bg: "#fee2e2", text: "#b91c1c" };
    case "COMPLETED":           return { bg: "#dcfce7", text: "#15803d" };
    case "PARKED":              return { bg: "#ede9fe", text: "#6d28d9" };
    default:                    return { bg: "#e5e7eb", text: "#374151" };
  }
}

function interventionLabel(flag: string): string {
  switch (flag) {
    case "YES":             return "Yes — escalated to Dr. BN";
    case "ONLY_IF_DELAYED": return "Only if delayed";
    default:                return "No";
  }
}

// ---------------------------------------------------------------------------
// Full task notification (primary entry point)
// ---------------------------------------------------------------------------

export type FullTaskNotificationArgs = {
  taskId: string;
  eventType: "assigned" | "updated";
  updatedByName: string;
  changedSummary?: string;
  /** Override recipients — used when notifying a removed owner/sub-owner */
  overrideRecipients?: {
    owner: { email: string; name: string } | null;
    subOwner: { email: string; name: string } | null;
  };
};

/**
 * Fetch full task data and send a rich notification email to the owner and/or
 * sub-owner. The email contains every task field so recipients need no portal
 * access to understand what they are responsible for.
 *
 * Errors are swallowed — email must never break the primary action.
 */
export async function sendFullTaskNotification(args: FullTaskNotificationArgs): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[email] SMTP not configured — skipping notification for task ${args.taskId}`);
    return;
  }

  try {
    // ── Fetch task + relations ──────────────────────────────────────────────
    const task = await prisma.task.findUnique({
      where: { id: args.taskId },
      include: {
        vertical:    true,
        subVertical: true,
        priority:    true,
        ownerRole:   true,
        ownerUser:   true,
        subOwner:    true,
        createdBy:   { select: { name: true } },
        updates: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { author: { select: { name: true } } },
        },
      },
    });

    if (!task) {
      console.warn(`[email] Task ${args.taskId} not found — skipping email`);
      return;
    }

    // ── Determine recipients ────────────────────────────────────────────────
    let ownerRecipient: { email: string; name: string } | null = null;
    let subOwnerRecipient: { email: string; name: string } | null = null;

    if (args.overrideRecipients !== undefined) {
      ownerRecipient    = args.overrideRecipients.owner;
      subOwnerRecipient = args.overrideRecipients.subOwner;
    } else {
      // Prefer the linked system User (ownerUser). If none, fall back to the
      // contact email stored directly on the OwnerRole record — this is the
      // common case when owners are external contacts without portal logins.
      if (task.ownerUser) {
        ownerRecipient = { email: task.ownerUser.email, name: task.ownerUser.name };
      } else if (task.ownerRole?.ownerEmail) {
        ownerRecipient = {
          email: task.ownerRole.ownerEmail,
          name:  task.ownerRole.ownerName || task.ownerRole.name,
        };
      }

      if (task.subOwner) {
        subOwnerRecipient = { email: task.subOwner.email, name: task.subOwner.name };
      }
    }

    const jobs: Promise<void>[] = [];

    if (ownerRecipient) {
      jobs.push(
        sendOne(transporter, {
          to: ownerRecipient,
          role: "Owner",
          task,
          eventType: args.eventType,
          updatedByName: args.updatedByName,
          changedSummary: args.changedSummary,
        })
      );
    }

    if (subOwnerRecipient) {
      jobs.push(
        sendOne(transporter, {
          to: subOwnerRecipient,
          role: "Sub-owner",
          task,
          eventType: args.eventType,
          updatedByName: args.updatedByName,
          changedSummary: args.changedSummary,
        })
      );
    }

    await Promise.all(jobs);
  } catch (err) {
    console.error(`[email] sendFullTaskNotification failed for task ${args.taskId}:`, err);
  }
}

// ---------------------------------------------------------------------------
// Internal: send to a single recipient
// ---------------------------------------------------------------------------

type TaskWithRelations = Awaited<ReturnType<typeof prisma.task.findUnique<{
  where: { id: string };
  include: {
    vertical: true; subVertical: true; priority: true;
    ownerRole: true; ownerUser: true; subOwner: true;
    createdBy: { select: { name: true } };
    updates: { take: number; orderBy: { createdAt: "desc" }; include: { author: { select: { name: true } } } };
  };
}>>>;

async function sendOne(
  transporter: ReturnType<typeof nodemailer.createTransport>,
  opts: {
    to: { email: string; name: string };
    role: "Owner" | "Sub-owner";
    task: NonNullable<TaskWithRelations>;
    eventType: "assigned" | "updated";
    updatedByName: string;
    changedSummary?: string;
  }
): Promise<void> {
  const { to, role, task, eventType, updatedByName, changedSummary } = opts;

  const subject =
    eventType === "assigned"
      ? `[StartOS] Task Assigned (${role}) — ${task.code}: ${task.title}`
      : `[StartOS] Task Update (${role}) — ${task.code}: ${task.title}`;

  const html = buildFullHtml({ to, role, task, eventType, updatedByName, changedSummary });

  try {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transporter.sendMail({ from, to: to.email, subject, html });
    console.log(`[email] Sent "${subject}" → ${to.email}`);
  } catch (err) {
    console.error(`[email] Failed to send to ${to.email}:`, err);
  }
}

// ---------------------------------------------------------------------------
// HTML builder — full task detail, no portal link
// ---------------------------------------------------------------------------

function buildFullHtml(opts: {
  to: { email: string; name: string };
  role: "Owner" | "Sub-owner";
  task: NonNullable<TaskWithRelations>;
  eventType: "assigned" | "updated";
  updatedByName: string;
  changedSummary?: string;
}): string {
  const { to, role, task, eventType, updatedByName, changedSummary } = opts;

  const BRAND   = "#4f46e5";
  const BORDER  = "#e5e7eb";
  const MUTED   = "#6b7280";
  const DARK    = "#111827";
  const MED     = "#374151";

  const statusBadge = statusBadgeColor(task.status);
  const actionLine =
    eventType === "assigned"
      ? `You have been assigned as <strong>${esc(role)}</strong> for the task below.`
      : `The task you are responsible for as <strong>${esc(role)}</strong> has been updated by <strong>${esc(updatedByName)}</strong>.`;

  // ── What changed block ──────────────────────────────────────────────────
  const changedBlock = changedSummary
    ? `
    <tr><td style="padding:0 24px 16px;">
      <div style="background:#f0f9ff;border-left:3px solid ${BRAND};border-radius:4px;padding:12px 16px;font-size:13px;color:${MED};">
        <div style="font-weight:700;margin-bottom:6px;color:${DARK};">What changed</div>
        <div style="white-space:pre-line;">${esc(changedSummary).replace(/\n/g, "<br/>")}</div>
      </div>
    </td></tr>`
    : "";

  // ── Field row helper ───────────────────────────────────────────────────
  function row(label: string, value: string | null | undefined, highlight = false): string {
    if (!value) return "";
    return `
    <tr>
      <td style="padding:6px 0;font-size:12px;color:${MUTED};white-space:nowrap;width:140px;vertical-align:top;">${esc(label)}</td>
      <td style="padding:6px 0 6px 12px;font-size:13px;color:${highlight ? "#b91c1c" : DARK};font-weight:${highlight ? "600" : "400"};vertical-align:top;">${esc(value)}</td>
    </tr>`;
  }

  function rowHtml(label: string, valueHtml: string): string {
    return `
    <tr>
      <td style="padding:6px 0;font-size:12px;color:${MUTED};white-space:nowrap;width:140px;vertical-align:top;">${esc(label)}</td>
      <td style="padding:6px 0 6px 12px;font-size:13px;color:${DARK};vertical-align:top;">${valueHtml}</td>
    </tr>`;
  }

  // ── Section heading ────────────────────────────────────────────────────
  function sectionHead(title: string): string {
    return `
    <tr><td colspan="2" style="padding:16px 0 6px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${MUTED};border-bottom:1px solid ${BORDER};padding-bottom:4px;">${esc(title)}</div>
    </td></tr>`;
  }

  // ── Ownership display ──────────────────────────────────────────────────
  const ownerDisplay = task.ownerUser
    ? `${task.ownerUser.name} &lt;${task.ownerUser.email}&gt;`
    : (task.ownerRole?.ownerName || "—");
  const subOwnerDisplay = task.subOwner
    ? `${task.subOwner.name} &lt;${task.subOwner.email}&gt;`
    : null;

  // ── Timeline entries ──────────────────────────────────────────────────
  const timelineRows = (task.updates || [])
    .map((u) => {
      const noteLines = u.note.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
      const statusTag = u.newStatus
        ? `<span style="display:inline-block;margin-left:6px;padding:1px 7px;border-radius:10px;font-size:10px;font-weight:700;background:${statusBadgeColor(u.newStatus).bg};color:${statusBadgeColor(u.newStatus).text};">${humanStatus(u.newStatus)}</span>`
        : "";
      return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid ${BORDER};vertical-align:top;">
          <div style="font-size:12px;color:${MUTED};margin-bottom:4px;">
            <strong style="color:${MED};">${esc(u.author.name)}</strong>
            &nbsp;·&nbsp;${fmtDateTime(u.createdAt)}
            ${statusTag}
          </div>
          <div style="font-size:13px;color:${DARK};line-height:1.5;">${noteLines}</div>
        </td>
      </tr>`;
    })
    .join("");

  const timelineBlock = task.updates && task.updates.length > 0
    ? `
    <tr><td style="padding:0 24px 16px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${MUTED};border-bottom:1px solid ${BORDER};padding-bottom:4px;margin-bottom:0;">Recent Activity (latest first)</div>
      <table width="100%" cellpadding="0" cellspacing="0">${timelineRows}</table>
    </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:28px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

      <!-- ── Header ── -->
      <tr>
        <td style="background:${BRAND};padding:20px 24px;">
          <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:.5px;">StartOS</span>
          <span style="color:#c7d2fe;font-size:13px;margin-left:10px;">Strategic Control Portal</span>
        </td>
      </tr>

      <!-- ── Greeting ── -->
      <tr><td style="padding:22px 24px 6px;font-size:15px;color:${DARK};">
        Hi <strong>${esc(to.name)}</strong>,
      </td></tr>
      <tr><td style="padding:0 24px 18px;font-size:14px;color:${MED};line-height:1.6;">
        ${actionLine}
      </td></tr>

      <!-- ── What changed ── -->
      ${changedBlock}

      <!-- ── Task header card ── -->
      <tr><td style="padding:0 24px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:8px;overflow:hidden;">
          <tr style="background:#f9fafb;">
            <td style="padding:10px 16px;border-bottom:1px solid ${BORDER};">
              <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:${MUTED};">${esc(task.code)}</span>
              <span style="margin:0 6px;color:${BORDER};">·</span>
              <span style="font-size:11px;color:${MUTED};">${esc(task.vertical.name)}${task.subVertical ? " / " + esc(task.subVertical.name) : ""}</span>
              <span style="float:right;display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:${statusBadge.bg};color:${statusBadge.text};">${humanStatus(task.status)}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 16px 6px;font-size:17px;font-weight:700;color:${DARK};line-height:1.4;">${esc(task.title)}</td>
          </tr>
          ${task.description ? `<tr><td style="padding:4px 16px 14px;font-size:14px;color:${MED};line-height:1.6;">${esc(task.description)}</td></tr>` : ""}

          <!-- ── Detail table ── -->
          <tr><td style="padding:0 16px 16px;">
            <table width="100%" cellpadding="0" cellspacing="0">

              ${sectionHead("Priority & Schedule")}
              ${row("Priority", task.priority ? `${task.priority.code} — ${task.priority.label}` : null)}
              ${row("Deadline", fmtDate(task.deadline))}
              ${task.slaDueAt ? row("SLA Due", fmtDate(task.slaDueAt)) : ""}
              ${row("Frequency", task.frequency)}
              ${row("Source", humanSource(task.source))}

              ${sectionHead("Ownership")}
              ${row("Owner role", task.ownerRole?.name || null)}
              ${rowHtml("Owner", ownerDisplay)}
              ${subOwnerDisplay ? rowHtml("Sub-owner", subOwnerDisplay) : ""}

              ${(task.expectedOutput || task.supportNeeded || task.nextAction) ? sectionHead("Work Details") : ""}
              ${row("Expected output", task.expectedOutput)}
              ${row("Support needed", task.supportNeeded)}
              ${row("Next action", task.nextAction)}

              ${task.status === "DELAYED" && task.delayReason ? sectionHead("Delay Information") : ""}
              ${task.status === "DELAYED" && task.delayReason ? row("Delay reason", task.delayReason, true) : ""}

              ${task.intervention !== "NO" ? sectionHead("Escalation") : ""}
              ${task.intervention !== "NO" ? row("Dr. BN intervention", interventionLabel(task.intervention)) : ""}

              ${sectionHead("Record")}
              ${row("Created by", task.createdBy?.name || null)}
              ${row("Created on", fmtDate(task.createdAt))}
              ${row("Last updated", fmtDate(task.lastUpdateAt || task.updatedAt))}

            </table>
          </td></tr>
        </table>
      </td></tr>

      <!-- ── Timeline ── -->
      ${timelineBlock}

      <!-- ── Footer ── -->
      <tr><td style="padding:16px 24px;background:#f9fafb;border-top:1px solid ${BORDER};font-size:11px;color:${MUTED};line-height:1.6;">
        This is an automated notification from <strong>StartOS — Strategic Control Portal</strong>.<br/>
        You are receiving this because you are listed as <strong>${esc(role)}</strong> on this task.<br/>
        If you have questions, please contact your Strategic Manager directly.
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Timer alarm email (unchanged)
// ---------------------------------------------------------------------------

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
      <div style="font-size:22px;font-weight:700;margin-top:4px">⏰ Time's up — ${esc(subjectLabel)}</div>
    </div>
    <div style="padding:22px">
      <p style="margin:0 0 14px;font-size:15px;color:#111827">Hi ${esc(args.recipientName)},</p>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#374151">
        Your ${args.durationMinutes}-minute timer has just ended.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:6px 0 18px">
        <tr><td style="padding:6px 0;color:#6b7280;font-size:12px">Set at</td><td style="padding:6px 0;font-size:13px;font-weight:600">${fmtIst(args.setAt)} IST</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:12px">Fired at</td><td style="padding:6px 0;font-size:13px;font-weight:600">${fmtIst(args.firedAt)} IST</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:12px">Duration</td><td style="padding:6px 0;font-size:13px;font-weight:600">${args.durationMinutes} minute${args.durationMinutes === 1 ? "" : "s"}</td></tr>
      </table>
    </div>
    <div style="padding:14px 22px;background:#f9fafb;color:#6b7280;font-size:11px;border-top:1px solid #e5e7eb">
      You're receiving this because you set a personal timer in the StartOS master dashboard.
    </div>
  </div>
</body></html>`;

  try {
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transporter.sendMail({ from: fromAddress, to: args.to, subject, html });
    console.log(`[email] Timer alarm sent to ${args.to} ("${subjectLabel}")`);
  } catch (err) {
    console.error(`[email] Failed to send timer alarm to ${args.to}:`, err);
  }
}
