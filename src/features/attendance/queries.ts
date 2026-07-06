import type { SchoolCalendarConfig } from "@/lib/attendance/calendar";
import { getCurrentMembership, type CurrentMembership } from "@/features/organizations/queries";
import { createClient } from "@/lib/supabase/server";
import type { AttendanceSessionType, AttendanceStatus } from "@/types/database";

export async function getSchoolCalendarConfig(organizationId: string): Promise<SchoolCalendarConfig> {
  const supabase = await createClient();
  const [settingsRes, holidaysRes] = await Promise.all([
    supabase
      .from("school_settings")
      .select("working_days")
      .eq("organization_id", organizationId)
      .single(),
    supabase.from("holidays").select("start_date, end_date").eq("organization_id", organizationId),
  ]);

  if (settingsRes.error) throw settingsRes.error;
  if (holidaysRes.error) throw holidaysRes.error;

  return {
    workingDays: settingsRes.data.working_days,
    holidays: holidaysRes.data,
  };
}

export type HomeroomClassOption = { id: string; label: string };

export async function getHomeroomClassesForUser(
  organizationId: string,
  userId: string,
): Promise<HomeroomClassOption[]> {
  const supabase = await createClient();
  const { data: classes, error } = await supabase
    .from("classes")
    .select("id, grade_id, section_id")
    .eq("organization_id", organizationId)
    .eq("homeroom_teacher_id", userId);

  if (error) throw error;
  if (!classes.length) return [];

  const [{ data: grades }, { data: sections }] = await Promise.all([
    supabase.from("grades").select("id, name").eq("organization_id", organizationId),
    supabase.from("sections").select("id, name").eq("organization_id", organizationId),
  ]);

  const gradeNameById = new Map((grades ?? []).map((g) => [g.id, g.name]));
  const sectionNameById = new Map((sections ?? []).map((s) => [s.id, s.name]));

  return classes.map((c) => ({
    id: c.id,
    label: `${gradeNameById.get(c.grade_id) ?? "?"} - ${sectionNameById.get(c.section_id) ?? "?"}`,
  }));
}

export type ClassAttendanceAccess = {
  membership: CurrentMembership;
  isAdmin: boolean;
  isTeacherOfClass: boolean;
} | null;

export async function requireClassAttendanceAccess(classId: string): Promise<ClassAttendanceAccess> {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const isAdmin = membership.role === "owner" || membership.role === "admin";

  const supabase = await createClient();

  // Scope every role to classes within the caller's own organization — without
  // this check an admin/owner could pass another school's classId and pass
  // the isAdmin branch unchecked (confirmed exploitable: forged cross-org
  // attendance_sessions/records via markAttendanceCore).
  const { data: cls } = await supabase
    .from("classes")
    .select("id, homeroom_teacher_id")
    .eq("id", classId)
    .eq("organization_id", membership.organizationId)
    .maybeSingle();

  if (!cls) return null;

  if (isAdmin) return { membership, isAdmin, isTeacherOfClass: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return { membership, isAdmin: false, isTeacherOfClass: cls.homeroom_teacher_id === user.id };
}

export type RosterStudent = {
  id: string;
  fullName: string;
  admissionNumber: string;
  photoUrl: string | null;
};

export type RosterRecord = { status: AttendanceStatus; notes: string | null };

export type SessionLockInfo = {
  sessionId: string | null;
  effectiveLockAt: string;
  isLocked: boolean;
  submittedAt: string | null;
  lockedOverride: boolean | null;
};

export type ClassRosterForSession = {
  students: RosterStudent[];
  recordByStudentId: Map<string, RosterRecord>;
  lock: SessionLockInfo;
};

export async function getClassRosterForSession(
  classId: string,
  sessionDate: string,
  sessionType: AttendanceSessionType,
): Promise<ClassRosterForSession> {
  const supabase = await createClient();

  const [studentsRes, sessionRes] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, admission_number, photo_url")
      .eq("class_id", classId)
      .eq("status", "active")
      .order("first_name", { ascending: true }),
    supabase
      .from("attendance_sessions")
      .select("*")
      .eq("class_id", classId)
      .eq("session_date", sessionDate)
      .eq("session_type", sessionType)
      .maybeSingle(),
  ]);

  if (studentsRes.error) throw studentsRes.error;
  if (sessionRes.error) throw sessionRes.error;

  const session = sessionRes.data;

  let records: { student_id: string; status: AttendanceStatus; notes: string | null }[] = [];
  if (session) {
    const { data, error } = await supabase
      .from("attendance_records")
      .select("student_id, status, notes")
      .eq("session_id", session.id);
    if (error) throw error;
    records = data;
  }

  const { data: lockAt, error: lockError } = await supabase.rpc("attendance_lock_at", {
    p_class_id: classId,
    p_session_date: sessionDate,
    p_session_type: sessionType,
  });
  if (lockError) throw lockError;

  const isLocked = session?.locked_override ?? new Date() > new Date(lockAt as unknown as string);

  return {
    students: studentsRes.data.map((s) => ({
      id: s.id,
      // full_name is a generated column over two NOT NULL fields, so it's
      // never actually null — Supabase's codegen just can't express that.
      fullName: s.full_name!,
      admissionNumber: s.admission_number,
      photoUrl: s.photo_url,
    })),
    recordByStudentId: new Map(
      records.map((r) => [r.student_id, { status: r.status, notes: r.notes }]),
    ),
    lock: {
      sessionId: session?.id ?? null,
      effectiveLockAt: lockAt as unknown as string,
      isLocked,
      submittedAt: session?.submitted_at ?? null,
      lockedOverride: session?.locked_override ?? null,
    },
  };
}

