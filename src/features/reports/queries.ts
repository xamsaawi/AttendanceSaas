import { listClassOptions } from "@/features/classes/queries";
import { createClient } from "@/lib/supabase/server";
import type { ReportRunStatus } from "@/types/database";

export type ReportRunRow = {
  id: string;
  reportType: string;
  runDate: string;
  status: ReportRunStatus;
  summary: Record<string, unknown>;
  createdAt: string;
};

export async function listReportRuns(organizationId: string, limit = 20): Promise<ReportRunRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_runs")
    .select("id, report_type, run_date, status, summary, created_at")
    .eq("organization_id", organizationId)
    .order("run_date", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    reportType: row.report_type,
    runDate: row.run_date,
    status: row.status,
    summary: row.summary,
    createdAt: row.created_at,
  }));
}

export type ClassAttendanceComparisonRow = {
  classId: string;
  classLabel: string;
  attendancePercentage: number | null;
  totalMarked: number;
};

export async function getClassAttendanceComparison(
  organizationId: string,
): Promise<ClassAttendanceComparisonRow[]> {
  const supabase = await createClient();
  const [{ data: stats, error }, classOptions] = await Promise.all([
    supabase
      .from("class_attendance_stats")
      .select("class_id, attendance_percentage, total_marked")
      .eq("organization_id", organizationId),
    listClassOptions(organizationId),
  ]);
  if (error) throw error;

  const labelById = new Map(classOptions.map((c) => [c.id, c.label]));

  return (stats ?? [])
    .filter((row) => row.total_marked > 0)
    .map((row) => ({
      classId: row.class_id,
      classLabel: labelById.get(row.class_id) ?? "Unknown class",
      attendancePercentage: row.attendance_percentage,
      totalMarked: row.total_marked,
    }))
    .sort((a, b) => a.classLabel.localeCompare(b.classLabel));
}

export type AttendanceTrendPoint = {
  date: string;
  presentRate: number | null;
  markedCount: number;
};

