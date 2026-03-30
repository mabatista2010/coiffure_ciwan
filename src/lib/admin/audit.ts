import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type AuditPayload = {
  actorUserId: string;
  targetUserId?: string | null;
  entityType: string;
  entityId?: string | null;
  action: "create" | "update" | "delete" | "deactivate";
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
};

export async function insertAdminAuditLog(payload: AuditPayload) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("admin_audit_log").insert([
    {
      actor_user_id: payload.actorUserId,
      target_user_id: payload.targetUserId ?? null,
      entity_type: payload.entityType,
      entity_id: payload.entityId ?? null,
      action: payload.action,
      before_json: payload.before ?? null,
      after_json: payload.after ?? null,
      meta_json: payload.meta ?? null,
    },
  ]);

  if (error) {
    console.error("admin_audit_log_insert_error", error);
  }
}
