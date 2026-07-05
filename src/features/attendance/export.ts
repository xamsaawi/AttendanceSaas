import { listClassOptions } from "@/features/classes/queries";
import { attendanceStatusLabels, sessionTypeLabels } from "@/lib/attendance/status";
import type { ColumnDef } from "@/lib/import-export/types";
import { createClient } from "@/lib/supabase/server";
import type { AttendanceSessionType } from "@/types/database";

export type AttendanceExportRow = {
  sessionDate: string;
  sessionType: string;
  className: string;
  studentName: string;
  admissionNumber: string;
  status: string;
  notes: string;
};

export const attendanceExportColumns: ColumnDef<AttendanceExportRow>[] = [
  { header: "Date", key: "sessionDate" },
  { header: "Session", key: "sessionType" },
  { header: "Class", key: "className" },
  { header: "Student", key: "studentName" },
  { header: "Admission Number", key: "admissionNumber" },
  { header: "Status", key: "status" },
  { header: "Notes", key: "notes" },
];

export type AttendanceExportFilters = {
  dateFrom: string;
  dateTo: string;
  classId?: string;
  sessionType?: AttendanceSessionType;
};

export async function listAttendanceRecordsForExport(
  organizationId: string,
  filters: AttendanceExportFilters,
): Promise<AttendanceExportRow[]> {
  const supabase = await createClient();

  let sessionsQuery = supabase
    .from("attendance_sessions")
    .select("id, class_id, session_date, session_type")
    .eq("organization_id", organizationId)
    .gte("session_date", filters.dateFrom)
    .lte("session_date", filters.dateTo);
  if (filters.classId) sessionsQuery = sessionsQuery.eq("class_id", filters.classId);
  if (filters.sessionType) sessionsQuery = sessionsQuery.eq("session_type", filters.sessionType);

  const { data: sessions, error } = await sessionsQuery.order("session_date", { ascending: false });
  if (error) throw error;
  if (!sessions.length) return [];

  const { data: records, error: recordsError } = await supabase
    .from("attendance_records")
    .select("session_id, student_id, status, notes")
    .in(
      "session_id",
      sessions.map((s) => s.id),
    );
  if (recordsError) throw recordsError;

  const studentIds = Array.from(new Set(records.map((r) => r.student_id)));
  const [{ data: students, error: studentsError }, classOptions] = await Promise.all([
    supabase.from("students").select("id, full_name, admission_number").in("id", studentIds),
    listClassOptions(organizationId),
  ]);
  if (studentsError) throw studentsError;

  const classLabelById = new Map(classOptions.map((c) => [c.id, c.label]));
  const studentById = new Map(students.map((s) => [s.id, s]));
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  return records
    .map((r) => {
      const session = sessionById.get(r.session_id)!;
      const student = studentById.get(r.student_id);
      return {
        sessionDate: session.session_date,
        sessionType: sessionTypeLabels[session.session_type],
        className: classLabelById.get(session.class_id) ?? "",
        studentName: student?.full_name ?? "",
        admissionNumber: student?.admission_number ?? "",
        status: attendanceStatusLabels[r.status],
        notes: r.notes ?? "",
      };
    })
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
}
