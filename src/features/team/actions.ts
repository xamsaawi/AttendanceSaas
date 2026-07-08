"use server";

import { revalidatePath } from "next/cache";

import { logAuditEvent } from "@/features/audit/log";
import { requireAdminMembership } from "@/features/organizations/queries";
import { inviteTeacherToOrganization } from "@/features/teachers/invite";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import {
  inviteTeacherSchema,
  updateMemberRoleSchema,
  type InviteTeacherInput,
  type UpdateMemberRoleInput,
} from "@/lib/validations/team";
import type { ActionResult } from "@/types/action-result";

export async function inviteTeacher(input: InviteTeacherInput): Promise<ActionResult> {
  const parsed = inviteTeacherSchema.safeParse(input);
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
  );

  if (result.success) revalidatePath("/dashboard/team");
  return result;
}

export async function updateMemberRole(input: UpdateMemberRoleInput): Promise<ActionResult> {
  const parsed = updateMemberRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to change roles" };
  }

  const supabase = await createClient();

  if (parsed.data.role !== "owner") {
    const stillHasOwner = await organizationHasOtherOwner(
      membership.organizationId,
      parsed.data.userId,
    );
    if (!stillHasOwner) {
      return { success: false, error: "A school must have at least one owner" };
    }
  }

  const { error } = await supabase
    .from("organization_members")
    .update({ role: parsed.data.role })
    .eq("organization_id", membership.organizationId)
    .eq("user_id", parsed.data.userId);

  if (error) {
    logger.warn("Failed to update member role", { message: error.message });
    return { success: false, error: "You don't have permission to change roles" };
  }

  await logAuditEvent({
    organizationId: membership.organizationId,
    action: "member.role_changed",
    entityType: "organization_member",
    entityId: parsed.data.userId,
    metadata: { newRole: parsed.data.role },
  });

  revalidatePath("/dashboard/team");
  return { success: true };
}

export async function removeMember(userId: string): Promise<ActionResult> {
  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to remove members" };
  }

  const stillHasOwner = await organizationHasOtherOwner(membership.organizationId, userId);
  if (!stillHasOwner) {
    return { success: false, error: "A school must have at least one owner" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", membership.organizationId)
    .eq("user_id", userId);

  if (error) {
    logger.warn("Failed to remove member", { message: error.message });
    return { success: false, error: "You don't have permission to remove members" };
  }

  await logAuditEvent({
    organizationId: membership.organizationId,
    action: "member.removed",
    entityType: "organization_member",
    entityId: userId,
  });

  revalidatePath("/dashboard/team");
  return { success: true };
}

async function organizationHasOtherOwner(organizationId: string, excludingUserId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("organization_members")
    .select("user_id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("role", "owner")
    .neq("user_id", excludingUserId);

  return (count ?? 0) > 0;
}
