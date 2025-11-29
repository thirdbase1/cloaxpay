import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = await createClient();

    // Check if session exists
    const { data: session, error: sessionError } = await supabase
      .from("payment_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    // Get merchant if session exists
    let merchant = null;
    if (session) {
      const { data: merchantData } = await supabase
        .from("merchants")
        .select("*")
        .eq("id", session.merchant_id)
        .maybeSingle();
      merchant = merchantData;
    }

    return NextResponse.json({
      sessionId,
      sessionExists: !!session,
      sessionData: session,
      sessionError: sessionError?.message,
      merchant,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
