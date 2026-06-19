import nodemailer from "nodemailer";
import type { TransportOptions } from "nodemailer";

// ── Types ────────────────────────────────────────────────────────────────────

export interface Attachment {
  filename: string;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
}

export interface SendEmailParams {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Attachment[];
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  accepted?: string[];
  rejected?: string[];
  error?: string;
}

// ── Transporter ──────────────────────────────────────────────────────────────

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env"
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      // Office365 / Exchange Online often requires TLS
      ciphers: "SSLv3",
      rejectUnauthorized: true,
    },
  } as TransportOptions);
}

// ── Send ─────────────────────────────────────────────────────────────────────

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const transporter = getTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || "";

    const mailOptions: nodemailer.SendMailOptions = {
      from,
      to: Array.isArray(params.to) ? params.to.join(", ") : params.to,
      subject: params.subject,
    };

    if (params.cc) {
      mailOptions.cc = Array.isArray(params.cc) ? params.cc.join(", ") : params.cc;
    }

    if (params.bcc) {
      mailOptions.bcc = Array.isArray(params.bcc)
        ? params.bcc.join(", ")
        : params.bcc;
    }

    if (params.html) mailOptions.html = params.html;
    if (params.text) mailOptions.text = params.text;
    if (params.replyTo) mailOptions.replyTo = params.replyTo;

    if (params.attachments && params.attachments.length > 0) {
      mailOptions.attachments = params.attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        path: att.path,
        contentType: att.contentType,
      }));
    }

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
      accepted: info.accepted as string[],
      rejected: info.rejected as string[],
    };
  } catch (error: any) {
    console.error("[sendEmail] Error:", error.message || error);
    return {
      success: false,
      error: error.message || "Unknown email error",
    };
  }
}