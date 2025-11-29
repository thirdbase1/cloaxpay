import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    const supabase = createServiceRoleClient()

    const { data: transactions, error } = await supabase
      .from("payment_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("[v0] Explorer recent transactions error:", error)
      return NextResponse.json({ transactions: [] })
    }

    return NextResponse.json({ transactions: transactions || [] })
  } catch (error) {
    console.error("[v0] Explorer recent transactions error:", error)
    return NextResponse.json({ error: "Failed to fetch recent transactions" }, { status: 500 })
  }
}
