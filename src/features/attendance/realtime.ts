import { createClient } from "@/lib/supabase/client";

// Subscribing before the browser client has hydrated its session from
// cookies leaves the realtime socket authenticated as anon, so the
// RLS-gated postgres_changes events (organization_id in (get_user_org_ids()))
// never pass and are silently dropped — awaiting getSession() first ensures
// the client's JWT is set before the channel joins.
export function subscribeToOrgAttendance(organizationId: string, onChange: () => void) {
  const supabase = createClient();
  let cancelled = false;
  let channel: ReturnType<typeof supabase.channel> | null = null;

  void supabase.auth.getSession().then(() => {
    if (cancelled) return;
    channel = supabase
      .channel(`attendance:${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_sessions",
          filter: `organization_id=eq.${organizationId}`,
        },
        onChange,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_records",
          filter: `organization_id=eq.${organizationId}`,
        },
        onChange,
      )
      .subscribe();
  });

  return () => {
    cancelled = true;
    if (channel) supabase.removeChannel(channel);
  };
}
