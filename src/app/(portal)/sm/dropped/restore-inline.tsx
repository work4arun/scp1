"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { restoreTaskAction } from "../tasks/[id]/edit/actions";

export function RestoreInline({ taskId, restorable }: { taskId: string; restorable: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (!restorable) return null;
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(async () => {
        try {
          await restoreTaskAction(taskId);
          router.refresh();
        } catch (e) {
          alert((e as Error).message);
        }
      })}
    >
      <RotateCcw className="h-4 w-4" /> Restore
    </Button>
  );
}
