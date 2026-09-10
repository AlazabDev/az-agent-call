import { supabaseAdmin } from "../supabase.js";

export interface DaftraAuditLogItem {
  agentId: string;
  callSessionId?: string;
  action: string;
  entityType?: string;
  entityId?: string | number;
  success: boolean;
  httpStatus?: number;
  errorCode?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export async function logDaftraAction(item: DaftraAuditLogItem): Promise<void> {
  try {
    if (supabaseAdmin) {
      await supabaseAdmin.from("daftra_action_log").insert({
        agent_id: item.agentId,
        call_session_id: item.callSessionId,
        action: item.action,
        entity_type: item.entityType,
        entity_id: item.entityId ? String(item.entityId) : null,
        success: item.success,
        http_status: item.httpStatus,
        error_code: item.errorCode,
        duration_ms: item.durationMs,
        metadata: item.metadata || {},
        created_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("[DAFTRA_AUDIT] Failed to log action:", err);
  }
}
