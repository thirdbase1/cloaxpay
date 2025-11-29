import { type NextRequest, NextResponse } from "next/server"
import { createSideShiftClient } from "@/lib/sideshift"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { findOptimalSettlement, isSamePair } from "@/lib/routing"

function getUserIp(request: NextRequest): string | undefined {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    request.ip ||
    undefined
  )
}

const TOKEN_DECIMALS: Record<string, number> = {
  usdc: 6,
  usdt: 6,
  dai: 18,
  busd: 18,
  tusd: 18,
  usdp: 18,
  gusd: 2,
  frax: 18,
  lusd: 18,
  susd: 18,
  btc: 8,
  eth: 18,
  sol: 9,
  matic: 18,
  pol: 18,
  avax: 18,
  bnb: 18,
  trx: 6,
  xrp: 6,
  ltc: 8,
  doge: 8,
  ada: 6,
  dot: 10,
  link: 18,
  uni: 18,
  atom: 6,
  xlm: 7,
  algo: 6,
  near: 24,
  ftm: 18,
  arb: 18,
  op: 18,
}

function getSettleDecimals(token: string): number {
  const tokenLower = token.toLowerCase()
  // SideShift has a max of 6 decimals for settle amounts
  const tokenDecimals = TOKEN_DECIMALS[tokenLower] || 8
  return Math.min(tokenDecimals, 6)
}

async function getTokenPriceInUSD(coin: string): Promise<number | null> {
  try {
    const coinIds: Record<string, string> = {
      btc: "bitcoin",
      eth: "ethereum",
      usdt: "tether",
      usdc: "usd-coin",
      dai: "dai",
      bnb: "binancecoin",
      sol: "solana",
      matic: "matic-network",
      pol: "matic-network",
      avax: "avalanche-2",
      trx: "tron",
      xrp: "ripple",
      ltc: "litecoin",
      doge: "dogecoin",
      ada: "cardano",
      dot: "polkadot",
      link: "chainlink",
      uni: "uniswap",
      atom: "cosmos",
      xlm: "stellar",
      algo: "algorand",
      near: "near",
      ftm: "fantom",
      arb: "arbitrum",
      op: "optimism",
    }

    const coinLower = coin.toLowerCase()
    const coinId = coinIds[coinLower]

    if (["usdt", "usdc", "dai", "busd", "tusd", "usdp", "gusd", "frax", "lusd", "susd"].includes(coinLower)) {
      return 1
    }

    if (!coinId) {
      return null
    }

    // CoinGecko free API - no key needed
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`, {
      next: { revalidate: 30 }, // Cache for 30 seconds
      headers: {
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      console.error("[v0] CoinGecko API error:", response.status)
      return null
    }

    const data = await response.json()
    return data[coinId]?.usd || null
  } catch (error) {
    console.error("[v0] Error fetching token price:", error)
    return null
  }
}

function formatSettleAmount(amount: number, token: string): string {
  const decimals = getSettleDecimals(token)
  // Use toFixed but ensure we don't exceed 6 decimals (SideShift max)
  const formatted = amount.toFixed(decimals)
  // Remove trailing zeros but keep at least one decimal
  return formatted.replace(/\.?0+$/, "") || "0"
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, currency, depositCoin, depositNetwork, merchantId, sessionId } = body
    const userIp = getUserIp(request)

    if (!amount || !depositCoin || !depositNetwork) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    let actualMerchantId = merchantId
    if (!actualMerchantId && sessionId) {
      const supabase = createServiceRoleClient()
      const { data: session } = await supabase
        .from("payment_sessions")
        .select("merchant_id")
        .eq("session_id", sessionId)
        .single()

      if (session) {
        actualMerchantId = session.merchant_id
      }
    }

    if (!actualMerchantId) {
      return NextResponse.json({ error: "Merchant ID required" }, { status: 400 })
    }

    const routing = await findOptimalSettlement(depositCoin, depositNetwork, actualMerchantId)

    if (!routing) {
      return NextResponse.json({ error: "Merchant has not configured a wallet to receive payments" }, { status: 400 })
    }

    const { settleCoin, settleNetwork } = routing

    if (isSamePair(depositCoin, depositNetwork, settleCoin, settleNetwork)) {
      return NextResponse.json(
        {
          error: "same_pair",
          message: `Cannot deposit ${depositCoin} on ${depositNetwork} - merchant receives on the same chain. Please select a different coin or network.`,
        },
        { status: 400 },
      )
    }

    const sideshift = createSideShiftClient()

    try {
      const perms = await sideshift.checkPermissions(userIp)
      if (!perms.createShift) {
        return NextResponse.json({ error: "Service unavailable in your region" }, { status: 403 })
      }
    } catch (e) {
      console.error("[v0] Permission check failed:", e)
    }

    let settleAmountInToken: string
    let settleAmountUSD = 0

    if (currency === "USD" || !currency) {
      const settleTokenPrice = await getTokenPriceInUSD(settleCoin)

      if (settleTokenPrice === null) {
        console.error("[v0] Could not get price for settlement token:", settleCoin)
        return NextResponse.json(
          { error: `Unable to get current price for ${settleCoin.toUpperCase()}. Please try again.` },
          { status: 500 },
        )
      }

      // Convert: $10 USD / $1 per USDC = 10 USDC
      const amountInToken = Number.parseFloat(amount) / settleTokenPrice

      settleAmountInToken = formatSettleAmount(amountInToken, settleCoin)
      settleAmountUSD = Number.parseFloat(amount)

      console.log("[v0] USD to token conversion:", {
        usdAmount: amount,
        tokenPrice: settleTokenPrice,
        tokenAmount: settleAmountInToken,
        token: settleCoin,
      })
    } else {
      settleAmountInToken = formatSettleAmount(Number.parseFloat(amount), settleCoin)
    }

    const quote = await sideshift.requestQuote(
      depositCoin.toLowerCase(),
      depositNetwork.toLowerCase(),
      settleCoin.toLowerCase(),
      settleNetwork.toLowerCase(),
      undefined,
      settleAmountInToken,
      userIp,
    )

    const settleTokenPrice = await getTokenPriceInUSD(settleCoin)
    const merchantReceivesUSD = settleTokenPrice
      ? Number.parseFloat(quote.settleAmount) * settleTokenPrice
      : settleAmountUSD

    return NextResponse.json({
      success: true,
      depositAmount: quote.depositAmount,
      settleAmount: quote.settleAmount,
      settleAmountUSD: merchantReceivesUSD.toFixed(2),
      rate: quote.rate,
      expiresAt: quote.expiresAt,
      quoteId: quote.id,
      depositCoin: depositCoin.toUpperCase(),
      depositNetwork: depositNetwork,
      settleCoin: settleCoin.toUpperCase(),
      settleNetwork: settleNetwork,
      networkFee: quote.settleCoinNetworkFee,
      networkFeeUsd: quote.networkFeeUsd,
    })
  } catch (error: any) {
    console.error("[v0] Quote error:", error)

    if (error.data?.message) {
      return NextResponse.json({ error: error.data.message }, { status: 400 })
    }

    return NextResponse.json({ error: error.message || "Failed to get quote" }, { status: 500 })
  }
}
