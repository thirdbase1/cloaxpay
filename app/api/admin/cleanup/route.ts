import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanupExpiredSessions } from "@/lib/session-cleanup";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user email matches admin email
    const adminEmail = "ighanghangodspower@gmail.com";
    if (user.email !== adminEmail) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    // Run cleanup
    const result = await cleanupExpiredSessions();

    return NextResponse.json({
      success: true,
      message: `Cleanup completed: ${result.cleaned} expired sessions cancelled`,
      cleaned: result.cleaned,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[v0] Admin cleanup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
