"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sessionTypeOptions } from "@/lib/attendance/status";
import type { AttendanceSessionType } from "@/types/database";

export function SessionTabs({
  value,
  onChange,
}: {
  value: AttendanceSessionType;
  onChange: (value: AttendanceSessionType) => void;
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as AttendanceSessionType)}>
      <TabsList>
        {sessionTypeOptions.map((option) => (
          <TabsTrigger key={option.value} value={option.value}>
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
