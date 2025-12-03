import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { createSideShiftClient } from "@/lib/sideshift"
import { findOptimalSettlement } from "@/lib/routing"

const MEMO_NETWORKS = ["ripple", "xrp", "stellar", "xlm", "eos", "bnb", "binance", "ton", "cosmos", "atom"]

function getUserIp(request: NextRequest): string | undefined {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    request.ip ||
    undefined
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, depositCoin, depositNetwork, refundAddress, refundMemo } = body

    const userIp = getUserIp(request)
    console.log("[v0] Select chain request:", { sessionId, depositCoin, depositNetwork, userIp })

    if (!sessionId || !depositCoin || !depositNetwork || !refundAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { data: session } = await supabase
      .from("payment_sessions")
      .select("merchant_id")
      .eq("session_id", sessionId)
      .single()

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Get merchant's wallet - no smart routing
    const routing = await findOptimalSettlement(depositCoin, depositNetwork, session.merchant_id)

    if (!routing) {
      return NextResponse.json(
        { error: "Merchant has not configured a wallet to receive payments. Please contact the merchant." },
        { status: 400 },
      )
    }

    const { settleCoin, settleNetwork, settleAddress } = routing

    // Check if same pair (user is depositing exactly what merchant receives)
    const isSamePair =
      depositCoin.toUpperCase() === settleCoin.toUpperCase() &&
      depositNetwork.toLowerCase() === settleNetwork.toLowerCase()

    console.log("[v0] Routing:", {
      deposit: `${depositCoin}-${depositNetwork}`,
      settlement: `${settleCoin}-${settleNetwork}`,
      isSamePair,
    })

    // If same pair - direct transfer, no SideShift needed
    if (isSamePair) {
      await supabase
        .from("payment_sessions")
        .update({
          status: "awaiting_payment",
          deposit_address: settleAddress,
        })
        .eq("session_id", sessionId)

      return NextResponse.json({
        success: true,
        depositAddress: settleAddress,
        settleCoin,
        settleNetwork,
        samePair: true,
        message: "Direct transfer - send directly to this address. No conversion needed.",
      })
    }

    // Different pair - use SideShift for conversion
    const sideShift = createSideShiftClient()

    try {
      const perms = await sideShift.checkPermissions(userIp)
      if (!perms.createShift) {
        return NextResponse.json({ error: "Service unavailable in your region" }, { status: 403 })
      }
    } catch (e) {
      console.error("[v0] Permission check failed, proceeding anyway", e)
    }

    const memoToSend = MEMO_NETWORKS.includes(depositNetwork.toLowerCase()) ? refundMemo : undefined

    console.log(`[v0] Creating shift: ${depositCoin}-${depositNetwork} -> ${settleCoin}-${settleNetwork}`)

    const shift = await sideShift.createVariableShift(
      depositCoin,
      depositNetwork,
      settleCoin,
      settleNetwork,
      settleAddress,
      refundAddress,
      memoToSend,
      userIp,
    )

    console.log("[v0] Shift created:", shift.id)

    await supabase
      .from("payment_sessions")
      .update({
        sideshift_order_id: shift.id,
        status: "awaiting_payment",
        deposit_address: shift.depositAddress,
        deposit_amount_crypto: shift.depositAmount,
        settle_amount_crypto: shift.settleAmount,
        sideshift_expires_at: shift.expiresAt,
      })
      .eq("session_id", sessionId)

    return NextResponse.json({
      success: true,
      depositAddress: shift.depositAddress,
      depositAmount: shift.depositAmount,
      settleCoin,
      settleNetwork,
      expiresAt: shift.expiresAt,
      depositMin: shift.depositMin,
      depositMax: shift.depositMax,
      shiftId: shift.id,
    })
  } catch (error: any) {
    console.error("[v0] Select chain error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
