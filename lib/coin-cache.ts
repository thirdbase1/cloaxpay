interface CachedCoinData {
  coins: any[]
  timestamp: number
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
let coinCache: CachedCoinData | null = null

export async function getCachedCoins() {
  // Return cached data if still valid
  if (coinCache && Date.now() - coinCache.timestamp < CACHE_TTL) {
    console.log("[v0] Returning cached coin data")
    return coinCache
  }

  console.log("[v0] Fetching fresh coin data from SideShift")

  // Only fetch coins list, not pairs (to avoid rate limiting)
  const coinsRes = await fetch("https://sideshift.ai/api/v2/coins")
  const coins = await coinsRes.json()

  coinCache = {
    coins: Array.isArray(coins) ? coins : [],
    timestamp: Date.now(),
  }

  return coinCache
}
