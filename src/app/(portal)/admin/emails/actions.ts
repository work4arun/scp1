"use server";

import { auth } from "@/lib/auth";
import { canConfigureSystem } from "@/lib/rbac";

const FORBIDDEN_MSG = "Your session is no longer valid or you don't have permission.";

export async function fetchTemplatesAction(baseUrl: string, userId: string, apiKey: string) {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole)) {
    return { error: FORBIDDEN_MSG, templates: [] };
  }

  try {
    // Always use internal Docker hostname from inside the app container
    const authHeader = Buffer.from(`${userId}:${apiKey}`).toString("base64");
    const res = await fetch(`http://listmonk:9000/api/templates`, {
      headers: { Authorization: `Basic ${authHeader}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      return { error: `Listmonk error ${res.status}: ${errText.slice(0, 200)}`, templates: [] };
    }

    const json = await res.json();
    const data = json?.data;
    const list = Array.isArray(data) ? data : data ? [data] : [];

    // Show all templates, not just TX type
    const templates = list.map((t: any) => ({ id: t.id, name: t.name || `Template #${t.id}` }));

    return { templates };
  } catch (err: any) {
    return { error: err?.message || "Failed to reach Listmonk", templates: [] };
  }
}