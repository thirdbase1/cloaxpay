import { type NextRequest, NextResponse } from "next/server"
import { getCachedCoins } from "@/lib/coin-cache"

export async function POST(request: NextRequest) {
  try {
    const { amount, currency } = await request.json()

    if (!amount || typeof amount !== "number") {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    // Get cached coin/pair data to avoid rate limiting
    const { coins } = await getCachedCoins()

    // Build validation results for all coins
    const validationResults: any[] = []

    for (const coin of coins) {
      for (const network of coin.networks) {
        validationResults.push({
          coin: coin.coin.toUpperCase(),
          network: network,
          name: coin.name,
          available: true,
          hasMemo: coin.hasMemo || false,
        })
      }
    }

    return NextResponse.json({
      success: true,
      coins: validationResults,
      cachedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Coin validation error:", error)
    return NextResponse.json({ error: "Failed to validate coins" }, { status: 500 })
  }
}
