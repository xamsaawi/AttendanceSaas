import type { ColumnDef } from "@/lib/import-export/types";
import type { ClassAttendanceSummaryRow } from "@/features/reports/queries";
import type { AuditLogRow } from "@/features/audit/queries";

export type AttendanceSummaryExportRow = {
  className: string;
  marked: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  halfDay: number;
  attendancePercentage: string;
};

export const attendanceSummaryExportColumns: ColumnDef<AttendanceSummaryExportRow>[] = [
  { header: "Class", key: "className" },
  { header: "Marked", key: "marked" },
  { header: "Present", key: "present" },
  { header: "Absent", key: "absent" },
  { header: "Late", key: "late" },
  { header: "Excused", key: "excused" },
  { header: "Half day", key: "halfDay" },
  { header: "Attendance %", key: "attendancePercentage" },
];

export function toAttendanceSummaryExportRows(
  rows: ClassAttendanceSummaryRow[],
): AttendanceSummaryExportRow[] {
  return rows.map((row) => ({
    className: row.classLabel,
    marked: row.markedCount,
    present: row.presentCount,
    absent: row.absentCount,
    late: row.lateCount,
    excused: row.excusedCount,
    halfDay: row.halfDayCount,
    attendancePercentage: row.attendancePercentage == null ? "—" : `${row.attendancePercentage}%`,
  }));
}

export type AuditLogExportRow = {
  createdAt: string;
  actorName: string;
  action: string;
  entityType: string;
};

export const auditLogExportColumns: ColumnDef<AuditLogExportRow>[] = [
  { header: "Date", key: "createdAt" },
  { header: "Actor", key: "actorName" },
  { header: "Action", key: "action" },
  { header: "Entity", key: "entityType" },
];

export function toAuditLogExportRows(
  rows: AuditLogRow[],
  actorNameById: Map<string, string>,
): AuditLogExportRow[] {
  return rows.map((row) => ({
    createdAt: row.createdAt,
    actorName: row.actorId ? (actorNameById.get(row.actorId) ?? "Unknown") : "System",
    action: row.action,
    entityType: row.entityType,
  }));
}
