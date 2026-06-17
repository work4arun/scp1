/**
 * Listmonk API client for transactional emails.
 * Docs: https://listmonk.app/docs/apis/apis/
 *
 * Base URL, credentials, and template selection are read from DB config.
 */

export interface LmConfig {
  baseUrl: string;
  userId: string;
  apiKey: string;
  templateId: number | null;
}

function resolveApiUrl(_config: LmConfig): string {
  // Always use Docker-internal hostname from inside the app container.
  // Avoids DNS resolution issues and SSL problems with public domains.
  return "http://listmonk:9000";
}

function getAuthHeader(config: LmConfig): string {
  const credentials = Buffer.from(`${config.userId}:${config.apiKey}`).toString("base64");
  return `Basic ${credentials}`;
}

/** Send a transactional email via Listmonk's /api/tx endpoint */
export async function sendTxEmail(
  config: LmConfig,
  params: {
    subscriberEmail: string;
    subscriberName?: string;
    taskTitle: string;
    priority: string;
    deadline?: string;       // ISO datetime string
    expectedOutput?: string;
    drBnIntervention?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = getAuthHeader(config);
    const templateId = config.templateId || 1;

    // Build data object — omit keys that are undefined/null/empty
    const txData: Record<string, any> = {
      task_title: params.taskTitle,
      priority: params.priority,
    };
    if (params.deadline) txData.deadline = params.deadline;
    if (params.expectedOutput) txData.expected_output = params.expectedOutput;
    if (params.drBnIntervention !== undefined) txData.dr_bn_intervention = params.drBnIntervention;

    const payload = {
      subscriber_email: params.subscriberEmail,
      subscriber_name: params.subscriberName || params.subscriberEmail,
      subscriber_mode: "fallback",
      template_id: templateId,
      data: txData,
    };

    const res = await fetch(`${resolveApiUrl(config)}/api/tx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Listmonk error ${res.status}: ${errText}` };
    }

    const json = await res.json();
    // Expected success: { "data": true }
    if (json?.data === true) {
      return { success: true };
    }
    return { success: false, error: `Unexpected response: ${JSON.stringify(json)}` };
  } catch (err: any) {
    return { success: false, error: err?.message || "Unknown error contacting Listmonk" };
  }
}

/** Fetch templates from Listmonk. Works in both browser and server. */
export async function fetchTemplates(baseUrl: string, userId: string, apiKey: string) {
  try {
    const auth = globalThis.btoa(`${userId}:${apiKey}`);
    const res = await fetch(`${baseUrl}/templates`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const data = json?.data;
    // API returns data as either an array or a single object wrapped in an array
    const list = Array.isArray(data) ? data : data ? [data] : [];
    return list.map((t: any) => ({ id: t.id, name: t.name }));
  } catch {
    return [];
  }
}
