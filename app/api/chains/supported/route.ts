import { NextResponse } from "next/server"
import { getCachedCoins } from "@/lib/coin-cache"

export async function GET() {
  try {
    const { coins } = await getCachedCoins()

    // Build chain list with metadata
    const chains: any[] = []

    for (const coin of coins) {
      // Skip deprecated coins
      if (coin.deprecated) continue

      for (const network of coin.networks || []) {
        chains.push({
          coin: coin.coin.toUpperCase(),
          network: network,
          name: coin.name,
          hasMemo: coin.hasMemo || false,
          // Don't include min/max here - will be fetched on selection
        })
      }
    }

    // Sort popular coins to the top
    const popularTickers = ["BTC", "ETH", "USDC", "USDT", "SOL", "BNB", "LTC", "DOGE", "XRP", "TRX"]
    chains.sort((a, b) => {
      const aIndex = popularTickers.indexOf(a.coin.toUpperCase())
      const bIndex = popularTickers.indexOf(b.coin.toUpperCase())

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({
      success: true,
      chains,
    })
  } catch (error) {
    console.error("[v0] Failed to fetch supported chains:", error)
    const fallbackChains = [
      { coin: "eth", network: "ethereum", name: "Ethereum (ETH)", min: "0.005", max: "50", hasMemo: false },
      { coin: "usdc", network: "ethereum", name: "USDC (Ethereum)", min: "10", max: "10000", hasMemo: false },
      { coin: "usdt", network: "ethereum", name: "USDT (Ethereum)", min: "10", max: "10000", hasMemo: false },
      { coin: "btc", network: "bitcoin", name: "Bitcoin (BTC)", min: "0.0005", max: "5", hasMemo: false },
      { coin: "sol", network: "solana", name: "Solana (SOL)", min: "0.1", max: "500", hasMemo: false },
      { coin: "usdc", network: "solana", name: "USDC (Solana)", min: "5", max: "10000", hasMemo: false },
      { coin: "usdt", network: "solana", name: "USDT (Solana)", min: "5", max: "10000", hasMemo: false },
      { coin: "bnb", network: "bsc", name: "BNB (BSC)", min: "0.05", max: "100", hasMemo: false },
      { coin: "usdt", network: "bsc", name: "USDT (BSC)", min: "5", max: "10000", hasMemo: false },
      { coin: "usdc", network: "bsc", name: "USDC (BSC)", min: "5", max: "10000", hasMemo: false },
      { coin: "matic", network: "polygon", name: "Polygon (MATIC)", min: "10", max: "10000", hasMemo: false },
      { coin: "usdc", network: "polygon", name: "USDC (Polygon)", min: "5", max: "10000", hasMemo: false },
      { coin: "ltc", network: "litecoin", name: "Litecoin (LTC)", min: "0.1", max: "100", hasMemo: false },
      { coin: "doge", network: "dogecoin", name: "Dogecoin (DOGE)", min: "50", max: "50000", hasMemo: false },
      { coin: "trx", network: "tron", name: "Tron (TRX)", min: "100", max: "50000", hasMemo: false },
      { coin: "usdt", network: "tron", name: "USDT (Tron)", min: "5", max: "10000", hasMemo: false },
      { coin: "xrp", network: "ripple", name: "XRP (Ripple)", min: "20", max: "10000", hasMemo: true },
      { coin: "avax", network: "avalanche", name: "Avalanche (AVAX)", min: "0.5", max: "500", hasMemo: false },
      { coin: "eth", network: "base", name: "Ethereum (Base)", min: "0.005", max: "50", hasMemo: false },
      { coin: "usdc", network: "base", name: "USDC (Base)", min: "5", max: "10000", hasMemo: false },
      { coin: "eth", network: "arbitrum", name: "Ethereum (Arbitrum)", min: "0.005", max: "50", hasMemo: false },
      { coin: "usdc", network: "arbitrum", name: "USDC (Arbitrum)", min: "5", max: "10000", hasMemo: false },
      { coin: "eth", network: "optimism", name: "Ethereum (Optimism)", min: "0.005", max: "50", hasMemo: false },
      { coin: "usdc", network: "optimism", name: "USDC (Optimism)", min: "5", max: "10000", hasMemo: false },
    ]

    return NextResponse.json({
      success: true,
      chains: fallbackChains,
    })
  }
}
