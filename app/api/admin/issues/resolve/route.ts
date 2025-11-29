import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { issue_id, status, admin_notes } = body;

    if (!issue_id || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    const { data: authUser } = await supabase.auth.getUser();
    
    const updates: any = {
      status,
      resolved_at: new Date().toISOString(),
      resolved_by: authUser.user?.id || null,
    };

    if (admin_notes) {
      updates.admin_notes = admin_notes;
    }

    const { error } = await supabase
      .from("issue_reports")
      .update(updates)
      .eq("id", issue_id);

    if (error) {
      console.error("[v0] Failed to update issue:", error);
      return NextResponse.json(
        { error: "Failed to update issue" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[v0] Issue resolve error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
