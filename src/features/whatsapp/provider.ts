import type { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/logger";
import type { Database } from "@/types/database";

// Accepts whichever client the caller already has (request-scoped SSR client
// for admin-triggered sends, service-role client for the cron job), same
// reasoning as createNotification.
export async function sendWhatsAppMessage(
  supabase: SupabaseClient<Database>,
  params: {
    organizationId: string;
    recipientPhone: string;
    recipientName?: string;
    body: string;
    templateKey?: string;
  },
): Promise<void> {
  const { data: settings } = await supabase
    .from("whatsapp_settings")
    .select("provider, account_sid, phone_number_id, access_token, is_enabled")
    .eq("organization_id", params.organizationId)
    .maybeSingle();

  const isConfigured =
    settings?.is_enabled &&
    settings.provider === "twilio" &&
    settings.account_sid &&
    settings.phone_number_id &&
    settings.access_token;

  // Not configured (or deliberately disabled) — log the message so the
  // admin can see what *would* have been sent, but make no network call.
  // This is the intended default state until real Twilio credentials are
  // provided in Settings > Integrations.
  if (!isConfigured) {
    await supabase.from("whatsapp_messages").insert({
      organization_id: params.organizationId,
      recipient_phone: params.recipientPhone,
      recipient_name: params.recipientName ?? null,
      template_key: params.templateKey ?? null,
      body: params.body,
      status: "disabled",
    });
    return;
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${settings.account_sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${settings.account_sid}:${settings.access_token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: `whatsapp:${settings.phone_number_id}`,
          To: `whatsapp:${params.recipientPhone}`,
          Body: params.body,
        }),
      },
    );

    const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };

    if (!res.ok) {
      await supabase.from("whatsapp_messages").insert({
        organization_id: params.organizationId,
        recipient_phone: params.recipientPhone,
        recipient_name: params.recipientName ?? null,
        template_key: params.templateKey ?? null,
        body: params.body,
        status: "failed",
        error: json.message ?? `Twilio request failed (${res.status})`,
      });
      return;
    }

    await supabase.from("whatsapp_messages").insert({
      organization_id: params.organizationId,
      recipient_phone: params.recipientPhone,
      recipient_name: params.recipientName ?? null,
      template_key: params.templateKey ?? null,
      body: params.body,
      status: "sent",
      provider_message_id: json.sid ?? null,
      sent_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.warn("WhatsApp send failed", { message });
    await supabase.from("whatsapp_messages").insert({
      organization_id: params.organizationId,
      recipient_phone: params.recipientPhone,
      recipient_name: params.recipientName ?? null,
      template_key: params.templateKey ?? null,
      body: params.body,
      status: "failed",
      error: message,
    });
  }
}
