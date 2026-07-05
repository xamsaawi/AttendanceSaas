"use client";

import { format } from "date-fns";
import { useMemo } from "react";

import { Calendar } from "@/components/ui/calendar";
import type { CalendarMarkRow } from "@/features/attendance/queries";
import { isHoliday, isSchoolDay, type SchoolCalendarConfig } from "@/lib/attendance/calendar";

type DayStatus = "complete" | "partial" | "none";

function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function AttendanceCalendar({
  calendarConfig,
  marks,
  onSelectDate,
}: {
  calendarConfig: SchoolCalendarConfig;
  marks: CalendarMarkRow[];
  onSelectDate?: (date: string) => void;
}) {
  const statusByDate = useMemo(() => {
    const byDate = new Map<string, CalendarMarkRow[]>();
    for (const mark of marks) {
      const list = byDate.get(mark.sessionDate) ?? [];
      list.push(mark);
      byDate.set(mark.sessionDate, list);
    }

    const result = new Map<string, DayStatus>();
    for (const [date, dayMarks] of byDate) {
      const allComplete = dayMarks.every(
        (m) => m.totalStudents > 0 && m.markedCount >= m.totalStudents,
      );
      const anyMarked = dayMarks.some((m) => m.markedCount > 0);
      result.set(date, allComplete ? "complete" : anyMarked ? "partial" : "none");
    }
    return result;
  }, [marks]);

  return (
    <Calendar
      mode="single"
      onSelect={(date) => {
        if (date) onSelectDate?.(dateKey(date));
      }}
      modifiers={{
        holiday: (date) => isHoliday(dateKey(date), calendarConfig.holidays),
        nonWorking: (date) => !isSchoolDay(dateKey(date), calendarConfig),
        complete: (date) => statusByDate.get(dateKey(date)) === "complete",
        partial: (date) => statusByDate.get(dateKey(date)) === "partial",
      }}
      modifiersClassNames={{
        holiday: "text-destructive",
        nonWorking: "opacity-40",
        complete: "bg-emerald-500/15",
        partial: "bg-amber-500/15",
      }}
    />
  );
}
