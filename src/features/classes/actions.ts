"use server";

import { revalidatePath } from "next/cache";

import { logAuditEvent } from "@/features/audit/log";
import { requireAdminMembership } from "@/features/organizations/queries";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import {
  classSchema,
  gradeSchema,
  sectionSchema,
  type ClassInput,
  type GradeInput,
  type SectionInput,
} from "@/lib/validations/classes";
import type { ActionResult } from "@/types/action-result";

const CLASSES_PATH = "/dashboard/classes";
const UNIQUE_VIOLATION = "23505";

export async function createGrade(input: GradeInput): Promise<ActionResult> {
  const parsed = gradeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage grades" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("grades").insert({
    organization_id: membership.organizationId,
    name: parsed.data.name,
    sort_order: parsed.data.sortOrder,
  });

  if (error) {
    logger.warn("Failed to create grade", { message: error.message });
    return { success: false, error: "Failed to create grade" };
  }

  revalidatePath(CLASSES_PATH);
  return { success: true };
}

export async function updateGrade(id: string, input: GradeInput): Promise<ActionResult> {
  const parsed = gradeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage grades" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("grades")
    .update({ name: parsed.data.name, sort_order: parsed.data.sortOrder })
    .eq("id", id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    logger.warn("Failed to update grade", { message: error.message });
    return { success: false, error: "Failed to update grade" };
  }

  revalidatePath(CLASSES_PATH);
  return { success: true };
}

export async function deleteGrade(id: string): Promise<ActionResult> {
  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage grades" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("grades")
    .delete()
    .eq("id", id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    logger.warn("Failed to delete grade", { message: error.message });
    return { success: false, error: "Failed to delete grade" };
  }

  revalidatePath(CLASSES_PATH);
  return { success: true };
}

export async function createSection(input: SectionInput): Promise<ActionResult> {
  const parsed = sectionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage sections" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("sections").insert({
    organization_id: membership.organizationId,
    name: parsed.data.name,
  });

  if (error) {
    logger.warn("Failed to create section", { message: error.message });
    return { success: false, error: "Failed to create section" };
  }

  revalidatePath(CLASSES_PATH);
  return { success: true };
}

export async function updateSection(id: string, input: SectionInput): Promise<ActionResult> {
  const parsed = sectionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage sections" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sections")
    .update({ name: parsed.data.name })
    .eq("id", id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    logger.warn("Failed to update section", { message: error.message });
    return { success: false, error: "Failed to update section" };
  }

  revalidatePath(CLASSES_PATH);
  return { success: true };
}

export async function deleteSection(id: string): Promise<ActionResult> {
  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage sections" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sections")
    .delete()
    .eq("id", id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    logger.warn("Failed to delete section", { message: error.message });
    return { success: false, error: "Failed to delete section" };
  }

  revalidatePath(CLASSES_PATH);
  return { success: true };
}

async function validateHomeroomTeacher(
  organizationId: string,
  teacherId: string | undefined,
): Promise<string | null> {
  if (!teacherId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("user_id", teacherId)
    .maybeSingle();

  return data ? null : "Homeroom teacher must be a member of this school";
}

export async function createClass(input: ClassInput): Promise<ActionResult> {
  const parsed = classSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage classes" };
  }

  const teacherError = await validateHomeroomTeacher(
    membership.organizationId,
    parsed.data.homeroomTeacherId,
  );
  if (teacherError) return { success: false, error: teacherError };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("classes")
    .insert({
      organization_id: membership.organizationId,
      academic_year_id: parsed.data.academicYearId,
      grade_id: parsed.data.gradeId,
      section_id: parsed.data.sectionId,
      homeroom_teacher_id: parsed.data.homeroomTeacherId ?? null,
      capacity: parsed.data.capacity ?? null,
    })
    .select("id")
    .single();

  if (error) {
    logger.warn("Failed to create class", { message: error.message });
    if (error.code === UNIQUE_VIOLATION) {
      return { success: false, error: "This grade/section combination already exists for that year" };
    }
    return { success: false, error: "Failed to create class" };
  }

  await logAuditEvent({
    organizationId: membership.organizationId,
    action: "class.created",
    entityType: "class",
    entityId: created.id,
  });

  revalidatePath(CLASSES_PATH);
  return { success: true };
}

export async function updateClass(id: string, input: ClassInput): Promise<ActionResult> {
  const parsed = classSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage classes" };
  }

  const teacherError = await validateHomeroomTeacher(
    membership.organizationId,
    parsed.data.homeroomTeacherId,
  );
  if (teacherError) return { success: false, error: teacherError };

  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .update({
      academic_year_id: parsed.data.academicYearId,
      grade_id: parsed.data.gradeId,
      section_id: parsed.data.sectionId,
      homeroom_teacher_id: parsed.data.homeroomTeacherId ?? null,
      capacity: parsed.data.capacity ?? null,
    })
    .eq("id", id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    logger.warn("Failed to update class", { message: error.message });
    if (error.code === UNIQUE_VIOLATION) {
      return { success: false, error: "This grade/section combination already exists for that year" };
    }
    return { success: false, error: "Failed to update class" };
  }

  await logAuditEvent({
    organizationId: membership.organizationId,
    action: "class.updated",
    entityType: "class",
    entityId: id,
  });

  revalidatePath(CLASSES_PATH);
  return { success: true };
}

export async function deleteClass(id: string): Promise<ActionResult> {
  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage classes" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .delete()
    .eq("id", id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    logger.warn("Failed to delete class", { message: error.message });
    return { success: false, error: "Failed to delete class" };
  }

  await logAuditEvent({
    organizationId: membership.organizationId,
    action: "class.deleted",
    entityType: "class",
    entityId: id,
  });

  revalidatePath(CLASSES_PATH);
  return { success: true };
}
