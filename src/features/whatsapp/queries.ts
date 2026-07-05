import { createClient } from "@/lib/supabase/server";

export type WhatsappSettings = {
  provider: "twilio" | null;
  accountSid: string | null;
  phoneNumberId: string | null;
  accessToken: string | null;
  isEnabled: boolean;
};

export async function getWhatsappSettings(organizationId: string): Promise<WhatsappSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("whatsapp_settings")
    .select("provider, account_sid, phone_number_id, access_token, is_enabled")
    .eq("organization_id", organizationId)
    .maybeSingle();

  return {
    // The `provider` column is a plain text field with a check constraint
    // (null or 'twilio'), so codegen can't narrow it to the literal type.
    provider: (data?.provider as "twilio" | null) ?? null,
    accountSid: data?.account_sid ?? null,
    phoneNumberId: data?.phone_number_id ?? null,
    accessToken: data?.access_token ?? null,
    isEnabled: data?.is_enabled ?? false,
  };
}

export async function listWhatsappMessages(organizationId: string, limit = 20) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select("id, recipient_phone, recipient_name, body, status, error, created_at, sent_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
