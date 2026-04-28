import { Badge } from "@/components/ui/badge";
import type { TaskStatus } from "@prisma/client";

const STATUS_LABEL: Record<TaskStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  WAITING_FOR_INPUT: "Waiting Input",
  WAITING_FOR_APPROVAL: "Waiting Approval",
  DELAYED: "Delayed",
  COMPLETED: "Completed",
  PARKED: "Parked",
  DROPPED: "Dropped",
};

const STATUS_VARIANT: Record<TaskStatus, "default" | "secondary" | "destructive" | "success" | "warning" | "info" | "muted"> = {
  NOT_STARTED: "secondary",
  IN_PROGRESS: "info",
  WAITING_FOR_INPUT: "warning",
  WAITING_FOR_APPROVAL: "warning",
  DELAYED: "destructive",
  COMPLETED: "success",
  PARKED: "muted",
  DROPPED: "muted",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function PriorityBadge({ code, color }: { code: string; color?: string }) {
  // P1=red, P2=warning, P3=info, P4=muted by default
  const variantByCode: Record<string, "destructive" | "warning" | "info" | "muted"> = {
    P1: "destructive",
    P2: "warning",
    P3: "info",
    P4: "muted",
  };
  const v = variantByCode[code] ?? "default";
  return (
    <Badge variant={v} style={color ? { color, backgroundColor: `${color}1a` } : undefined}>
      {code}
    </Badge>
  );
}

export const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = (Object.keys(STATUS_LABEL) as TaskStatus[]).map(
  (s) => ({ value: s, label: STATUS_LABEL[s] })
);
