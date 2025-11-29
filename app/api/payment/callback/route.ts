import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { callMerchantWebhook } from "@/lib/webhook" // Import secure webhook caller

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id, status, metadata } = body

    console.log("[v0] Payment callback triggered:", { session_id, status })

    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Get the session to find callback URL from metadata
    const { data: session } = await supabase
      .from("payment_sessions")
      .select(
        "metadata, merchant_id, amount, currency, deposit_address, deposit_chain, merchants(webhook_url, webhook_secret, test_mode)",
      )
      .eq("session_id", session_id)
      .single()

    if (!session) {
      console.error("[v0] Session not found:", session_id)
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Check if merchant has configured a webhook URL
    const merchant = session.merchants

    const callbackUrl = session.metadata?.callback_url || merchant?.webhook_url

    if (!callbackUrl) {
      console.log("[v0] No callback URL configured for session:", session_id)
      return NextResponse.json({ success: true, message: "No callback URL configured" })
    }

    // Send callback to merchant's server
    try {
      const callbackPayload = {
        event:
          status === "completed"
            ? "payment.completed"
            : status === "failed"
              ? "payment.failed"
              : status === "confirming"
                ? "payment.confirming"
                : "payment.pending",
        session_id,
        status,
        amount: session.amount,
        currency: session.currency,
        deposit_address: session.deposit_address, // Add missing fields
        deposit_chain: session.deposit_chain, // Add missing fields
        metadata: session.metadata,
        test_mode: merchant?.test_mode || false, // Add test_mode
        timestamp: new Date().toISOString(),
      }

      console.log("[v0] Sending callback to:", callbackUrl)

      const secret = merchant?.webhook_secret || "default_secret"
      const success = await callMerchantWebhook(
        callbackUrl,
        callbackPayload,
        secret,
        session.merchant_id, // Pass merchant_id
        session_id, // Pass session_id
      )

      if (!success) {
        console.error("[v0] Callback failed to deliver")
      }
    } catch (error) {
      console.error("[v0] Failed to send callback to merchant:", error)
      // Don't fail the request if callback fails
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Payment callback error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
