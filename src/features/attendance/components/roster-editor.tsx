"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { LockBadge } from "@/features/attendance/components/lock-badge";
import { RosterTable, type RosterEditValue } from "@/features/attendance/components/roster-table";
import { enqueueMutation } from "@/features/attendance/offline/queue";
import type { RosterStudent, SessionLockInfo } from "@/features/attendance/queries";
import type { AttendanceSessionType, AttendanceStatus } from "@/types/database";

// Keyed by `${classId}:${sessionDate}:${sessionType}` from the caller so
// React remounts this component (resetting `values`) whenever the selected
// class/date/session changes, instead of syncing local state from props
// inside an effect.
export function RosterEditor({
  classId,
  sessionDate,
  sessionType,
  students,
  initialRecords,
  lock,
  onSaved,
}: {
  classId: string;
  sessionDate: string;
  sessionType: AttendanceSessionType;
  students: RosterStudent[];
  initialRecords: Record<string, { status: AttendanceStatus; notes: string | null }>;
  lock: SessionLockInfo;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, RosterEditValue>>(() => {
    const initial: Record<string, RosterEditValue> = {};
    for (const student of students) {
      const record = initialRecords[student.id];
      initial[student.id] = { status: record?.status ?? "present", notes: record?.notes ?? "" };
    }
    return initial;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (students.length === 0) return;
    setIsSubmitting(true);

    const payload = {
      classId,
      sessionDate,
      sessionType,
      records: students.map((s) => ({
        studentId: s.id,
        status: values[s.id]?.status ?? ("present" as AttendanceStatus),
        notes: values[s.id]?.notes || undefined,
      })),
    };

    if (!navigator.onLine) {
      await enqueueMutation(payload);
      toast.success("You're offline — attendance queued and will sync automatically");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Attendance saved");
        onSaved();
      } else {
        const body = await res.json().catch(() => ({ error: "Failed to save attendance" }));
        toast.error(body.error ?? "Failed to save attendance");
      }
    } catch {
      await enqueueMutation(payload);
      toast.success("Connection lost — attendance queued and will sync automatically");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <LockBadge isLocked={lock.isLocked} effectiveLockAt={lock.effectiveLockAt} />
        {lock.submittedAt && (
          <span className="text-muted-foreground text-xs">
            Last saved {new Date(lock.submittedAt).toLocaleString()}
          </span>
        )}
      </div>
      <RosterTable
        students={students}
        values={values}
        onChange={handleChange}
        onMarkAllPresent={handleMarkAllPresent}
        disabled={lock.isLocked}
      />
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || lock.isLocked || students.length === 0}
      >
        {isSubmitting ? "Saving..." : "Save attendance"}
      </Button>
    </div>
  );
}
