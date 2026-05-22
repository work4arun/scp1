"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Repeat } from "lucide-react";
import { createMrmAction } from "./actions";

export function CreateMrmButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline" size="sm" disabled={pending}
      onClick={() => {
        if (!confirm("Create the standing weekly MRM with the SM (every Monday 10:00–11:00)?")) return;
        startTransition(async () => {
          const r = await createMrmAction();
          if (!r.success) { alert(r.error); return; }
          router.refresh();
        });
      }}
    >
      <Repeat className="h-4 w-4" /> Set up weekly MRM
    </Button>
  );
}
