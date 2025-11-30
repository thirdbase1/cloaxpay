import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { depositCoin, depositNetwork, amount, affiliateId, sessionId } = await request.json()

    if (!depositCoin || !depositNetwork || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    let settleCoin = "USDC"
    let settleNetwork = "ethereum"

    if (sessionId) {
      const supabase = createServiceRoleClient()
      const { data: session } = await supabase
        .from("payment_sessions")
        .select("merchant_id")
        .eq("session_id", sessionId)
        .single()

      if (session) {
        const { data: wallet } = await supabase
          .from("merchant_wallets")
          .select("token, network, chain")
          .eq("merchant_id", session.merchant_id)
          .order("is_primary", { ascending: false })
          .limit(1)
          .single()

        if (wallet) {
          settleCoin = wallet.token || wallet.chain.toUpperCase()
          settleNetwork = wallet.network || wallet.chain
        }
      }
    }

    const isSamePair =
      depositCoin.toLowerCase() === settleCoin.toLowerCase() &&
      depositNetwork.toLowerCase() === settleNetwork.toLowerCase()

    if (isSamePair) {
      return NextResponse.json({
        available: false,
        samePair: true,
        reason: `Cannot use ${depositCoin.toUpperCase()} on ${depositNetwork} - merchant receives on the same chain. Please select a different coin or network.`,
        depositCoin: depositCoin.toUpperCase(),
        depositNetwork: depositNetwork,
        settleCoin: settleCoin.toUpperCase(),
        settleNetwork: settleNetwork,
      })
    }

    // The amount parameter affects the rate due to network fees, causing incorrect limit display
    const pairUrl = `https://sideshift.ai/api/v2/pair/${depositCoin}-${depositNetwork}/${settleCoin}-${settleNetwork}${affiliateId ? `?affiliateId=${affiliateId}` : ""}`

    console.log("[v0] Validating pair:", pairUrl)

    const response = await fetch(pairUrl, {
      headers: {
        "x-sideshift-secret": process.env.SIDESHIFT_SECRET || "",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] SideShift pair error:", errorText)

      if (errorText.includes("access denied") || errorText.includes("geo")) {
        return NextResponse.json(
          {
            available: false,
            reason: "Service unavailable in your region",
            geoBlocked: true,
          },
          { status: 403 },
        )
      }

      return NextResponse.json(
        {
          available: false,
          reason: "Unable to process this asset",
        },
        { status: 400 },
      )
    }

    const data = await response.json()

    console.log("[v0] SideShift pair response:", JSON.stringify(data, null, 2))

    const min = Number.parseFloat(data.min || "0")
    const max = Number.parseFloat(data.max || "999999")
    const rate = Number.parseFloat(data.rate || "0")

    // For ETH→USDC: rate=3600 means 1 ETH = 3600 USDC
    // min/max are in DEPOSIT coin units
    // minUsd = min * rate, maxUsd = max * rate (when settle is stablecoin)

    const isSettleStablecoin = ["USDC", "USDT", "DAI", "BUSD", "TUSD", "FRAX"].includes(settleCoin.toUpperCase())

    let minUsd: number
    let maxUsd: number

    if (rate > 0) {
      // rate is "1 depositCoin = X settleCoin"
      // For stablecoins, settleCoin ≈ USD
      minUsd = min * rate
      maxUsd = max * rate
    } else {
      minUsd = 0
      maxUsd = 999999
    }

    console.log("[v0] Calculated limits:", {
      min,
      max,
      rate,
      minUsd: minUsd.toFixed(2),
      maxUsd: maxUsd.toFixed(2),
      isSettleStablecoin,
      settleCoin,
    })

    // User wants to pay `amount` in USD, we need depositAmount = amount / rate
    let isWithinRange = true
    let estimatedDepositAmount = 0

    if (rate > 0 && amount) {
      estimatedDepositAmount = amount / rate

      // Check with 1% buffer for rate fluctuations
      isWithinRange = estimatedDepositAmount >= min * 0.99 && estimatedDepositAmount <= max * 1.01

      console.log("[v0] Amount validation:", {
        requestedAmountUsd: amount,
        estimatedDepositAmount: estimatedDepositAmount.toFixed(8),
        minDeposit: min,
        maxDeposit: max,
        minUsd: minUsd.toFixed(2),
        maxUsd: maxUsd.toFixed(2),
        isWithinRange,
      })
    }

    let reason: string | undefined = undefined
    if (!isWithinRange && rate > 0) {
      if (estimatedDepositAmount < min) {
        reason = `Minimum: $${minUsd.toFixed(2)}`
      } else if (estimatedDepositAmount > max) {
        reason = `Maximum: $${maxUsd.toFixed(2)}`
      }
    }

    return NextResponse.json({
      available: isWithinRange,
      reason,
      minUsd,
      maxUsd,
      min: data.min,
      max: data.max,
      rate: data.rate,
      depositCoin: data.depositCoin,
      depositNetwork: data.depositNetwork,
      settleCoin: data.settleCoin,
      settleNetwork: data.settleNetwork,
    })
  } catch (error) {
    console.error("[v0] Coin validation error:", error)
    return NextResponse.json(
      {
        available: false,
        reason: "Validation failed",
      },
      { status: 500 },
    )
  }
}
