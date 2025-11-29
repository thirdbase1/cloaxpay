import { createServiceRoleClient } from "@/lib/supabase/server"

// No more smart routing - simple merchant wallet lookup
export interface RoutingResult {
  settleCoin: string
  settleNetwork: string
  settleAddress: string
  reason: string
}

export async function findOptimalSettlement(
  depositCoin: string,
  depositNetwork: string,
  merchantId: string,
): Promise<RoutingResult | null> {
  const supabase = createServiceRoleClient()

  // Get merchant's primary wallet - only ONE wallet allowed at a time
  const { data: merchantWallets, error } = await supabase
    .from("merchant_wallets")
    .select("chain, address, token, network, is_primary")
    .eq("merchant_id", merchantId)
    .order("is_primary", { ascending: false })
    .limit(1)

  if (error) {
    console.log("[v0] Error fetching merchant wallets:", error.message)
    return null
  }

  if (!merchantWallets || merchantWallets.length === 0) {
    console.log("[v0] No wallet configured for merchant:", merchantId)
    return null
  }

  const wallet = merchantWallets[0]

  console.log("[v0] Found merchant wallet:", {
    chain: wallet.chain,
    token: wallet.token,
    network: wallet.network,
    address: wallet.address?.substring(0, 10) + "...",
  })

  // Simple routing - just use merchant's configured wallet
  // SideShift handles all conversions automatically
  return {
    settleCoin: wallet.token || wallet.chain.toUpperCase(),
    settleNetwork: wallet.network || wallet.chain,
    settleAddress: wallet.address,
    reason: "merchant_wallet",
  }
}

export function isSamePair(
  depositCoin: string,
  depositNetwork: string,
  settleCoin: string,
  settleNetwork: string,
): boolean {
  return (
    depositCoin.toUpperCase() === settleCoin.toUpperCase() &&
    depositNetwork.toLowerCase() === settleNetwork.toLowerCase()
  )
}
