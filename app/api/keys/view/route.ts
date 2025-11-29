import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { key_id, password } = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    })

    if (authError) {
      return NextResponse.json({ error: "Invalid password" }, { status: 403 })
    }

    const serviceSupabase = await createServiceRoleClient()
    const { data: keyData, error: keyError } = await serviceSupabase
      .from("api_keys")
      .select("key_value")
      .eq("id", key_id)
      .eq("merchant_id", user.id)
      .is("revoked_at", null)
      .single()

    if (keyError || !keyData) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 })
    }

    await serviceSupabase.from("api_activity_logs").insert({
      merchant_id: user.id,
      api_key_id: key_id,
      action: "key_viewed",
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    })

    return NextResponse.json({ key_value: keyData.key_value })
  } catch (error) {
    console.error("[v0] View key error:", error)
    return NextResponse.json({ error: "Failed to retrieve key" }, { status: 500 })
  }
}
