import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canConfigureSystem } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminEmailsPage() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole)) redirect("/");

  const listmonkUrl = process.env.LISTMONK_URL || "http://localhost:9000";

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Email Campaigns" description="Manage email templates, subscribers, and campaigns via Listmonk." />

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <CardTitle>Listmonk Admin</CardTitle>
            <Badge variant="info">Embedded</Badge>
          </div>
          <a href={listmonkUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline">
            Open in new tab ↗
          </a>
        </CardHeader>
        <CardContent className="p-0">
          <iframe
            src={listmonkUrl}
            className="w-full border-0"
            style={{ height: "calc(100vh - 220px)", minHeight: "600px" }}
            title="Listmonk Email Manager"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </CardContent>
      </Card>
    </div>
  );
}