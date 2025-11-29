import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, issue_type, description, tx_hash, user_email } = body;

    if (!session_id || !issue_type || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get session to find merchant
    const { data: session } = await supabase
      .from("payment_sessions")
      .select("merchant_id")
      .eq("session_id", session_id)
      .single();

    const userIp = request.headers.get("x-forwarded-for") || 
                   request.headers.get("x-real-ip") || 
                   "unknown";

    // Create issue report
    const { data: issue, error } = await supabase
      .from("issue_reports")
      .insert({
        session_id,
        merchant_id: session?.merchant_id || null,
        issue_type,
        description,
        tx_hash: tx_hash || null,
        user_email: user_email || null,
        user_ip: userIp,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("[v0] Failed to create issue report:", error);
      return NextResponse.json(
        { error: "Failed to create issue report" },
        { status: 500 }
      );
    }

    // Log activity
    const { logActivity } = await import("@/lib/activity-logger");
    await logActivity({
      merchantId: session?.merchant_id || null,
      activityType: "issue_reported",
      entityType: "payment",
      entityId: session_id,
      description: `Issue reported: ${issue_type}`,
      metadata: { issue_id: issue.id, issue_type },
      ipAddress: userIp,
    });

    return NextResponse.json({ success: true, issue_id: issue.id });
  } catch (error) {
    console.error("[v0] Issue report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
