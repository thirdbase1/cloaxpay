import { createServiceRoleClient } from "@/lib/supabase/server";

export type ActivityType =
  | "payment_created"
  | "payment_completed"
  | "payment_failed"
  | "widget_opened"
  | "chain_selected"
  | "address_copied"
  | "marked_sent"
  | "api_key_generated"
  | "api_key_revoked"
  | "settings_updated"
  | "webhook_sent"
  | "webhook_failed"
  | "merchant_registered"
  | "login"
  | "logout";

export interface LogActivityParams {
  merchantId: string;
  activityType: ActivityType;
  entityType?: string;
  entityId?: string;
  description?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    const { error } = await supabase.from("activity_logs").insert({
      merchant_id: params.merchantId,
      activity_type: params.activityType,
      entity_type: params.entityType,
      entity_id: params.entityId,
      description: params.description,
      metadata: params.metadata || {},
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
    });

    if (error) {
      console.error("[v0] Failed to log activity:", error);
    }
  } catch (error) {
    console.error("[v0] Error logging activity:", error);
  }
}

// Helper to get IP and user agent from request
export function getRequestInfo(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  
  return { ipAddress: ip, userAgent };
}
