"use server";

import { revalidatePath } from "next/cache";

import { logAuditEvent } from "@/features/audit/log";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { schoolSettingsSchema, type SchoolSettingsInput } from "@/lib/validations/organization";
import type { ActionResult } from "@/types/action-result";

import { requireAdminMembership } from "./queries";

export async function updateSchoolSettings(input: SchoolSettingsInput): Promise<ActionResult> {
  const parsed = schoolSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to update school settings" };
  }

  const supabase = await createClient();

  const { error: orgError } = await supabase
    .from("organizations")
    .update({ name: parsed.data.name })
    .eq("id", membership.organizationId);

  if (orgError) {
    logger.warn("Failed to update organization name", { message: orgError.message });
    return { success: false, error: "You don't have permission to update school settings" };
  }

  const { error: settingsError } = await supabase
    .from("school_settings")
    .update({
      timezone: parsed.data.timezone,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      contact_email: parsed.data.contactEmail || null,
      working_days: parsed.data.workingDays,
      before_break_cutoff: parsed.data.beforeBreakCutoff,
      after_break_cutoff: parsed.data.afterBreakCutoff,
      attendance_lock_grace_hours: parsed.data.attendanceLockGraceHours,
    })
    .eq("organization_id", membership.organizationId);

  if (settingsError) {
    logger.warn("Failed to update school settings", { message: settingsError.message });
    return { success: false, error: "You don't have permission to update school settings" };
  }

  await logAuditEvent({
    organizationId: membership.organizationId,
    action: "settings.updated",
    entityType: "school_settings",
    entityId: membership.organizationId,
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function uploadSchoolLogo(formData: FormData): Promise<ActionResult> {
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Please choose a file" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to upload a logo" };
  }

  const supabase = await createClient();
  const extension = file.name.split(".").pop() ?? "png";
  const path = `${membership.organizationId}/logo-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("school-logos")
    .upload(path, file, { upsert: true });

  if (uploadError) {
    logger.warn("Failed to upload school logo", { message: uploadError.message });
    return { success: false, error: "You don't have permission to upload a logo" };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("school-logos").getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("school_settings")
    .update({ logo_url: publicUrl })
    .eq("organization_id", membership.organizationId);

  if (updateError) {
    logger.warn("Failed to save school logo URL", { message: updateError.message });
    return { success: false, error: "Failed to save the uploaded logo" };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}
