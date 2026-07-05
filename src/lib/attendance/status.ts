import type { AttendanceSessionType, AttendanceStatus } from "@/types/database";

export const attendanceStatusOptions: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "excused", label: "Excused" },
  { value: "half_day", label: "Half day" },
];

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
  half_day: "Half day",
};

// Tailwind classes for status badges/chips — kept as a single map so every
// component (roster table, history table, admin overview) renders the same
// color for the same status.
export const attendanceStatusColors: Record<AttendanceStatus, string> = {
  present: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  absent: "bg-red-500/15 text-red-600 dark:text-red-400",
  late: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  excused: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  half_day: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
};

export const sessionTypeLabels: Record<AttendanceSessionType, string> = {
  before_break: "Before Break",
  after_break: "After Break",
};

export const sessionTypeOptions: { value: AttendanceSessionType; label: string }[] = [
  { value: "before_break", label: "Before Break" },
  { value: "after_break", label: "After Break" },
];
