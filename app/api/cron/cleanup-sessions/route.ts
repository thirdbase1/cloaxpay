import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createSideShiftClient } from "@/lib/sideshift";
import { cleanupExpiredSessions } from "@/lib/session-cleanup";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || process.env.SECRET_KEY;
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await cleanupExpiredSessions();

    return NextResponse.json({
      success: true,
      message: `Cleanup completed: ${result.cleaned} sessions cancelled`,
      cleaned: result.cleaned,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[v0] Cleanup cron error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
