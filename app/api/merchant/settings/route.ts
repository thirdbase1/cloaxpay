import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: merchant, error } = await supabase.from("merchants").select("*").eq("id", user.id).single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      settings: {
        business_name: merchant.business_name,
        webhook_url: merchant.webhook_url || "",
        webhook_secret: merchant.webhook_secret,
        preferred_token: merchant.preferred_token,
        settlement_tokens: merchant.settlement_tokens || [{ symbol: "USDC", network: "ethereum", enabled: true }],
        accept_any_chain: merchant.accept_any_chain,
        auto_gas_coverage: merchant.auto_gas_coverage,
        success_url: merchant.success_url || "",
        cancel_url: merchant.cancel_url || "",
        notification_webhook_enabled: merchant.notification_webhook_enabled,
        notification_daily_summary: merchant.notification_daily_summary,
      },
    })
  } catch (error) {
    console.error("[v0] Settings GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      business_name,
      webhook_url,
      webhook_secret,
      preferred_token,
      settlement_tokens,
      accept_any_chain,
      auto_gas_coverage,
      success_url,
      cancel_url,
      notification_webhook_enabled,
      notification_daily_summary,
    } = body

    const updateData: any = {
      business_name,
      webhook_url,
      webhook_secret,
      preferred_token,
      accept_any_chain,
      auto_gas_coverage,
      success_url,
      cancel_url,
      notification_webhook_enabled,
      notification_daily_summary,
      updated_at: new Date().toISOString(),
    }

    if (settlement_tokens) {
      updateData.settlement_tokens = settlement_tokens
    }

    const { error } = await supabase.from("merchants").update(updateData).eq("id", user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Settings PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
