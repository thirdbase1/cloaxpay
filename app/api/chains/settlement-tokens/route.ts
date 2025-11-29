import { NextResponse } from "next/server"

export async function GET() {
  // Hardcoded list of supported stablecoins and their networks
  // This matches the user's specific requirements and prevents crashes
  const tokens = [
    {
      coin: "USDT",
      name: "Tether",
      networks: ["tron", "aptos", "ethereum", "avalanche", "optimism", "solana", "bsc", "ton", "liquid"],
    },
    {
      coin: "USDC",
      name: "USD Coin",
      networks: [
        "solana",
        "bsc",
        "aptos",
        "sonic",
        "hyperevm",
        "ethereum",
        "base",
        "polygon",
        "arbitrum",
        "sui",
        "avalanche",
        "optimism",
        "algorand",
        "stellar",
      ],
    },
    {
      coin: "DAI",
      name: "Dai",
      networks: ["ethereum", "arbitrum", "optimism", "polygon", "avalanche", "base"],
    },
  ]

  return NextResponse.json({
    success: true,
    tokens: tokens,
  })
}
