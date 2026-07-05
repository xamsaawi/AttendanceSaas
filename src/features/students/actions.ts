"use server";

import { revalidatePath } from "next/cache";

import { logAuditEvent } from "@/features/audit/log";
import { requireAdminMembership } from "@/features/organizations/queries";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { studentSchema, type StudentInput } from "@/lib/validations/students";
import type { ActionResult } from "@/types/action-result";

const STUDENTS_PATH = "/dashboard/students";
const UNIQUE_VIOLATION = "23505";

function toRow(data: StudentInput) {
  return {
    admission_number: data.admissionNumber,
    first_name: data.firstName,
    last_name: data.lastName,
    date_of_birth: data.dateOfBirth || null,
    gender: data.gender ?? null,
    class_id: data.classId ?? null,
    status: data.status,
    enrollment_date: data.enrollmentDate,
    address: data.address || null,
    notes: data.notes || null,
  };
}

export async function createStudent(input: StudentInput): Promise<ActionResult> {
  const parsed = studentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage students" };
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("students")
    .insert({
      organization_id: membership.organizationId,
      ...toRow(parsed.data),
    })
    .select("id")
    .single();

  if (error) {
    logger.warn("Failed to create student", { message: error.message });
    if (error.code === UNIQUE_VIOLATION) {
      return { success: false, error: "A student with this admission number already exists" };
    }
    return { success: false, error: "Failed to create student" };
  }

  await logAuditEvent({
    organizationId: membership.organizationId,
    action: "student.created",
    entityType: "student",
    entityId: created.id,
    metadata: { admissionNumber: parsed.data.admissionNumber, name: `${parsed.data.firstName} ${parsed.data.lastName}` },
  });

  revalidatePath(STUDENTS_PATH);
  return { success: true };
}

export async function updateStudent(id: string, input: StudentInput): Promise<ActionResult> {
  const parsed = studentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage students" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    logger.warn("Failed to update student", { message: error.message });
    if (error.code === UNIQUE_VIOLATION) {
      return { success: false, error: "A student with this admission number already exists" };
    }
    return { success: false, error: "Failed to update student" };
  }

  await logAuditEvent({
    organizationId: membership.organizationId,
    action: "student.updated",
    entityType: "student",
    entityId: id,
    metadata: { admissionNumber: parsed.data.admissionNumber, name: `${parsed.data.firstName} ${parsed.data.lastName}` },
  });

  revalidatePath(STUDENTS_PATH);
  return { success: true };
}

export async function deleteStudent(id: string): Promise<ActionResult> {
  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage students" };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("students")
    .select("full_name, admission_number")
    .eq("id", id)
    .eq("organization_id", membership.organizationId)
    .maybeSingle();

  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    logger.warn("Failed to delete student", { message: error.message });
    return { success: false, error: "Failed to delete student" };
  }

  await logAuditEvent({
    organizationId: membership.organizationId,
    action: "student.deleted",
    entityType: "student",
    entityId: id,
    metadata: { admissionNumber: existing?.admission_number, name: existing?.full_name },
  });

  revalidatePath(STUDENTS_PATH);
  return { success: true };
}

export async function uploadStudentPhoto(formData: FormData): Promise<ActionResult> {
  const file = formData.get("photo");
  const studentId = formData.get("studentId");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Please choose a file" };
  }
  if (typeof studentId !== "string" || !studentId) {
    return { success: false, error: "Missing student" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to upload a photo" };
  }

  const supabase = await createClient();
  const extension = file.name.split(".").pop() ?? "jpg";
  const path = `${membership.organizationId}/students/${studentId}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("profile-photos")
    .upload(path, file, { upsert: true });

  if (uploadError) {
    logger.warn("Failed to upload student photo", { message: uploadError.message });
    return { success: false, error: "Failed to upload photo" };
  }

  const { error: updateError } = await supabase
    .from("students")
    .update({ photo_url: path })
    .eq("id", studentId)
    .eq("organization_id", membership.organizationId);

  if (updateError) {
    logger.warn("Failed to save student photo path", { message: updateError.message });
    return { success: false, error: "Failed to save the uploaded photo" };
  }

  revalidatePath(STUDENTS_PATH);
  return { success: true };
}
