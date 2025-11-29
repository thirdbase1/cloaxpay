import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: logs, error } = await supabase
      .from("webhook_logs")
      .select("*")
      .eq("merchant_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("[v0] Failed to fetch webhook logs:", error)
      return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
    }

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("[v0] Webhook logs error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
