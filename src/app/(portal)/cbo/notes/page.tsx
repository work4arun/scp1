import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isCBO } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { NotesPanel } from "./notes-panel";

export default async function CboNotes() {
  const session = await auth();
  if (!isCBO(session?.user.systemRole)) redirect("/");

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Notes"
        description="Send a typed message or a voice note. Every active Strategic Manager is notified instantly."
      />

      <Card>
        <CardContent className="p-4 sm:p-5">
          <NotesPanel />
        </CardContent>
      </Card>
    </div>
  );
}
