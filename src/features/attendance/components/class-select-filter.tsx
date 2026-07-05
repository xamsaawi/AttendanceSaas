"use client";

import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ClassSelectFilter({
  tab,
  classId,
  classOptions,
}: {
  tab: string;
  classId: string;
  classOptions: { id: string; label: string }[];
}) {
  const router = useRouter();

  return (
    <Select
      value={classId}
      onValueChange={(value) => router.push(`/dashboard/attendance?tab=${tab}&classId=${value}`)}
    >
      <SelectTrigger size="sm" className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {classOptions.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
