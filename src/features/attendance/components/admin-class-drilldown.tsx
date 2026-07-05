"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  lockAttendanceSession,
  markAttendanceCore,
  resetAttendanceSessionLock,
  unlockAttendanceSession,
} from "@/features/attendance/actions";
import { LockBadge } from "@/features/attendance/components/lock-badge";
import { RosterTable, type RosterEditValue } from "@/features/attendance/components/roster-table";
import type { RosterStudent, SessionLockInfo } from "@/features/attendance/queries";
import type { AttendanceSessionType, AttendanceStatus } from "@/types/database";

export function AdminClassDrilldown({
  classId,
  sessionDate,
  sessionType,
  students,
  initialValues,
  lock,
}: {
  classId: string;
  sessionDate: string;
  sessionType: AttendanceSessionType;
  students: RosterStudent[];
  initialValues: Record<string, RosterEditValue>;
  lock: SessionLockInfo;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLockBusy, setIsLockBusy] = useState(false);

  function handleChange(studentId: string, patch: Partial<RosterEditValue>) {
    setValues((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] ?? { status: "present" as AttendanceStatus, notes: "" }),
        ...patch,
      },
    }));
  }

  function handleMarkAllPresent() {
    setValues((prev) => {
      const next = { ...prev };
      for (const student of students) {
        next[student.id] = { status: "present", notes: prev[student.id]?.notes ?? "" };
      }
      return next;
    });
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    const result = await markAttendanceCore({
      classId,
      sessionDate,
      sessionType,
      records: students.map((s) => ({
        studentId: s.id,
        status: values[s.id]?.status ?? "present",
        notes: values[s.id]?.notes || undefined,
      })),
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Attendance saved");
    router.refresh();
  }

  async function handleLockAction(action: "lock" | "unlock" | "reset") {
    if (!lock.sessionId) return;
    setIsLockBusy(true);
    const fn =
      action === "lock"
        ? lockAttendanceSession
        : action === "unlock"
          ? unlockAttendanceSession
          : resetAttendanceSessionLock;
    const result = await fn(lock.sessionId);
    setIsLockBusy(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Updated");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Class attendance</CardTitle>
        <div className="flex items-center gap-2">
          <LockBadge isLocked={lock.isLocked} effectiveLockAt={lock.effectiveLockAt} />
          {lock.sessionId && (
            <>
              {lock.isLocked ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleLockAction("unlock")}
                  disabled={isLockBusy}
                >
                  Unlock
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleLockAction("lock")}
                  disabled={isLockBusy}
                >
                  Lock now
                </Button>
              )}
              {lock.lockedOverride !== null && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleLockAction("reset")}
                  disabled={isLockBusy}
                >
                  Reset to auto
                </Button>
              )}
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <RosterTable
          students={students}
          values={values}
          onChange={handleChange}
          onMarkAllPresent={handleMarkAllPresent}
        />
        <Button type="button" onClick={handleSubmit} disabled={isSubmitting || students.length === 0}>
          {isSubmitting ? "Saving..." : "Save attendance"}
        </Button>
      </CardContent>
    </Card>
  );
}
