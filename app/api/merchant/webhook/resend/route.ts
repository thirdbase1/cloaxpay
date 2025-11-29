import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { callMerchantWebhook } from "@/lib/webhook"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { logId } = await request.json()

    if (!logId) {
      return NextResponse.json({ error: "Missing logId" }, { status: 400 })
    }

    // Fetch the log entry to get payload and URL
    const { data: log, error } = await supabase
      .from("webhook_logs")
      .select("*")
      .eq("id", logId)
      .eq("merchant_id", user.id) // Ensure user owns the log
      .single()

    if (error || !log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 })
    }

    // Fetch merchant secret
    const { data: merchant } = await supabase.from("merchants").select("webhook_secret").eq("id", user.id).single()

    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 })
    }

    // Resend the webhook
    // We use a new attempt but link it to the same session if possible,
    // but here we are just re-triggering the call.
    // The callMerchantWebhook function will create a NEW log entry for this attempt.
    const success = await callMerchantWebhook(
      log.url,
      log.payload,
      merchant.webhook_secret || "default_secret",
      user.id,
      log.session_id,
    )

    return NextResponse.json({ success })
  } catch (error) {
    console.error("[v0] Resend webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
