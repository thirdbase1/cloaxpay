import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity, getRequestInfo } from "@/lib/activity-logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, event, metadata } = body;

    if (!sessionId || !event) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get session to find merchant
    const { data: session } = await supabase
      .from("payment_sessions")
      .select("id, merchant_id")
      .eq("session_id", sessionId)
      .maybeSingle();

    const { ipAddress, userAgent } = getRequestInfo(request);

    // Store widget telemetry event
    await supabase.from("widget_events").insert({
      session_id: sessionId,
      event_type: event,
      metadata: metadata || {},
      user_agent: userAgent,
      ip_address: ipAddress,
    });

    // Also log to activity logs for comprehensive tracking
    if (session) {
      const activityTypeMap: Record<string, any> = {
        'widget_opened': 'widget_opened',
        'chain_selected': 'chain_selected',
        'address_copied': 'address_copied',
        'marked_sent': 'marked_sent',
      };

      const activityType = activityTypeMap[event];
      
      if (activityType) {
        await logActivity({
          merchantId: session.merchant_id,
          activityType,
          entityType: "payment",
          entityId: session.id,
          description: `Customer ${event.replace('_', ' ')}`,
          metadata: { session_id: sessionId, ...metadata },
          ipAddress,
          userAgent,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[v0] Telemetry error:", error);
    return NextResponse.json(
      { error: "Failed to record event" },
      { status: 500 }
    );
  }
}
