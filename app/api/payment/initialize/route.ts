import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { validateApiKey } from "@/lib/api-keys"
import crypto from "crypto"
import { logActivity, getRequestInfo } from "@/lib/activity-logger"
import { cleanupExpiredSessions } from "@/lib/session-cleanup"

const MAX_AMOUNT_USD = 100000
const MIN_AMOUNT_USD = 1

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(merchantId: string): boolean {
  const now = Date.now()
  const limit = rateLimitMap.get(merchantId)

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(merchantId, { count: 1, resetAt: now + 60000 }) // 1 minute window
    return true
  }

  if (limit.count >= 30) {
    // 30 requests per minute
    return false
  }

  limit.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    // Background cleanup (non-blocking)
    cleanupExpiredSessions().catch((err) => console.error("[v0] Background cleanup failed:", err))

    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const secretKey = authHeader.replace("Bearer ", "")

    // Validate key format before DB query
    if (!secretKey.startsWith("sk_")) {
      return NextResponse.json({ error: "Invalid API key format" }, { status: 401 })
    }

    const validation = await validateApiKey(secretKey)

    if (!validation.valid || !validation.merchantId) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    }

    // Rate limiting
    if (!checkRateLimit(validation.merchantId)) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 })
    }

    const body = await request.json()
    const { amount, currency, metadata, callback_url } = body

    // Validate required fields
    if (!amount || typeof amount !== "number") {
      return NextResponse.json({ error: "Missing or invalid field: amount (must be a number)" }, { status: 400 })
    }

    if (!currency || typeof currency !== "string") {
      return NextResponse.json({ error: "Missing or invalid field: currency (must be a string)" }, { status: 400 })
    }

    // Validate amount range
    if (amount < MIN_AMOUNT_USD) {
      return NextResponse.json(
        {
          error: "invalid_amount",
          message: `Amount must be at least $${MIN_AMOUNT_USD}`,
        },
        { status: 400 },
      )
    }

    if (amount > MAX_AMOUNT_USD) {
      return NextResponse.json(
        {
          error: "amount_too_large",
          message: `Amount cannot exceed $${MAX_AMOUNT_USD}. Contact support for larger transactions.`,
        },
        { status: 400 },
      )
    }

    // Validate currency
    const supportedCurrencies = ["USD", "EUR", "GBP"]
    if (!supportedCurrencies.includes(currency.toUpperCase())) {
      return NextResponse.json(
        { error: `Unsupported currency. Supported: ${supportedCurrencies.join(", ")}` },
        { status: 400 },
      )
    }

    // Validate callback_url if provided
    if (callback_url) {
      try {
        const url = new URL(callback_url)
        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error("Invalid protocol")
        }
      } catch (e) {
        return NextResponse.json({ error: "Invalid callback_url format" }, { status: 400 })
      }
    }

    const supabase = await createServiceRoleClient()

    // Get merchant info
    const { data: merchant, error: merchantError } = await supabase
      .from("merchants")
      .select("business_name, email, preferred_token")
      .eq("id", validation.merchantId)
      .single()

    if (merchantError || !merchant) {
      console.error("[v0] Merchant not found:", merchantError)
      return NextResponse.json({ error: "Merchant account not found" }, { status: 404 })
    }

    const { data: wallets, error: walletCheckError } = await supabase
      .from("merchant_wallets")
      .select("id")
      .eq("merchant_id", validation.merchantId)
      .limit(1)

    const hasWallet = wallets && wallets.length > 0

    if (!hasWallet) {
      console.warn("[v0] Merchant has no wallet configured:", validation.merchantId)
      // Return warning but allow session creation for testing
    }

    const sessionId = `sess_${crypto.randomBytes(24).toString("hex")}`
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { data: session, error } = await supabase
      .from("payment_sessions")
      .insert({
        merchant_id: validation.merchantId,
        session_id: sessionId,
        amount,
        currency: currency.toUpperCase(),
        status: "pending",
        deposit_address: null,
        deposit_chain: null,
        metadata: {
          ...metadata,
          merchant_name: merchant.business_name,
          merchant_email: merchant.email,
          preferred_settlement_token: merchant.preferred_token || "USDC",
          callback_url: callback_url || null,
          wallet_warning: !hasWallet ? "Merchant has no wallet configured for settlements" : null,
        },
        expires_at: expiresAt,
      })
      .select()
      .single()

    const { ipAddress, userAgent } = getRequestInfo(request)

    if (error) {
      console.error("[v0] Failed to create payment session:", error)
      await logActivity({
        merchantId: validation.merchantId,
        activityType: "payment_failed",
        entityType: "payment",
        description: `Failed to create payment session for ${amount} ${currency}`,
        metadata: { error: error.message, amount, currency },
        ipAddress,
        userAgent,
      })
      return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 })
    }

    await logActivity({
      merchantId: validation.merchantId,
      activityType: "payment_created",
      entityType: "payment",
      entityId: session.id,
      description: `Payment session created for ${amount} ${currency}`,
      metadata: { session_id: sessionId, amount, currency },
      ipAddress,
      userAgent,
    })

    const protocol = request.headers.get("x-forwarded-proto") || "http"
    const host = request.headers.get("host") || "localhost:3000"
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`

    const widgetUrl = `${baseUrl}/p/${sessionId}`

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      widget_url: widgetUrl,
      payment_url: widgetUrl,
      url: widgetUrl,
      amount,
      currency: currency.toUpperCase(),
      expires_at: expiresAt,
      warning: !hasWallet ? "Please configure a settlement wallet in your dashboard to receive payments." : undefined,
    })
  } catch (error) {
    console.error("[v0] Payment initialize API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
