/**
 * SMTP configuration — stored in DB so admins can change it at runtime.
 * Falls back to SMTP_* environment variables if no DB record exists.
 */
import { prisma } from "@/lib/prisma";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    const row = await prisma.smtpConfig.findUnique({ where: { id: "default" } });
    if (!row) return null;
    return {
      host: row.host,
      port: row.port,
      secure: row.secure,
      user: row.user,
      pass: row.pass,
      from: row.from,
    };
  } catch {
    return null;
  }
}

export async function saveSmtpConfig(data: SmtpConfig & { updatedBy: string }): Promise<void> {
  await prisma.smtpConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      host: data.host,
      port: data.port,
      secure: data.secure,
      user: data.user,
      pass: data.pass,
      from: data.from,
      updatedBy: data.updatedBy,
    },
    update: {
      host: data.host,
      port: data.port,
      secure: data.secure,
      user: data.user,
      pass: data.pass,
      from: data.from,
      updatedBy: data.updatedBy,
    },
  });
}