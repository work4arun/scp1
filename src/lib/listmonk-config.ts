"use server";

import { prisma } from "@/lib/prisma";

export type LmConfig = {
  baseUrl: string;
  userId: string;
  apiKey: string;
  templateId: number | null;
};

/** Read full Listmonk config from DB singleton */
export async function getListmonkConfig(): Promise<LmConfig | null> {
  try {
    const config = await prisma.listmonkConfig.findUnique({ where: { id: "default" } });
    if (!config || !config.baseUrl || !config.userId || !config.apiKey) return null;
    return {
      baseUrl: config.baseUrl,
      userId: config.userId,
      apiKey: config.apiKey,
      templateId: config.templateId ?? null,
    };
  } catch {
    return null;
  }
}

/** Fetch templates from Listmonk */
export async function fetchListmonkTemplates(baseUrl: string, userId: string, apiKey: string) {
  try {
    const auth = Buffer.from(`${userId}:${apiKey}`).toString("base64");
    const res = await fetch(`${baseUrl}/templates`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.data || []).map((t: any) => ({ id: t.id, name: t.name }));
  } catch {
    return [];
  }
}