"use server";

import { revalidatePath } from "next/cache";

import { env } from "@/config/env";
import { requireAdminMembership } from "@/features/organizations/queries";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
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
    return { success: false, error: "You don't have permission to invite teachers" };
  }

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: { full_name: parsed.data.fullName },
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  });

  if (error || !data.user) {
    logger.warn("Failed to invite teacher", {
      email: parsed.data.email,
      message: error?.message,
    });
    return { success: false, error: error?.message ?? "Failed to send invite" };
  }

  const { error: memberError } = await admin.from("organization_members").insert({
    organization_id: membership.organizationId,
    user_id: data.user.id,
    role: "teacher",
  });

  if (memberError) {
    logger.warn("Failed to add invited teacher to organization", {
      message: memberError.message,
    });
    return { success: false, error: "Invite sent, but adding them to your school failed" };
  }

  revalidatePath("/dashboard/team");
  return { success: true };
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
