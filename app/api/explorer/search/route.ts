import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server" // Use service role client

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")

    if (!query) {
      return NextResponse.json({ transactions: [] })
    }

    const supabase = createServiceRoleClient() // Use service role to bypass RLS

    const { data: transactionLogs, error } = await supabase
      .from("transaction_logs")
      .select("*")
      .or(
        `session_id.ilike.%${query}%,deposit_tx_hash.ilike.%${query}%,sideshift_id.ilike.%${query}%,deposit_address.ilike.%${query}%`,
      )
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("[v0] Explorer search error:", error)
      return NextResponse.json({ transactions: [] })
    }

    return NextResponse.json({ transactions: transactionLogs || [] })
  } catch (error) {
    console.error("[v0] Explorer search error:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