export async function getAttendanceTrend(
  organizationId: string,
  dateFrom: string,
  dateTo: string,
): Promise<AttendanceTrendPoint[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance_session_overview")
    .select("session_date, marked_count, present_count, late_count, half_day_count, excused_count")
    .eq("organization_id", organizationId)
    .gte("session_date", dateFrom)
    .lte("session_date", dateTo);
  if (error) throw error;

  const byDate = new Map<
    string,
    { marked: number; present: number; late: number; halfDay: number; excused: number }
  >();
  for (const row of data ?? []) {
    const bucket = byDate.get(row.session_date) ?? {
      marked: 0,
      present: 0,
      late: 0,
      halfDay: 0,
      excused: 0,
    };
    bucket.marked += row.marked_count;
    bucket.present += row.present_count;
    bucket.late += row.late_count;
    bucket.halfDay += row.half_day_count;
    bucket.excused += row.excused_count;
    byDate.set(row.session_date, bucket);
  }

  return Array.from(byDate.entries())
    .map(([date, b]) => {
      const denominator = b.marked - b.excused;
      const presentRate =
        denominator > 0
          ? Math.round((10 * (100 * (b.present + b.late + 0.5 * b.halfDay))) / denominator) / 10
          : null;
      return { date, presentRate, markedCount: b.marked };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type LowAttendanceStudent = {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  attendancePercentage: number | null;
};

export async function getLowAttendanceStudents(
  organizationId: string,
  thresholdPercent = 75,
): Promise<LowAttendanceStudent[]> {
  const supabase = await createClient();
  const { data: stats, error } = await supabase
    .from("student_attendance_stats")
    .select("student_id, attendance_percentage")
    .eq("organization_id", organizationId)
    .not("attendance_percentage", "is", null)
    .lt("attendance_percentage", thresholdPercent);
  if (error) throw error;
  if (!stats?.length) return [];

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, full_name, admission_number")
    .in(
      "id",
      stats.map((s) => s.student_id),
    );
  if (studentsError) throw studentsError;

  const studentById = new Map(students.map((s) => [s.id, s]));

  return stats
    .map((row) => ({
      studentId: row.student_id,
      studentName: studentById.get(row.student_id)?.full_name ?? "Unknown",
      admissionNumber: studentById.get(row.student_id)?.admission_number ?? "",
      attendancePercentage: row.attendance_percentage,
    }))
    .sort((a, b) => (a.attendancePercentage ?? 0) - (b.attendancePercentage ?? 0));
}

export type EnrollmentBreakdown = {
  byStatus: { status: string; count: number }[];
  totalActive: number;
};

export async function getEnrollmentBreakdown(organizationId: string): Promise<EnrollmentBreakdown> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("status")
    .eq("organization_id", organizationId);
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }

  return {
    byStatus: Array.from(counts.entries()).map(([status, count]) => ({ status, count })),
    totalActive: counts.get("active") ?? 0,
  };
}

export type ClassAttendanceSummaryRow = {
  classLabel: string;
  markedCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  halfDayCount: number;
  attendancePercentage: number | null;
};

export async function getClassAttendanceSummaryForRange(
  organizationId: string,
  dateFrom: string,
  dateTo: string,
): Promise<ClassAttendanceSummaryRow[]> {
  const supabase = await createClient();
  const [{ data, error }, classOptions] = await Promise.all([
    supabase
      .from("attendance_session_overview")
      .select(
        "class_id, marked_count, present_count, absent_count, late_count, excused_count, half_day_count",
      )
      .eq("organization_id", organizationId)
      .gte("session_date", dateFrom)
      .lte("session_date", dateTo),
    listClassOptions(organizationId),
  ]);
  if (error) throw error;

  const labelById = new Map(classOptions.map((c) => [c.id, c.label]));
  const byClass = new Map<
    string,
    { marked: number; present: number; absent: number; late: number; excused: number; halfDay: number }
  >();

  for (const row of data ?? []) {
    const bucket = byClass.get(row.class_id) ?? {
      marked: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      halfDay: 0,
    };
    bucket.marked += row.marked_count;
    bucket.present += row.present_count;
    bucket.absent += row.absent_count;
    bucket.late += row.late_count;
    bucket.excused += row.excused_count;
    bucket.halfDay += row.half_day_count;
    byClass.set(row.class_id, bucket);
  }

  return Array.from(byClass.entries())
    .map(([classId, b]) => {
      const denominator = b.marked - b.excused;
      return {
        classLabel: labelById.get(classId) ?? "Unknown class",
        markedCount: b.marked,
        presentCount: b.present,
        absentCount: b.absent,
        lateCount: b.late,
        excusedCount: b.excused,
        halfDayCount: b.halfDay,
        attendancePercentage:
          denominator > 0
            ? Math.round((10 * (100 * (b.present + b.late + 0.5 * b.halfDay))) / denominator) / 10
            : null,
      };
    })
    .sort((a, b) => a.classLabel.localeCompare(b.classLabel));
}

export type AttendanceSummary = {
  markedCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  halfDayCount: number;
  attendancePercentage: number | null;
};

export async function getAttendanceSummary(
  organizationId: string,
  dateFrom: string,
  dateTo: string,
): Promise<AttendanceSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance_session_overview")
    .select("marked_count, present_count, absent_count, late_count, excused_count, half_day_count")
    .eq("organization_id", organizationId)
    .gte("session_date", dateFrom)
    .lte("session_date", dateTo);
  if (error) throw error;

  const totals = (data ?? []).reduce(
    (acc, row) => ({
      marked: acc.marked + row.marked_count,
      present: acc.present + row.present_count,
      absent: acc.absent + row.absent_count,
      late: acc.late + row.late_count,
      excused: acc.excused + row.excused_count,
      halfDay: acc.halfDay + row.half_day_count,
    }),
    { marked: 0, present: 0, absent: 0, late: 0, excused: 0, halfDay: 0 },
  );

  const denominator = totals.marked - totals.excused;

  return {
    markedCount: totals.marked,
    presentCount: totals.present,
    absentCount: totals.absent,
    lateCount: totals.late,
    excusedCount: totals.excused,
    halfDayCount: totals.halfDay,
    attendancePercentage:
      denominator > 0
        ? Math.round((10 * (100 * (totals.present + totals.late + 0.5 * totals.halfDay))) / denominator) / 10
        : null,
  };
}
