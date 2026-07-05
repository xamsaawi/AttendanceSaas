"use server";

import { revalidatePath } from "next/cache";

import { logAuditEvent } from "@/features/audit/log";
import { requireAdminMembership } from "@/features/organizations/queries";
import { sendWhatsAppMessage } from "@/features/whatsapp/provider";
import { createClient } from "@/lib/supabase/server";
import { whatsappSettingsSchema, type WhatsappSettingsInput } from "@/lib/validations/whatsapp";
import type { ActionResult } from "@/types/action-result";

const SETTINGS_PATH = "/dashboard/settings";

export async function updateWhatsappSettings(input: WhatsappSettingsInput): Promise<ActionResult> {
  const parsed = whatsappSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to manage integrations" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("whatsapp_settings").upsert(
    {
      organization_id: membership.organizationId,
      provider: parsed.data.provider === "none" ? null : parsed.data.provider,
      account_sid: parsed.data.accountSid || null,
      phone_number_id: parsed.data.phoneNumberId || null,
      access_token: parsed.data.accessToken || null,
      is_enabled: parsed.data.isEnabled,
    },
    { onConflict: "organization_id" },
  );

  if (error) {
    return { success: false, error: "Failed to save WhatsApp settings" };
  }

  await logAuditEvent({
    organizationId: membership.organizationId,
    action: "whatsapp_settings.updated",
    entityType: "whatsapp_settings",
    entityId: membership.organizationId,
    metadata: { isEnabled: parsed.data.isEnabled, provider: parsed.data.provider },
  });

  revalidatePath(SETTINGS_PATH);
  return { success: true };
}

export async function sendTestWhatsappMessage(phone: string): Promise<ActionResult> {
  const membership = await requireAdminMembership();
  if (!membership) {
    return { success: false, error: "You don't have permission to send messages" };
  }
  if (!phone.trim()) {
    return { success: false, error: "Enter a phone number to test with" };
  }

  const supabase = await createClient();
  await sendWhatsAppMessage(supabase, {
    organizationId: membership.organizationId,
    recipientPhone: phone.trim(),
    body: `Test message from ${membership.organizationName} — WhatsApp integration is working.`,
    templateKey: "test",
  });

  revalidatePath(SETTINGS_PATH);
  return { success: true };
}
