import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { createSideShiftClient } from "@/lib/sideshift"
import { logActivity, getRequestInfo } from "@/lib/activity-logger"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, reason } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { data: session, error: sessionError } = await supabase
      .from("payment_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (["paid", "processing", "completed", "confirming", "swapping", "settling"].includes(session.status)) {
      return NextResponse.json(
        { error: "Cannot cancel a transaction that is already processing. Please wait for it to complete." },
        { status: 400 },
      )
    }

    const shiftId = session.sideshift_order_id || session.metadata?.shift_id

    if (shiftId) {
      try {
        const sideshift = createSideShiftClient()
        // Note: SideShift only allows cancellation after 5 minutes
        await sideshift.cancelOrder(shiftId)
        console.log("[v0] Cancelled SideShift order:", shiftId)
      } catch (error: any) {
        // Log but don't fail - SideShift may reject cancellation if too early or already processed
        console.error("[v0] SideShift cancel error (may be expected):", error?.message || error)
        // Continue to update our database regardless
      }
    }

    const status = reason === "expired" ? "expired" : "cancelled"
    const { error: updateError } = await supabase
      .from("payment_sessions")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId)

    if (updateError) {
      throw updateError
    }

    let cancelUrl = ""
    try {
      const { data: merchant } = await supabase
        .from("merchants")
        .select("cancel_url")
        .eq("id", session.merchant_id)
        .single()

      if (merchant?.cancel_url) {
        cancelUrl = merchant.cancel_url
      }
    } catch (err) {
      console.log("[v0] Could not fetch merchant cancel_url")
    }

    const { ipAddress, userAgent } = getRequestInfo(request)
    const description = reason === "expired" ? "Payment session expired after 10 minutes" : "Customer cancelled payment"

    await logActivity({
      merchantId: session.merchant_id,
      activityType: reason === "expired" ? "payment_expired" : "payment_cancelled",
      entityType: "payment",
      entityId: session.id,
      description,
      metadata: {
        session_id: sessionId,
        shift_id: shiftId,
        reason: reason || "manual",
      },
      ipAddress,
      userAgent,
    })

    await supabase.from("transaction_logs").insert({
      merchant_id: session.merchant_id,
      session_id: sessionId,
      sideshift_id: shiftId,
      status: reason === "expired" ? "expired" : "cancelled",
      deposit_address: session.deposit_address,
      deposit_coin: session.metadata?.deposit_coin,
      deposit_network: session.metadata?.deposit_network,
      user_ip: ipAddress,
      user_agent: userAgent,
      metadata: {
        shift_id: shiftId,
        reason: reason || "manual",
        cancelled_at: new Date().toISOString(),
        original_amount: session.amount,
        original_currency: session.currency,
      },
    })

    return NextResponse.json({
      success: true,
      message: reason === "expired" ? "Payment session expired" : "Payment cancelled successfully",
      cancelUrl, // Return the cancel URL for redirect
    })
  } catch (error) {
    console.error("[v0] Cancel payment error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
