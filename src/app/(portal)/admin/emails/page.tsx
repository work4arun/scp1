import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canConfigureSystem } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { EmailsPageClient } from "./listmonk-config-form";

export default async function AdminEmailsPage() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole)) redirect("/");

  const listmonkUrl = process.env.LISTMONK_URL || "http://localhost:9000";
  const config = await prisma.listmonkConfig.findUnique({ where: { id: "default" } });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Email Campaigns" description="Manage email templates and Listmonk configuration." />

      <EmailsPageClient
        listmonkUrl={listmonkUrl}
        savedConfig={
          config
            ? { baseUrl: config.baseUrl ?? "", userId: config.userId, apiKey: config.apiKey, templateId: config.templateId }
            : null
        }
      />
    </div>
  );
}