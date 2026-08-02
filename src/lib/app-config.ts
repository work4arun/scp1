import { prisma } from "@/lib/prisma";

const DEFAULT_DASHBOARD_URL = "https://report.rankuhigher.com";

export async function getAppConfig() {
  try {
    const row = await prisma.appConfig.findUnique({ where: { id: "default" } });
    return {
      dashboardUrl: row?.dashboardUrl || DEFAULT_DASHBOARD_URL,
    };
  } catch {
    return { dashboardUrl: DEFAULT_DASHBOARD_URL };
  }
}

export async function saveDashboardUrl(url: string, userId?: string) {
  return prisma.appConfig.upsert({
    where: { id: "default" },
    create: { dashboardUrl: url, updatedById: userId },
    update: { dashboardUrl: url, updatedById: userId },
  });
}
