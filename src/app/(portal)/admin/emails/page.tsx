import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canConfigureSystem } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { SmtpConfigForm } from "./smtp-config-form";

export default async function AdminEmailsPage() {
  const session = await auth();
  if (!canConfigureSystem(session?.user.systemRole)) redirect("/");

  const row = await prisma.smtpConfig.findUnique({ where: { id: "default" } });

  const savedConfig = row
    ? {
        host: row.host,
        port: row.port,
        secure: row.secure,
        user: row.user,
        from: row.from,
      }
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Email Configuration"
        description="Configure the SMTP server used for sending all emails (task assignments, notifications, etc.)."
      />
      <SmtpConfigForm savedConfig={savedConfig} />
    </div>
  );
}