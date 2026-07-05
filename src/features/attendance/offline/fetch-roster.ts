import type { RosterStudent, SessionLockInfo } from "@/features/attendance/queries";
import type { AttendanceSessionType, AttendanceStatus } from "@/types/database";

import { rosterCacheKey } from "./db";
import { cacheRoster, getCachedRoster } from "./queue";

export type FetchedRoster = {
  students: RosterStudent[];
  recordByStudentId: Record<string, { status: AttendanceStatus; notes: string | null }>;
  lock: SessionLockInfo;
  offline: boolean;
};

type RosterApiResponse = {
  students: RosterStudent[];
  records: { studentId: string; status: AttendanceStatus; notes: string | null }[];
  lock: SessionLockInfo;
};

// Always goes through the JSON API route (not RSC props) so the same call
// path can populate/refresh the roster-cache IndexedDB store and fall back
// to it when the fetch fails (offline or flaky connection).
export async function fetchRosterWithOfflineFallback(
  classId: string,
  sessionDate: string,
  sessionType: AttendanceSessionType,
): Promise<FetchedRoster> {
  try {
    const res = await fetch(
      `/api/attendance/roster?classId=${classId}&sessionDate=${sessionDate}&sessionType=${sessionType}`,
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Failed to load roster" }));
      throw new Error(body.error ?? "Failed to load roster");
    }

    const data: RosterApiResponse = await res.json();
    const recordByStudentId = Object.fromEntries(
      data.records.map((r) => [r.studentId, { status: r.status, notes: r.notes }]),
    );

    await cacheRoster({
      key: rosterCacheKey(classId, sessionDate, sessionType),
      classId,
      sessionDate,
      sessionType,
      students: data.students,
      recordByStudentId,
      isLocked: data.lock.isLocked,
      effectiveLockAt: data.lock.effectiveLockAt,
      cachedAt: new Date().toISOString(),
    });

    return { students: data.students, recordByStudentId, lock: data.lock, offline: false };
  } catch (error) {
    const cached = await getCachedRoster(classId, sessionDate, sessionType);
    if (cached) {
      return {
        students: cached.students,
        recordByStudentId: cached.recordByStudentId,
        lock: {
          sessionId: null,
          effectiveLockAt: cached.effectiveLockAt,
          isLocked: cached.isLocked,
          submittedAt: null,
          lockedOverride: null,
        },
        offline: true,
      };
    }
    throw error;
  }
}
