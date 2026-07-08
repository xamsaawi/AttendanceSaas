import { logAuditEvent } from "@/features/audit/log";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types/action-result";

type TeacherProfileFields = {
  staffId?: string | null;
  phone?: string | null;
  subjects?: string[];
  qualification?: string | null;
  hireDate?: string | null;
};

// Teachers authenticate with Google, not a password, so "inviting" a teacher
// means one of two things: if their Gmail address already has an account in
// this system (they signed in with Google before being added to any school),
// link them to the org immediately. Otherwise, record a pending invite that
// gets turned into an account the first time that address signs in with
// Google (see src/app/auth/callback/route.ts).
export async function inviteTeacherToOrganization(
  organizationId: string,
  email: string,
  fullName: string,
  profileFields: TeacherProfileFields = {},
): Promise<ActionResult> {
  const admin = createAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  const teacherProfileRow = {
    staff_id: profileFields.staffId || null,
    phone: profileFields.phone || null,
    subjects: profileFields.subjects ?? [],
    qualification: profileFields.qualification || null,
    hire_date: profileFields.hireDate || null,
  };

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (existingProfile) {
    const { data: existingMembership } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", existingProfile.id)
      .maybeSingle();

    if (existingMembership) {
      return { success: false, error: "This person is already part of a school" };
    }

    const { error: memberError } = await admin.from("organization_members").insert({
      organization_id: organizationId,
      user_id: existingProfile.id,
      role: "teacher",
    });
    if (memberError) {
      logger.warn("Failed to add teacher to organization", { message: memberError.message });
      return { success: false, error: "Failed to add them to your school" };
    }

    const { error: profileError } = await admin.from("teacher_profiles").insert({
      organization_id: organizationId,
      user_id: existingProfile.id,
      ...teacherProfileRow,
    });
    if (profileError) {
      logger.warn("Failed to create teacher profile", { message: profileError.message });
      return { success: false, error: "Added, but saving teacher details failed" };
    }

    await logAuditEvent({
      organizationId,
      action: "teacher.invited",
      entityType: "teacher",
      entityId: existingProfile.id,
      metadata: { email: normalizedEmail, name: fullName },
    });

    return { success: true };
  }

  const { error: inviteError } = await admin.from("teacher_invites").upsert(
    {
      organization_id: organizationId,
      email: normalizedEmail,
      full_name: fullName,
      ...teacherProfileRow,
      accepted_at: null,
      accepted_user_id: null,
    },
    { onConflict: "organization_id,email" },
  );

  if (inviteError) {
    logger.warn("Failed to create teacher invite", { message: inviteError.message });
    return { success: false, error: "Failed to create the invite" };
  }

  await logAuditEvent({
    organizationId,
    action: "teacher.invited",
    entityType: "teacher",
    metadata: { email: normalizedEmail, name: fullName },
  });

  return { success: true };
}

export async function cancelTeacherInvite(
  organizationId: string,
  inviteId: string,
): Promise<ActionResult> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("teacher_invites")
    .delete()
    .eq("id", inviteId)
    .eq("organization_id", organizationId)
    .is("accepted_at", null);

  if (error) {
    logger.warn("Failed to cancel teacher invite", { message: error.message });
    return { success: false, error: "Failed to cancel the invite" };
  }

  return { success: true };
}
