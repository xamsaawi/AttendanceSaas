import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

// Accepts whichever client the caller already has (request-scoped SSR client
// for in-request triggers, service-role client for the cron job) rather than
// creating its own — the recipient is often someone other than the current
// session user, so this can't rely on RLS-via-auth.uid() convenience.
export async function createNotification(
  supabase: SupabaseClient<Database>,
  params: {
    organizationId: string;
    recipientId: string;
    type: string;
    title: string;
    body?: string;
    link?: string;
  },
): Promise<void> {
  await supabase.from("notifications").insert({
    organization_id: params.organizationId,
    recipient_id: params.recipientId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    link: params.link ?? null,
  });
}