export type AdminOverviewStatus = "not_started" | "in_progress" | "complete";

export type AdminOverviewRow = {
  classId: string;
  gradeId: string;
  sectionId: string;
  homeroomTeacherId: string | null;
  sessionId: string | null;
  totalStudents: number;
  markedCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  halfDayCount: number;
  isLocked: boolean;
  effectiveLockAt: string | null;
  submittedAt: string | null;
  status: AdminOverviewStatus;
};

export async function getAdminDailyOverview(
  organizationId: string,
  sessionDate: string,
  sessionType: AttendanceSessionType,
): Promise<AdminOverviewRow[]> {
  const supabase = await createClient();

  const [classesRes, overviewRes, studentsRes] = await Promise.all([
    supabase
      .from("classes")
      .select("id, grade_id, section_id, homeroom_teacher_id")
      .eq("organization_id", organizationId),
    supabase
      .from("attendance_session_overview")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("session_date", sessionDate)
      .eq("session_type", sessionType),
    supabase
      .from("students")
      .select("class_id")
      .eq("organization_id", organizationId)
      .eq("status", "active"),
  ]);

  if (classesRes.error) throw classesRes.error;
  if (overviewRes.error) throw overviewRes.error;
  if (studentsRes.error) throw studentsRes.error;

  const overviewByClassId = new Map(overviewRes.data.map((o) => [o.class_id, o]));

  const studentCountByClassId = new Map<string, number>();
  for (const s of studentsRes.data) {
    if (!s.class_id) continue;
    studentCountByClassId.set(s.class_id, (studentCountByClassId.get(s.class_id) ?? 0) + 1);
  }

  return classesRes.data.map((c) => {
    const overview = overviewByClassId.get(c.id);
    const totalStudents = overview?.total_students ?? studentCountByClassId.get(c.id) ?? 0;
    const markedCount = overview?.marked_count ?? 0;
    const status: AdminOverviewStatus =
      markedCount === 0
        ? "not_started"
        : markedCount >= totalStudents && totalStudents > 0
          ? "complete"
          : "in_progress";

    return {
      classId: c.id,
      gradeId: c.grade_id,
      sectionId: c.section_id,
      homeroomTeacherId: c.homeroom_teacher_id,
      sessionId: overview?.session_id ?? null,
      totalStudents,
      markedCount,
      presentCount: overview?.present_count ?? 0,
      absentCount: overview?.absent_count ?? 0,
      lateCount: overview?.late_count ?? 0,
      excusedCount: overview?.excused_count ?? 0,
      halfDayCount: overview?.half_day_count ?? 0,
      isLocked: overview?.is_locked ?? false,
      effectiveLockAt: overview?.effective_lock_at ?? null,
      submittedAt: overview?.submitted_at ?? null,
      status,
    };
  });
}

export type AttendanceHistoryRow = {
  sessionId: string;
  sessionDate: string;
  sessionType: AttendanceSessionType;
  status: AttendanceStatus;
  notes: string | null;
};

