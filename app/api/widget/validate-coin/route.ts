import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"

const STABLECOINS = ["USDC", "USDT", "DAI", "BUSD", "TUSD", "FRAX", "USDP", "GUSD", "LUSD", "SUSD", "PYUSD"]

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

    // - rate means "1 depositCoin = X settleCoin"
    // - min/max are in DEPOSIT coin units
    //
    // Case 1: Deposit is stablecoin (USDC→ETH): min/max are already in USD
    // Case 2: Settle is stablecoin (ETH→USDC): minUsd = min * rate, maxUsd = max * rate
    // Case 3: Neither is stablecoin (ETH→ETH): Need to fetch USD price

    const depositCoinUpper = depositCoin.toUpperCase()
    const settleCoinUpper = settleCoin.toUpperCase()
    const isDepositStablecoin = STABLECOINS.includes(depositCoinUpper)
    const isSettleStablecoin = STABLECOINS.includes(settleCoinUpper)

    let minUsd: number
    let maxUsd: number

    if (isDepositStablecoin) {
      // Deposit coin IS the stablecoin, so min/max are already in USD
      minUsd = min
      maxUsd = max
      console.log("[v0] Deposit is stablecoin - using min/max directly as USD")
    } else if (isSettleStablecoin && rate > 0) {
      // Settle coin is stablecoin, so rate tells us USD value
      // 1 depositCoin = rate settleCoin ≈ rate USD
      minUsd = min * rate
      maxUsd = max * rate
      console.log("[v0] Settle is stablecoin - calculating: min*rate, max*rate")
    } else if (rate > 0) {
      // Neither is stablecoin (e.g., ETH→ETH cross-chain or ETH→BTC)
      // We need to get the USD price of the deposit coin
      // Fetch price from a simple API
      try {
        const priceResponse = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${getCoingeckoId(depositCoinUpper)}&vs_currencies=usd`,
        )
        if (priceResponse.ok) {
          const priceData = await priceResponse.json()
          const coinId = getCoingeckoId(depositCoinUpper)
          const usdPrice = priceData[coinId]?.usd || 0
          if (usdPrice > 0) {
            minUsd = min * usdPrice
            maxUsd = max * usdPrice
            console.log(`[v0] Fetched ${depositCoinUpper} price: $${usdPrice}, minUsd: ${minUsd}, maxUsd: ${maxUsd}`)
          } else {
            // Fallback: assume rate approximates relative value
            minUsd = 0
            maxUsd = 999999
          }
        } else {
          minUsd = 0
          maxUsd = 999999
        }
      } catch (priceError) {
        console.error("[v0] Price fetch error:", priceError)
        // Fallback - don't show USD limits
        minUsd = 0
        maxUsd = 999999
      }
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
      isDepositStablecoin,
      isSettleStablecoin,
      depositCoin: depositCoinUpper,
      settleCoin: settleCoinUpper,
    })

    // User wants to pay `amount` in USD
    // We need to calculate how much deposit coin that requires
    let isWithinRange = true
    let estimatedDepositAmount = 0

    if (amount > 0) {
      if (isDepositStablecoin) {
        // Deposit is stablecoin, so amount USD = amount depositCoin
        estimatedDepositAmount = amount
      } else if (isSettleStablecoin && rate > 0) {
        // amount USD = amount settleCoin, so depositAmount = amount / rate
        estimatedDepositAmount = amount / rate
      } else if (minUsd > 0 && maxUsd < 999999) {
        // We have USD prices, calculate deposit amount
        const depositUsdPrice = maxUsd / max // USD per deposit coin
        estimatedDepositAmount = amount / depositUsdPrice
      } else {
        // Can't calculate, assume within range
        estimatedDepositAmount = 0
      }

      if (estimatedDepositAmount > 0) {
        // Check with 1% buffer for rate fluctuations
        isWithinRange = estimatedDepositAmount >= min * 0.99 && estimatedDepositAmount <= max * 1.01
      }

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
    if (!isWithinRange && estimatedDepositAmount > 0) {
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

function getCoingeckoId(symbol: string): string {
  const mapping: Record<string, string> = {
    BTC: "bitcoin",
    ETH: "ethereum",
    SOL: "solana",
    MATIC: "matic-network",
    POL: "matic-network",
    AVAX: "avalanche-2",
    BNB: "binancecoin",
    XRP: "ripple",
    ADA: "cardano",
    DOGE: "dogecoin",
    DOT: "polkadot",
    LINK: "chainlink",
    UNI: "uniswap",
    ATOM: "cosmos",
    LTC: "litecoin",
    TRX: "tron",
    XLM: "stellar",
    ALGO: "algorand",
    FTM: "fantom",
    NEAR: "near",
    ARB: "arbitrum",
    OP: "optimism",
  }
  return mapping[symbol.toUpperCase()] || symbol.toLowerCase()
}
