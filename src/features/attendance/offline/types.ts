import type { MarkAttendanceInput } from "@/lib/validations/attendance";
import type { AttendanceSessionType, AttendanceStatus } from "@/types/database";

export type CachedRosterStudent = {
  id: string;
  fullName: string;
  admissionNumber: string;
  photoUrl: string | null;
};

export type CachedRoster = {
  key: string;
  classId: string;
  sessionDate: string;
  sessionType: AttendanceSessionType;
  students: CachedRosterStudent[];
  recordByStudentId: Record<string, { status: AttendanceStatus; notes: string | null }>;
  isLocked: boolean;
  effectiveLockAt: string;
  cachedAt: string;
};

export type QueuedMutation = {
  id?: number;
  payload: MarkAttendanceInput;
  createdAt: string;
  attempts: number;
  lastError?: string;
};

export type FailedMutation = {
  id?: number;
  payload: MarkAttendanceInput;
  reason: string;
  failedAt: string;
};
