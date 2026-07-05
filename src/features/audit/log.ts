import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

// Fire-and-forget audit trail insert, called from the tail of admin-meaningful
// server actions (student/teacher/parent/class CRUD, settings changes, role
// changes, attendance lock overrides). Never throws — a failed audit write
// should never fail the action it's describing.
export async function logAuditEvent(params: {
  organizationId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("audit_logs").insert({
      organization_id: params.organizationId,
      actor_id: user?.id ?? null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      metadata: (params.metadata ?? {}) as Json,
    });

    if (error) {
      logger.warn("Failed to log audit event", { action: params.action, message: error.message });
    }
  } catch (err) {
    logger.warn("Failed to log audit event", {
      action: params.action,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
