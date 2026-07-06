import type { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/logger";
import type { Database } from "@/types/database";

// Accepts whichever client the caller already has (request-scoped SSR client
// for admin-triggered sends, service-role client for the cron job), same
// reasoning as createNotification.
export type WhatsAppSendOutcome = "sent" | "disabled" | "failed";

export async function sendWhatsAppMessage(
  supabase: SupabaseClient<Database>,
  params: {
    organizationId: string;
    recipientPhone: string;
    recipientName?: string;
    body: string;
    templateKey?: string;
  },
): Promise<WhatsAppSendOutcome> {
  const { data: settings } = await supabase
    .from("whatsapp_settings")
    .select("provider, account_sid, phone_number_id, access_token, is_enabled")
    .eq("organization_id", params.organizationId)
    .maybeSingle();

  // Twilio needs account_sid + phone_number_id + access_token; the Meta
  // Cloud API has no account_sid concept (just a phone_number_id + a
  // bearer access_token), so it's checked separately.
  const isConfigured =
    settings?.is_enabled &&
    ((settings.provider === "twilio" &&
      settings.account_sid &&
      settings.phone_number_id &&
      settings.access_token) ||
      (settings.provider === "whatsapp_cloud_api" && settings.phone_number_id && settings.access_token));

  // Not configured (or deliberately disabled) — log the message so the
  // admin can see what *would* have been sent, but make no network call.
  // This is the intended default state until real credentials are
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
    return "disabled";
  }

  try {
    const { ok, providerMessageId, error } =
      settings.provider === "twilio"
        ? await sendViaTwilio(settings, params.recipientPhone, params.body)
        : await sendViaMetaCloudApi(settings, params.recipientPhone, params.body);

    if (!ok) {
      await supabase.from("whatsapp_messages").insert({
        organization_id: params.organizationId,
        recipient_phone: params.recipientPhone,
        recipient_name: params.recipientName ?? null,
        template_key: params.templateKey ?? null,
        body: params.body,
        status: "failed",
        error,
      });
      return "failed";
    }

    await supabase.from("whatsapp_messages").insert({
      organization_id: params.organizationId,
      recipient_phone: params.recipientPhone,
      recipient_name: params.recipientName ?? null,
      template_key: params.templateKey ?? null,
      body: params.body,
      status: "sent",
      provider_message_id: providerMessageId,
      sent_at: new Date().toISOString(),
    });
    return "sent";
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
    return "failed";
  }
}

type SendOutcome = { ok: true; providerMessageId: string | null; error?: undefined } | { ok: false; providerMessageId?: undefined; error: string };

async function sendViaTwilio(
  settings: { account_sid: string | null; phone_number_id: string | null; access_token: string | null },
  recipientPhone: string,
  body: string,
): Promise<SendOutcome> {
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${settings.account_sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${settings.account_sid}:${settings.access_token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: `whatsapp:${settings.phone_number_id}`,
      To: `whatsapp:${recipientPhone}`,
      Body: body,
    }),
  });

  const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
  if (!res.ok) {
    return { ok: false, error: json.message ?? `Twilio request failed (${res.status})` };
  }
  return { ok: true, providerMessageId: json.sid ?? null };
}

// Meta's own WhatsApp Cloud API (graph.facebook.com) — the free alternative
// to Twilio: no account_sid, just the app's phone_number_id and a bearer
// access_token. Free tier caps recipients to numbers verified as testers in
// the Meta developer console until the app goes through business
// verification, but sending itself isn't billed per-message like Twilio.
async function sendViaMetaCloudApi(
  settings: { phone_number_id: string | null; access_token: string | null },
  recipientPhone: string,
  body: string,
): Promise<SendOutcome> {
  const res = await fetch(`https://graph.facebook.com/v21.0/${settings.phone_number_id}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: recipientPhone.replace(/^\+/, ""),
      type: "text",
      text: { body },
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    messages?: { id?: string }[];
    error?: { message?: string };
  };
  if (!res.ok) {
    return { ok: false, error: json.error?.message ?? `Meta Cloud API request failed (${res.status})` };
  }
  return { ok: true, providerMessageId: json.messages?.[0]?.id ?? null };
}
