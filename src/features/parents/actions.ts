"use server";

import { revalidatePath } from "next/cache";

import { logAuditEvent } from "@/features/audit/log";
import { requireAdminMembership } from "@/features/organizations/queries";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { guardianSchema, studentGuardianLinkSchema, type GuardianInput, type StudentGuardianLinkInput } from "@/lib/validations/guardians";
import type { ActionResult } from "@/types/action-result";

const PARENTS_PATH = "/dashboard/parents";

export async function createGuardian(input: GuardianInput): Promise<ActionResult> {
  const parsed = guardianSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage guardians" };
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("guardians")
    .insert({
      organization_id: membership.organizationId,
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (error) {
    logger.warn("Failed to create guardian", { message: error.message });
    return { success: false, error: "Failed to create guardian" };
  }

  await logAuditEvent({
    organizationId: membership.organizationId,
    action: "guardian.created",
    entityType: "guardian",
    entityId: created.id,
    metadata: { name: parsed.data.fullName },
  });

  revalidatePath(PARENTS_PATH);
  return { success: true };
}

export async function updateGuardian(id: string, input: GuardianInput): Promise<ActionResult> {
  const parsed = guardianSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage guardians" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("guardians")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    logger.warn("Failed to update guardian", { message: error.message });
    return { success: false, error: "Failed to update guardian" };
  }

  await logAuditEvent({
    organizationId: membership.organizationId,
    action: "guardian.updated",
    entityType: "guardian",
    entityId: id,
    metadata: { name: parsed.data.fullName },
  });

  revalidatePath(PARENTS_PATH);
  return { success: true };
}

export async function deleteGuardian(id: string): Promise<ActionResult> {
  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage guardians" };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("guardians")
    .select("full_name")
    .eq("id", id)
    .eq("organization_id", membership.organizationId)
    .maybeSingle();

  const { error } = await supabase
    .from("guardians")
    .delete()
    .eq("id", id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    logger.warn("Failed to delete guardian", { message: error.message });
    return { success: false, error: "Failed to delete guardian" };
  }

  await logAuditEvent({
    organizationId: membership.organizationId,
    action: "guardian.deleted",
    entityType: "guardian",
    entityId: id,
    metadata: { name: existing?.full_name },
  });

  revalidatePath(PARENTS_PATH);
  return { success: true };
}

export async function linkGuardianToStudent(
  guardianId: string,
  input: StudentGuardianLinkInput,
): Promise<ActionResult> {
  const parsed = studentGuardianLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage guardians" };
  }

  const supabase = await createClient();

  if (parsed.data.isPrimary) {
    await supabase
      .from("student_guardians")
      .update({ is_primary: false })
      .eq("organization_id", membership.organizationId)
      .eq("student_id", parsed.data.studentId);
  }

  const { error } = await supabase.from("student_guardians").insert({
    organization_id: membership.organizationId,
    student_id: parsed.data.studentId,
    guardian_id: guardianId,
    relationship: parsed.data.relationship,
    is_primary: parsed.data.isPrimary,
  });

  if (error) {
    logger.warn("Failed to link guardian to student", { message: error.message });
    if (error.code === "23505") {
      return { success: false, error: "This guardian is already linked to that student" };
    }
    return { success: false, error: "Failed to link guardian to student" };
  }

  revalidatePath(PARENTS_PATH);
  return { success: true };
}

export async function unlinkGuardianFromStudent(linkId: string): Promise<ActionResult> {
  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage guardians" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("student_guardians")
    .delete()
    .eq("id", linkId)
    .eq("organization_id", membership.organizationId);

  if (error) {
    logger.warn("Failed to unlink guardian from student", { message: error.message });
    return { success: false, error: "Failed to unlink guardian from student" };
  }

  revalidatePath(PARENTS_PATH);
  return { success: true };
}
