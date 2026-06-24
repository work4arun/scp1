"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";

type VerticalOption = { id: string; code: string; name: string };

export function TaskVerticalFilter({
  current,
  status,
  priority,
  verticals,
}: {
  current: string;
  status: string;
  priority: string;
  verticals: VerticalOption[];
}) {
  const router = useRouter();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    const params = new URLSearchParams();
    if (val) params.set("vertical", val);
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    const qs = params.toString();
    router.push(qs ? `/cbo?${qs}` : "/cbo");
  }

  return (
    <Select value={current} onChange={onChange} className="h-8 text-xs w-40">
      <option value="">All verticals</option>
      {verticals.map((v) => (
        <option key={v.id} value={v.id}>
          {v.code} — {v.name}
        </option>
      ))}
    </Select>
  );
}