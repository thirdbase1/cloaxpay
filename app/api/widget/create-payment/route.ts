import { NextResponse } from "next/server"
import { createSideShiftClient } from "@/lib/sideshift-client"
import { createServiceRoleClient } from "@/lib/supabase/server"

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(sessionId: string): boolean {
  const now = Date.now()
  const limit = rateLimitMap.get(sessionId)

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(sessionId, { count: 1, resetAt: now + 60000 })
    return true
  }

  if (limit.count >= 5) {
    // Max 5 payment attempts per session per minute
    return false
  }

  limit.count++
  return true
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, depositCoin, refundAddress, refundMemo } = body

    if (!sessionId || typeof sessionId !== "string" || !/^sess_[a-f0-9]{48}$/.test(sessionId)) {
      return NextResponse.json({ error: "Invalid sessionId format" }, { status: 400 })
    }

    if (!checkRateLimit(sessionId)) {
      return NextResponse.json({ error: "Too many payment attempts. Please wait." }, { status: 429 })
    }

    if (!depositCoin || typeof depositCoin !== "string" || depositCoin.length > 20) {
      return NextResponse.json({ error: "Invalid depositCoin" }, { status: 400 })
    }

    if (!refundAddress || typeof refundAddress !== "string") {
      return NextResponse.json({ error: "Invalid refundAddress" }, { status: 400 })
    }

    if (refundAddress.length < 10 || refundAddress.length > 120) {
      return NextResponse.json({ error: "Invalid refundAddress format" }, { status: 400 })
    }

    if (!/^[a-zA-Z0-9:._-]+$/.test(refundAddress)) {
      return NextResponse.json({ error: "Invalid characters in refundAddress" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Get session with merchant info
    const { data: session, error: sessionError } = await supabase
      .from("payment_sessions")
      .select("*, merchants!inner(id, business_name, preferred_token)")
      .eq("session_id", sessionId)
      .single()

    if (sessionError || !session) {
      console.error("[v0] Session not found:", sessionError)
      return NextResponse.json({ error: "Session not found or expired" }, { status: 404 })
    }

    // Check session expiration
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: "Session has expired" }, { status: 400 })
    }

    if (session.status !== "pending") {
      return NextResponse.json({ error: "Payment already initiated for this session" }, { status: 400 })
    }

    const settleCoin = session.merchants.preferred_token || "usdc"
    const settleNetwork = "ethereum"

    const { data: wallet, error: walletError } = await supabase
      .from("merchant_wallets")
      .select("address")
      .eq("merchant_id", session.merchant_id)
      .eq("chain", "eth")
      .eq("is_primary", true)
      .single()

    if (walletError || !wallet) {
      console.error("[v0] Merchant wallet not found:", walletError)
      return NextResponse.json(
        {
          error: "Merchant wallet not configured",
          code: "MISSING_MERCHANT_WALLET",
        },
        { status: 500 },
      )
    }

    const sideshift = createSideShiftClient()

    const quote = await sideshift.createQuote({
      depositCoin,
      depositNetwork: null,
      settleCoin,
      settleNetwork,
      settleAmount: session.amount.toString(),
      affiliateId: process.env.SIDESHIFT_AFFILIATE_ID!,
      refundAddress,
    })

    const shift = await sideshift.createVariableShift({
      depositCoin,
      depositNetwork: null,
      settleCoin,
      settleNetwork,
      settleAddress: wallet.address,
      refundAddress,
      affiliateId: process.env.SIDESHIFT_AFFILIATE_ID!,
    })

    // Update session with shift details
    const { error: updateError } = await supabase
      .from("payment_sessions")
      .update({
        deposit_address: shift.depositAddress,
        deposit_chain: depositCoin,
        status: "awaiting_payment",
        metadata: {
          ...session.metadata,
          shift_id: shift.id,
          deposit_amount: quote.depositAmount,
          deposit_memo: shift.depositMemo,
          refund_memo: refundMemo || null,
          expires_at: shift.expiresAt,
          quote_id: quote.id,
        },
      })
      .eq("session_id", sessionId)
      .eq("status", "pending") // Ensure status hasn't changed (prevents race condition)

    if (updateError) {
      console.error("[v0] Failed to update session:", updateError)
      return NextResponse.json({ error: "Failed to update payment session" }, { status: 500 })
    }

    return NextResponse.json({
      depositAddress: shift.depositAddress,
      depositAmount: quote.depositAmount,
      depositMemo: shift.depositMemo,
      expiresAt: shift.expiresAt,
      shiftId: shift.id,
    })
  } catch (error: any) {
    console.error("[v0] Failed to create payment:", error)
    return NextResponse.json({ error: error.message || "Failed to create payment" }, { status: 500 })
  }
}