export async function getStudentAttendanceHistory(
  studentId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<AttendanceHistoryRow[]> {
  const supabase = await createClient();

  const { data: records, error } = await supabase
    .from("attendance_records")
    .select("session_id, status, notes")
    .eq("student_id", studentId);

  if (error) throw error;
  if (!records.length) return [];

  let sessionsQuery = supabase
    .from("attendance_sessions")
    .select("id, session_date, session_type")
    .in(
      "id",
      records.map((r) => r.session_id),
    );
  if (dateFrom) sessionsQuery = sessionsQuery.gte("session_date", dateFrom);
  if (dateTo) sessionsQuery = sessionsQuery.lte("session_date", dateTo);

  const { data: sessions, error: sessionsError } = await sessionsQuery.order("session_date", {
    ascending: false,
  });
  if (sessionsError) throw sessionsError;

  const recordBySessionId = new Map(records.map((r) => [r.session_id, r]));

  return sessions.map((s) => {
    const record = recordBySessionId.get(s.id)!;
    return {
      sessionId: s.id,
      sessionDate: s.session_date,
      sessionType: s.session_type,
      status: record.status,
      notes: record.notes,
    };
  });
}

export type ClassAttendanceHistoryRow = {
  sessionId: string;
  sessionDate: string;
  sessionType: AttendanceSessionType;
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  notes: string | null;
};

export async function getClassAttendanceHistory(
  classId: string,
  dateFrom: string,
  dateTo: string,
  sessionType?: AttendanceSessionType,
): Promise<ClassAttendanceHistoryRow[]> {
  const supabase = await createClient();

  let sessionsQuery = supabase
    .from("attendance_sessions")
    .select("id, session_date, session_type")
    .eq("class_id", classId)
    .gte("session_date", dateFrom)
    .lte("session_date", dateTo);
  if (sessionType) sessionsQuery = sessionsQuery.eq("session_type", sessionType);

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
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, full_name")
    .in("id", studentIds);
  if (studentsError) throw studentsError;

  const studentNameById = new Map(students.map((s) => [s.id, s.full_name]));
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  return records
    .map((r) => {
      const session = sessionById.get(r.session_id)!;
      return {
        sessionId: r.session_id,
        sessionDate: session.session_date,
        sessionType: session.session_type,
        studentId: r.student_id,
        studentName: studentNameById.get(r.student_id) ?? "Unknown",
        status: r.status,
        notes: r.notes,
      };
    })
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
}

export type StudentAttendanceStats = {
  totalMarked: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  halfDayCount: number;
  attendancePercentage: number | null;
};

export async function getStudentAttendanceStats(
  studentId: string,
): Promise<StudentAttendanceStats | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_attendance_stats")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    // These are plain COUNT(...) aggregates, always non-null in practice —
    // Postgres views just don't carry NOT NULL metadata for computed columns.
    totalMarked: data.total_marked ?? 0,
    presentCount: data.present_count ?? 0,
    absentCount: data.absent_count ?? 0,
    lateCount: data.late_count ?? 0,
    excusedCount: data.excused_count ?? 0,
    halfDayCount: data.half_day_count ?? 0,
    attendancePercentage: data.attendance_percentage,
  };
}

export type CalendarMarkRow = {
  sessionDate: string;
  sessionType: AttendanceSessionType;
  markedCount: number;
  totalStudents: number;
  isLocked: boolean;
};

export async function getClassAttendanceCalendarMarks(
  classId: string,
  monthStart: string,
  monthEnd: string,
): Promise<CalendarMarkRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance_session_overview")
    .select("session_date, session_type, marked_count, total_students, is_locked")
    .eq("class_id", classId)
    .gte("session_date", monthStart)
    .lte("session_date", monthEnd);

  if (error) throw error;

  // These columns are all guaranteed non-null by the underlying SQL (either
  // sourced from a NOT NULL column or a COUNT(...)/function call) — Postgres
  // views just don't carry that metadata for Supabase's codegen to see.
  return data.map((row) => ({
    sessionDate: row.session_date!,
    sessionType: row.session_type!,
    markedCount: row.marked_count ?? 0,
    totalStudents: row.total_students ?? 0,
    isLocked: row.is_locked ?? false,
  }));
}
