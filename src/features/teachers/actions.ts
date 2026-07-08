"use server";

import { revalidatePath } from "next/cache";

import { logAuditEvent } from "@/features/audit/log";
import { removeMember } from "@/features/team/actions";
import { requireAdminMembership } from "@/features/organizations/queries";
import { cancelTeacherInvite, inviteTeacherToOrganization } from "@/features/teachers/invite";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { validateImageFile } from "@/lib/validations/image-upload";
import {
  teacherInviteSchema,
  teacherProfileSchema,
  type TeacherInviteInput,
  type TeacherProfileInput,
} from "@/lib/validations/teachers";
import type { ActionResult } from "@/types/action-result";

const TEACHERS_PATH = "/dashboard/teachers";

function splitSubjects(subjects: string | undefined): string[] {
  if (!subjects) return [];
  return subjects
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function inviteTeacherWithProfile(input: TeacherInviteInput): Promise<ActionResult> {
  const parsed = teacherInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to add teachers" };
  }

  const result = await inviteTeacherToOrganization(
    membership.organizationId,
    parsed.data.email,
    parsed.data.fullName,
    {
      staffId: parsed.data.staffId,
      phone: parsed.data.phone,
      subjects: splitSubjects(parsed.data.subjects),
      qualification: parsed.data.qualification,
      hireDate: parsed.data.hireDate,
    },
  );

  if (result.success) revalidatePath(TEACHERS_PATH);
  return result;
}

export async function removeTeacherInvite(inviteId: string): Promise<ActionResult> {
  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to cancel invites" };
  }

  const result = await cancelTeacherInvite(membership.organizationId, inviteId);
  if (result.success) revalidatePath(TEACHERS_PATH);
  return result;
}

export async function updateTeacherProfile(
  userId: string,
  input: TeacherProfileInput,
): Promise<ActionResult> {
  const parsed = teacherProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage teachers" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("teacher_profiles").upsert(
    {
      organization_id: membership.organizationId,
      user_id: userId,
      staff_id: parsed.data.staffId || null,
      phone: parsed.data.phone || null,
      subjects: splitSubjects(parsed.data.subjects),
      qualification: parsed.data.qualification || null,
      hire_date: parsed.data.hireDate || null,
    },
    { onConflict: "organization_id,user_id" },
  );

  if (error) {
    logger.warn("Failed to update teacher profile", { message: error.message });
    return { success: false, error: "Failed to update teacher details" };
  }

  await logAuditEvent({
    organizationId: membership.organizationId,
    action: "teacher.updated",
    entityType: "teacher",
    entityId: userId,
  });

  revalidatePath(TEACHERS_PATH);
  return { success: true };
}

export async function uploadTeacherPhoto(formData: FormData): Promise<ActionResult> {
  const file = formData.get("photo");
  const userId = formData.get("userId");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Please choose a file" };
  }
  const validationError = validateImageFile(file);
  if (validationError) {
    return { success: false, error: validationError };
  }
  if (typeof userId !== "string" || !userId) {
    return { success: false, error: "Missing teacher" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to upload a photo" };
  }

  const supabase = await createClient();
  const extension = file.name.split(".").pop() ?? "jpg";
  const path = `${membership.organizationId}/teachers/${userId}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("profile-photos")
    .upload(path, file, { upsert: true });

  if (uploadError) {
    logger.warn("Failed to upload teacher photo", { message: uploadError.message });
    return { success: false, error: "Failed to upload photo" };
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("profiles")
    .update({ avatar_url: path })
    .eq("id", userId);

  if (updateError) {
    logger.warn("Failed to save teacher photo path", { message: updateError.message });
    return { success: false, error: "Failed to save the uploaded photo" };
  }

  revalidatePath(TEACHERS_PATH);
  return { success: true };
}

export async function removeTeacher(userId: string): Promise<ActionResult> {
  const result = await removeMember(userId);
  if (result.success) revalidatePath(TEACHERS_PATH);
  return result;
}
