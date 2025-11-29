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
      console.log("[v0] Same-pair blocked:", { depositCoin, depositNetwork, settleCoin, settleNetwork })
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

    const pairUrl = `https://sideshift.ai/api/v2/pair/${depositCoin}-${depositNetwork}/${settleCoin}-${settleNetwork}?amount=${amount}${affiliateId ? `&affiliateId=${affiliateId}` : ""}`

    console.log("[v0] Validating pair:", pairUrl)

    const response = await fetch(pairUrl, {
      headers: {
        "x-sideshift-secret": process.env.SIDESHIFT_SECRET || "",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] SideShift pair error:", errorText)

      // Check for geo-blocking
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

    console.log("[v0] SideShift pair response:", {
      min: data.min,
      max: data.max,
      rate: data.rate,
      depositCoin: data.depositCoin,
      settleCoin: data.settleCoin,
    })

    const min = Number.parseFloat(data.min || "0")
    const max = Number.parseFloat(data.max || "999999")
    const rate = Number.parseFloat(data.rate || "0")

    let isWithinRange = true
    let estimatedDepositAmount = 0

    // SideShift rate format: 1 depositCoin = rate settleCoin
    // So if depositCoin is ETH and settleCoin is USDC:
    //   rate = 3600 means 1 ETH = 3600 USDC
    // min/max are in DEPOSIT coin units
    // To get USD value: multiply by rate (since settle is USDC which is ~$1)

    const isSettleStablecoin = ["USDC", "USDT", "DAI", "BUSD", "TUSD", "FRAX"].includes(settleCoin.toUpperCase())

    // Calculate USD values correctly
    // min/max are in deposit coin units, rate is depositCoin->settleCoin
    // So: minUsd = min * rate, maxUsd = max * rate (if settle is stablecoin)
    let minUsd: number
    let maxUsd: number

    if (isSettleStablecoin) {
      // If settling to stablecoin, the settle amount IS the USD value
      minUsd = min * rate
      maxUsd = max * rate
    } else {
      // If settling to non-stablecoin, we need to estimate USD differently
      // For now, just use the settle amount as an approximation
      minUsd = min * rate
      maxUsd = max * rate
    }

    console.log("[v0] Calculated limits:", {
      min,
      max,
      rate,
      minUsd,
      maxUsd,
      isSettleStablecoin,
      settleCoin,
    })

    // Rate is: 1 DepositCoin = X SettleCoin
    // We assume 'amount' is in SettleCoin units (e.g. USD/USDC)
    if (rate > 0 && amount) {
      estimatedDepositAmount = amount / rate
      // Add a small buffer (1%) for rate fluctuations
      isWithinRange = estimatedDepositAmount >= min * 0.99 && estimatedDepositAmount <= max * 1.01

      console.log("[v0] Amount validation:", {
        amount,
        estimatedDepositAmount,
        min,
        max,
        isWithinRange,
      })
    }

    return NextResponse.json({
      available: isWithinRange,
      reason: !isWithinRange
        ? estimatedDepositAmount < min
          ? `Minimum: $${minUsd.toFixed(2)}`
          : `Maximum: $${maxUsd.toFixed(2)}`
        : undefined,
      minUsd: minUsd,
      maxUsd: maxUsd,
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
