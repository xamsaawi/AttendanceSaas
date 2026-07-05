import { NextResponse } from "next/server";

import { getClassRosterForSession, requireClassAttendanceAccess } from "@/features/attendance/queries";
import type { AttendanceSessionType } from "@/types/database";

// Used by the client roster component so it can populate/refresh the
// roster-cache IndexedDB store and fall back to cache on fetch failure.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId");
  const sessionDate = url.searchParams.get("sessionDate");
  const sessionType = url.searchParams.get("sessionType") as AttendanceSessionType | null;

  if (!classId || !sessionDate || !sessionType) {
    return NextResponse.json(
      { error: "Missing classId, sessionDate, or sessionType" },
      { status: 400 },
    );
  }

  const access = await requireClassAttendanceAccess(classId);
  if (!access || (!access.isAdmin && !access.isTeacherOfClass)) {
    return NextResponse.json(
      { error: "You don't have permission to view this class's attendance" },
      { status: 403 },
    );
  }

  const roster = await getClassRosterForSession(classId, sessionDate, sessionType);

  return NextResponse.json({
    students: roster.students,
    records: Array.from(roster.recordByStudentId.entries()).map(([studentId, record]) => ({
      studentId,
      ...record,
    })),
    lock: roster.lock,
  });
}
