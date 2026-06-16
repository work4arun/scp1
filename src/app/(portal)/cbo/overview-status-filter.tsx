"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";

export function TaskStatusFilter({
  current,
  priority,
}: {
  current: string;
  priority: string;
}) {
  const router = useRouter();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    const params = new URLSearchParams();
    if (val) params.set("status", val);
    if (priority) params.set("priority", priority);
    router.push(val || priority ? `/cbo?${params.toString()}` : "/cbo");
  }

  return (
    <Select
      value={current}
      onChange={onChange}
      className="h-8 text-xs w-36"
    >
      <option value="">All statuses</option>
      <option value="NOT_STARTED">Not started</option>
      <option value="IN_PROGRESS">In progress</option>
      <option value="WAITING_FOR_INPUT">Waiting input</option>
      <option value="WAITING_FOR_APPROVAL">Waiting approval</option>
      <option value="DELAYED">Delayed</option>
      <option value="COMPLETED">Completed</option>
      <option value="PARKED">Parked</option>
    </Select>
  );
}