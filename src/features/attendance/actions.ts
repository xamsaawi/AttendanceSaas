"use server";

import { revalidatePath } from "next/cache";

import { format } from "date-fns";

import { getClassRosterForSession, requireClassAttendanceAccess } from "@/features/attendance/queries";
import { logAuditEvent } from "@/features/audit/log";
import { requireAdminMembership } from "@/features/organizations/queries";
import { getPrimaryGuardiansForStudents } from "@/features/parents/queries";
import { sendWhatsAppMessage } from "@/features/whatsapp/provider";
import { attendanceStatusLabels } from "@/lib/attendance/status";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import {
  lockOverrideSchema,
  markAttendanceSchema,
  sendParentReportSchema,
  type MarkAttendanceInput,
  type SendParentReportInput,
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

  await logAuditEvent({
    organizationId: membership.organizationId,
    action:
      lockedOverride === null
        ? "attendance_session.lock_reset"
        : lockedOverride
          ? "attendance_session.locked"
          : "attendance_session.unlocked",
    entityType: "attendance_session",
    entityId: parsed.data.sessionId,
  });

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

function renderMessageTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);
}

export type SendParentReportResult =
  | {
      success: true;
      sent: number;
      disabled: number;
      failed: number;
      skippedNoGuardian: number;
      skippedNoPhone: number;
    }
  | { success: false; error: string };

// Admin-composed, per-student personalized message (merge fields: {studentName},
// {guardianName}, {status}, {date}) sent via WhatsApp to each marked student's
// primary guardian only — see requireClassAttendanceAccess for why classId is
// re-validated against the caller's own org rather than trusted as-is.
export async function sendAttendanceReportToParents(
  input: SendParentReportInput,
): Promise<SendParentReportResult> {
  const parsed = sendParentReportSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const access = await requireClassAttendanceAccess(parsed.data.classId);
  if (!access || !access.isAdmin) {
    return { success: false, error: "You don't have permission to send parent reports for this class" };
  }

  const roster = await getClassRosterForSession(
    parsed.data.classId,
    parsed.data.sessionDate,
    parsed.data.sessionType,
  );
  const markedStudents = roster.students.filter((s) => roster.recordByStudentId.has(s.id));
  if (markedStudents.length === 0) {
    return { success: false, error: "No attendance has been marked for this session yet" };
  }

  const guardianByStudentId = await getPrimaryGuardiansForStudents(
    access.membership.organizationId,
    markedStudents.map((s) => s.id),
  );

  const supabase = await createClient();
  const dateLabel = format(new Date(`${parsed.data.sessionDate}T00:00:00`), "MMM d, yyyy");

  let sent = 0;
  let disabled = 0;
  let failed = 0;
  let skippedNoGuardian = 0;
  let skippedNoPhone = 0;

  for (const student of markedStudents) {
    const record = roster.recordByStudentId.get(student.id)!;
    const guardian = guardianByStudentId.get(student.id);
    if (!guardian) {
      skippedNoGuardian++;
      continue;
    }
    if (!guardian.phone) {
      skippedNoPhone++;
      continue;
    }

    const body = renderMessageTemplate(parsed.data.messageTemplate, {
      studentName: student.fullName,
      guardianName: guardian.name,
      status: attendanceStatusLabels[record.status],
      date: dateLabel,
    });

    const outcome = await sendWhatsAppMessage(supabase, {
      organizationId: access.membership.organizationId,
      recipientPhone: guardian.phone,
      recipientName: guardian.name,
      body,
      templateKey: "attendance_report",
    });

    if (outcome === "sent") sent++;
    else if (outcome === "disabled") disabled++;
    else failed++;
  }

  await logAuditEvent({
    organizationId: access.membership.organizationId,
    action: "attendance_report.sent_to_parents",
    entityType: "class",
    entityId: parsed.data.classId,
    metadata: {
      sessionDate: parsed.data.sessionDate,
      sessionType: parsed.data.sessionType,
      sent,
      disabled,
      failed,
      skippedNoGuardian,
      skippedNoPhone,
    },
  });

  revalidatePath(ATTENDANCE_PATH);
  return { success: true, sent, disabled, failed, skippedNoGuardian, skippedNoPhone };
}
