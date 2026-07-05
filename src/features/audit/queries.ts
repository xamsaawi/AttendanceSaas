import { createClient } from "@/lib/supabase/server";

export type AuditLogRow = {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export async function listAuditLogs(
  organizationId: string,
  opts?: { limit?: number; offset?: number },
): Promise<AuditLogRow[]> {
  const supabase = await createClient();
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity_type, entity_id, metadata, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    // jsonb defaults to '{}' and is only ever written as an object (see
    // logAuditEvent), so this is always an object despite the wider Json type.
    metadata: row.metadata as Record<string, unknown>,
    createdAt: row.created_at,
  }));
}
