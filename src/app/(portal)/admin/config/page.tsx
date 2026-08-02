import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canConfigureSystem } from "@/lib/rbac";
import { getAppConfig } from "@/lib/app-config";
import { PageHeader } from "@/components/page-header";
import { ConfigForm } from "./config-form";

export default async function AdminConfigPage() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole)) redirect("/");

  const config = await getAppConfig();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Configuration"
        description="Manage application-wide settings such as the Dashboard URL for SM and CBO roles."
      />
      <ConfigForm dashboardUrl={config.dashboardUrl} />
    </div>
  );
}
