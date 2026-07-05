"use server";

import { revalidatePath } from "next/cache";

import { logAuditEvent } from "@/features/audit/log";
import { removeMember } from "@/features/team/actions";
import { requireAdminMembership } from "@/features/organizations/queries";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createConfirmedUser, generateTempPassword } from "@/lib/supabase/create-user";
import {
  teacherInviteSchema,
  teacherProfileSchema,
  type TeacherInviteInput,
  type TeacherProfileInput,
} from "@/lib/validations/teachers";
import type { ActionResult, PasswordActionResult } from "@/types/action-result";

const TEACHERS_PATH = "/dashboard/teachers";

function splitSubjects(subjects: string | undefined): string[] {
  if (!subjects) return [];
  return subjects
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function inviteTeacherWithProfile(
  input: TeacherInviteInput,
): Promise<PasswordActionResult> {
  const parsed = teacherInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to add teachers" };
  }

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data, error } = await createConfirmedUser(admin, {
    email: parsed.data.email,
    fullName: parsed.data.fullName,
    password: tempPassword,
  });

  if (error || !data.user) {
    logger.warn("Failed to create teacher account", {
      email: parsed.data.email,
      message: error?.message,
    });
    return { success: false, error: error?.message ?? "Failed to create account" };
  }

  const { error: memberError } = await admin.from("organization_members").insert({
    organization_id: membership.organizationId,
    user_id: data.user.id,
    role: "teacher",
  });

  if (memberError) {
    logger.warn("Failed to add teacher to organization", { message: memberError.message });
    return { success: false, error: "Account created, but adding them to your school failed" };
  }

  const { error: profileError } = await admin.from("teacher_profiles").insert({
    organization_id: membership.organizationId,
    user_id: data.user.id,
    staff_id: parsed.data.staffId || null,
    phone: parsed.data.phone || null,
    subjects: splitSubjects(parsed.data.subjects),
    qualification: parsed.data.qualification || null,
    hire_date: parsed.data.hireDate || null,
  });

  if (profileError) {
    logger.warn("Failed to create teacher profile", { message: profileError.message });
    return { success: false, error: "Account created, but saving teacher details failed" };
  }

  await logAuditEvent({
    organizationId: membership.organizationId,
    action: "teacher.invited",
    entityType: "teacher",
    entityId: data.user.id,
    metadata: { email: parsed.data.email, name: parsed.data.fullName },
  });

  revalidatePath(TEACHERS_PATH);
  return { success: true, tempPassword };
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
