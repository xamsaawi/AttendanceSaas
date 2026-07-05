"use server";

import { revalidatePath } from "next/cache";

import { requireClassAttendanceAccess } from "@/features/attendance/queries";
import { requireAdminMembership } from "@/features/organizations/queries";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import {
  lockOverrideSchema,
  markAttendanceSchema,
  type MarkAttendanceInput,
} from "@/lib/validations/attendance";
import type { ActionResult } from "@/types/action-result";

const ATTENDANCE_PATH = "/dashboard/attendance";
const INSUFFICIENT_PRIVILEGE = "42501";

export type MarkAttendanceResult =
  | { success: true }
  | { success: false; error: string; code?: "LOCKED" };

const lockedResult: MarkAttendanceResult = {
  success: false,
  error: "This session is locked and can no longer be edited. Ask an admin to reopen it.",
  code: "LOCKED",
};

export async function markAttendanceCore(input: MarkAttendanceInput): Promise<MarkAttendanceResult> {
  const parsed = markAttendanceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const access = await requireClassAttendanceAccess(parsed.data.classId);
  if (!access || (!access.isAdmin && !access.isTeacherOfClass)) {
    return { success: false, error: "You don't have permission to mark attendance for this class" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!access.isAdmin) {
    const { data: lockAt, error: lockError } = await supabase.rpc("attendance_lock_at", {
      p_class_id: parsed.data.classId,
      p_session_date: parsed.data.sessionDate,
      p_session_type: parsed.data.sessionType,
    });
    if (lockError) {
      logger.warn("Failed to check attendance lock", { message: lockError.message });
      return { success: false, error: "Failed to mark attendance" };
    }

    const { data: existingSession } = await supabase
      .from("attendance_sessions")
      .select("locked_override")
      .eq("class_id", parsed.data.classId)
      .eq("session_date", parsed.data.sessionDate)
      .eq("session_type", parsed.data.sessionType)
      .maybeSingle();

    const isLocked =
      existingSession?.locked_override ?? new Date() > new Date(lockAt as unknown as string);
    if (isLocked) return lockedResult;
  }

  const { data: session, error: sessionError } = await supabase
    .from("attendance_sessions")
    .upsert(
      {
        organization_id: access.membership.organizationId,
        class_id: parsed.data.classId,
        session_date: parsed.data.sessionDate,
        session_type: parsed.data.sessionType,
        submitted_by: user?.id ?? null,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "class_id,session_date,session_type" },
    )
    .select("id")
    .single();

  if (sessionError || !session) {
    logger.warn("Failed to upsert attendance session", { message: sessionError?.message });
    if (sessionError?.code === INSUFFICIENT_PRIVILEGE) return lockedResult;
    return { success: false, error: "Failed to mark attendance" };
  }

  const { error: recordsError } = await supabase.from("attendance_records").upsert(
    parsed.data.records.map((r) => ({
      organization_id: access.membership.organizationId,
      session_id: session.id,
      student_id: r.studentId,
      status: r.status,
      notes: r.notes ?? null,
      marked_by: user?.id ?? null,
      marked_at: new Date().toISOString(),
    })),
    { onConflict: "session_id,student_id" },
  );

  if (recordsError) {
    logger.warn("Failed to upsert attendance records", { message: recordsError.message });
    if (recordsError.code === INSUFFICIENT_PRIVILEGE) return lockedResult;
    return { success: false, error: "Failed to mark attendance" };
  }

  revalidatePath(ATTENDANCE_PATH);
  return { success: true };
}

async function setLockOverride(
  sessionId: string,
  lockedOverride: boolean | null,
): Promise<ActionResult> {
  const parsed = lockOverrideSchema.safeParse({ sessionId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage attendance locks" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("attendance_sessions")
    .update({
      locked_override: lockedOverride,
      locked_override_by: lockedOverride === null ? null : (user?.id ?? null),
      locked_override_at: lockedOverride === null ? null : new Date().toISOString(),
    })
    .eq("id", parsed.data.sessionId)
    .eq("organization_id", membership.organizationId);

  if (error) {
    logger.warn("Failed to update attendance session lock", { message: error.message });
    return { success: false, error: "Failed to update attendance session lock" };
  }

  revalidatePath(ATTENDANCE_PATH);
  return { success: true };
}

export async function lockAttendanceSession(sessionId: string): Promise<ActionResult> {
  return setLockOverride(sessionId, true);
}

export async function unlockAttendanceSession(sessionId: string): Promise<ActionResult> {
  return setLockOverride(sessionId, false);
}

export async function resetAttendanceSessionLock(sessionId: string): Promise<ActionResult> {
  return setLockOverride(sessionId, null);
}
