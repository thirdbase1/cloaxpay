import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from("payment_sessions")
      .select("*", { count: "exact", head: true })

    if (countError) {
      console.error("[v0] Stats count error:", countError)
    }

    // Get last 24h count
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: last24hCount, error: last24hError } = await supabase
      .from("payment_sessions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", yesterday)

    if (last24hError) {
      console.error("[v0] Stats 24h error:", last24hError)
    }

    // Calculate total volume (sum of amount column)
    // Note: We sum the fiat 'amount' column which is in USD/EUR etc.
    const { data: volumeData, error: volumeError } = await supabase.from("payment_sessions").select("amount")

    if (volumeError) {
      console.error("[v0] Stats volume error:", volumeError)
    }

    const totalVolume = volumeData?.reduce((sum, session) => sum + (Number(session.amount) || 0), 0) || 0

    return NextResponse.json({
      total: totalCount || 0,
      last24h: last24hCount || 0,
      volume: Math.round(totalVolume),
    })
  } catch (error) {
    console.error("[v0] Explorer stats error:", error)
    return NextResponse.json({
      total: 0,
      last24h: 0,
      volume: 0,
    })
  }
}
