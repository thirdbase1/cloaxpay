import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSideShiftClient } from "@/lib/sideshift";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shiftId, status, depositAmount, settleAmount, txHash } = body;

    console.log("[v0] Webhook received:", body);

    const supabase = await createClient();
    
    const { data: session } = await supabase
      .from("payment_sessions")
      .select("*")
      .contains("metadata", { shift_id: shiftId })
      .single();

    if (!session) {
      console.error("[v0] Session not found for shift:", shiftId);
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    let newStatus = session.status;
    if (status === "settled") {
      newStatus = "completed";
      
      await supabase.from("transactions").insert({
        session_id: session.id,
        merchant_id: session.merchant_id,
        amount_received: depositAmount,
        amount_settled: settleAmount,
        deposit_tx_hash: txHash,
        status: "completed",
        metadata: { shift_id: shiftId, webhook_received_at: new Date().toISOString() },
      });
    } else if (status === "pending") {
      newStatus = "processing";
    }

    await supabase
      .from("payment_sessions")
      .update({ status: newStatus })
      .eq("id", session.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[v0] Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
