import { createClient } from "@/lib/supabase/server"
import { createSideShiftClient } from "@/lib/sideshift"

interface ProcessPaymentParams {
  sessionId: string
  depositChain: string
  depositToken: string
  userIp?: string
}

export async function processPayment({ sessionId, depositChain, depositToken, userIp }: ProcessPaymentParams) {
  const supabase = await createClient()

  // Get payment session
  const { data: session, error: sessionError } = await supabase
    .from("payment_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .single()

  if (sessionError || !session) {
    throw new Error("Payment session not found")
  }

  // Get merchant profile
  const { data: merchant, error: merchantError } = await supabase
    .from("merchants")
    .select("*")
    .eq("id", session.merchant_id)
    .single()

  if (merchantError || !merchant) {
    throw new Error("Merchant not found")
  }

  const sideshift = createSideShiftClient()

  // 1. Get enabled settlement tokens from merchant settings
  const settlementTokens = merchant.settlement_tokens || [
    { symbol: merchant.preferred_token || "USDC", network: "ethereum", enabled: true },
  ]
  const enabledTokens = settlementTokens.filter((t: any) => t.enabled)

  if (enabledTokens.length === 0) {
    throw new Error("No enabled settlement tokens found for merchant")
  }

  // This prevents "same token" errors (SOL->SOL) and ensures merchants get stablecoins.
  let bestSettlement = enabledTokens[0]

  const chain = depositChain.toLowerCase()
  // Helper to find stablecoin on a specific network
  const findStableOn = (net: string) =>
    enabledTokens.find((t: any) => t.network === net && (t.symbol.includes("USDC") || t.symbol.includes("USDT")))

  if (chain === "solana" || chain === "sol") {
    // 1. Try USDC/USDT on Solana first
    const stable = findStableOn("solana")
    if (stable) bestSettlement = stable
    // 2. Fallback to any Solana token (unlikely if filtered properly)
    else {
      const anySol = enabledTokens.find((t: any) => t.network === "solana")
      if (anySol) bestSettlement = anySol
    }
  } else if (chain === "ethereum" || chain === "eth") {
    const stable = findStableOn("ethereum")
    if (stable) bestSettlement = stable
    else {
      const anyEth = enabledTokens.find((t: any) => t.network === "ethereum")
      if (anyEth) bestSettlement = anyEth
    }
  } else if (chain === "base") {
    const stable = findStableOn("base")
    if (stable) bestSettlement = stable
    else {
      const anyBase = enabledTokens.find((t: any) => t.network === "base")
      if (anyBase) bestSettlement = anyBase
    }
  } else if (chain === "polygon" || chain === "matic") {
    const stable = findStableOn("polygon")
    if (stable) bestSettlement = stable
    else {
      const anyPoly = enabledTokens.find((t: any) => t.network === "polygon")
      if (anyPoly) bestSettlement = anyPoly
    }
  } else if (chain === "bitcoin" || chain === "btc") {
    // For BTC, we usually just want BTC
    const btc = enabledTokens.find((t: any) => t.network === "bitcoin" && t.symbol === "BTC")
    if (btc) bestSettlement = btc
  }

  const settleCoin = bestSettlement.symbol
  const settleNetwork = bestSettlement.network

  const { data: wallet } = await supabase
    .from("merchant_wallets")
    .select("*")
    .eq("merchant_id", merchant.id)
    .eq("network", settleNetwork)
    .eq("token", settleCoin) // Try to find exact token match first
    .single()

  let settlementAddress = wallet?.address

  // Fallback: Try finding any wallet for that network if specific token wallet not found
  if (!settlementAddress) {
    const { data: fallbackWallet } = await supabase
      .from("merchant_wallets")
      .select("*")
      .eq("merchant_id", merchant.id)
      .eq("network", settleNetwork)
      .limit(1)
      .single()

    settlementAddress = fallbackWallet?.address
  }

  if (!settlementAddress) {
    throw new Error(`Merchant wallet not configured for ${settleCoin} on ${settleNetwork}`)
  }

  try {
    // Create variable shift with SideShift
    const shift = await sideshift.createVariableShift(
      depositToken,
      depositChain,
      settleCoin,
      settleNetwork,
      settlementAddress,
      undefined, // refundAddress
      undefined, // refundMemo
      userIp,
    )

    // Update session with deposit address
    const { error: updateError } = await supabase
      .from("payment_sessions")
      .update({
        deposit_address: shift.depositAddress,
        deposit_chain: `${depositToken}/${depositChain}`,
        status: "awaiting_payment",
        metadata: {
          ...session.metadata,
          shift_id: shift.id,
          settlement_token: settleCoin,
          settlement_network: settleNetwork,
        },
      })
      .eq("session_id", sessionId)

    if (updateError) {
      console.error("[v0] Failed to update session:", updateError)
      throw new Error("Failed to update payment session")
    }

    return {
      depositAddress: shift.depositAddress,
      shiftId: shift.id,
    }
  } catch (error) {
    console.error("[v0] SideShift error:", error)
    throw new Error("Failed to create payment shift")
  }
}

export async function checkPaymentStatus(sessionId: string) {
  const supabase = await createClient()

  const { data: session, error } = await supabase
    .from("payment_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .single()

  if (error || !session) {
    throw new Error("Payment session not found")
  }

  // If we have a shift ID, check SideShift status
  if (session.metadata?.shift_id) {
    const sideshift = createSideShiftClient()
    try {
      const shift = await sideshift.getShiftStatus(session.metadata.shift_id)

      // Update session status based on shift status
      let newStatus = session.status
      if (shift.status === "settled") {
        newStatus = "completed"
      } else if (shift.status === "pending" || shift.status === "processing") {
        newStatus = "processing"
      } else if (shift.status === "failed") {
        newStatus = "failed"
      }

      if (newStatus !== session.status) {
        await supabase.from("payment_sessions").update({ status: newStatus }).eq("session_id", sessionId)
      }

      return {
        ...session,
        status: newStatus,
        shift,
      }
    } catch (error) {
      console.error("[v0] Failed to check shift status:", error)
    }
  }

  return session
}
