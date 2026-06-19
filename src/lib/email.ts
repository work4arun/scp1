import nodemailer from "nodemailer";
import type { TransportOptions } from "nodemailer";
import { getSmtpConfig } from "@/lib/smtp-config";

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

// ── Resolve SMTP config (DB first, env fallback) ─────────────────────────────

async function resolveSmtpConfig() {
  // Try DB config first
  try {
    const dbConfig = await getSmtpConfig();
    if (dbConfig && dbConfig.host && dbConfig.user && dbConfig.pass) {
      return {
        host: dbConfig.host,
        port: dbConfig.port ?? 587,
        secure: dbConfig.secure ?? false,
        user: dbConfig.user,
        pass: dbConfig.pass,
        from: dbConfig.from || dbConfig.user,
      };
    }
  } catch {
    // DB may not be available (e.g., during build); fall through to env
  }

  // Fallback to environment variables
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || "";

  if (!host || !user || !pass) {
    return null;
  }

  return { host, port, secure, user, pass, from };
}

// ── Send ─────────────────────────────────────────────────────────────────────

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const config = await resolveSmtpConfig();
    if (!config) {
      return { success: false, error: "SMTP not configured. Set SMTP_* env vars or configure via Admin → Email." };
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    } as TransportOptions);

    const mailOptions: nodemailer.SendMailOptions = {
      from: config.from,
      to: Array.isArray(params.to) ? params.to.join(", ") : params.to,
      subject: params.subject,
    };

    if (params.cc) {
      mailOptions.cc = Array.isArray(params.cc) ? params.cc.join(", ") : params.cc;
    }
    if (params.bcc) {
      mailOptions.bcc = Array.isArray(params.bcc) ? params.bcc.join(", ") : params.bcc;
    }
    if (params.html) mailOptions.html = params.html;
    if (params.text) mailOptions.text = params.text;
    if (params.replyTo) mailOptions.replyTo = params.replyTo;
    if (params.attachments?.length) {
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
    return { success: false, error: error.message || "Unknown email error" };
  }
}