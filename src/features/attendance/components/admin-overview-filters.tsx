"use client";

import { useRouter } from "next/navigation";

import { DatePickerField } from "@/features/attendance/components/date-picker-field";
import { SessionTabs } from "@/features/attendance/components/session-tabs";
import type { AttendanceSessionType } from "@/types/database";

export function AdminOverviewFilters({
  date,
  sessionType,
}: {
  date: string;
  sessionType: AttendanceSessionType;
}) {
  const router = useRouter();

  function pushParams(next: { date?: string; session?: AttendanceSessionType }) {
    const params = new URLSearchParams();
    params.set("tab", "admin");
    params.set("date", next.date ?? date);
    params.set("session", next.session ?? sessionType);
    router.push(`/dashboard/attendance?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DatePickerField value={date} onChange={(d) => pushParams({ date: d })} />
      <SessionTabs value={sessionType} onChange={(s) => pushParams({ session: s })} />
    </div>
  );
}
