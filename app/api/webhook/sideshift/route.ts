import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { monitorSideShiftTransaction } from "@/lib/sideshift-monitor"
import { createSideShiftClient } from "@/lib/sideshift"
import { callMerchantWebhook } from "@/lib/webhook"

// SideShift.ai webhook IPs - These are the servers that send payment status updates
// IMPORTANT: Contact SideShift support to get their current IP list
// Without this whitelist, attackers could send fake "payment completed" webhooks
const SIDESHIFT_IPS = [
  // Primary SideShift API servers (verify with SideShift support)
  "35.226.145.93",
  "34.134.150.252",
  "35.232.174.40",
  "34.68.194.64",
  // GCP us-central1 range that SideShift uses
  "35.192.0.0/12",
  // GCP us-east1 range (backup servers)
  "35.186.0.0/16",
]

function isIpInRange(ip: string, cidr: string): boolean {
  if (!cidr.includes("/")) return ip === cidr

  const [range, bits] = cidr.split("/")
  const mask = ~(2 ** (32 - Number.parseInt(bits)) - 1)

  const ipParts = ip.split(".").map(Number)
  const rangeParts = range.split(".").map(Number)

  // Validate IP parts
  if (ipParts.some((p) => isNaN(p) || p < 0 || p > 255)) return false
  if (rangeParts.some((p) => isNaN(p) || p < 0 || p > 255)) return false

  const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3]
  const rangeNum = (rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3]

  return (ipNum & mask) === (rangeNum & mask)
}

const webhookRateLimit = new Map<string, { count: number; resetAt: number }>()

function checkWebhookRateLimit(ip: string): boolean {
  const now = Date.now()
  const limit = webhookRateLimit.get(ip)

  if (!limit || now > limit.resetAt) {
    webhookRateLimit.set(ip, { count: 1, resetAt: now + 60000 }) // 1 minute window
    return true
  }

  if (limit.count >= 100) {
    // Max 100 webhooks per minute per IP
    return false
  }

  limit.count++
  return true
}

function verifyWebhookSource(request: NextRequest): { valid: boolean; ip: string | null; reason?: string } {
  const forwardedFor = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const cfConnectingIp = request.headers.get("cf-connecting-ip") // Cloudflare
  const clientIp = cfConnectingIp || forwardedFor?.split(",")[0].trim() || realIp

  if (!clientIp) {
    console.error("[SECURITY] Webhook received without IP address")
    return { valid: false, ip: null, reason: "No IP address" }
  }

  if (!checkWebhookRateLimit(clientIp)) {
    console.error("[SECURITY] Webhook rate limit exceeded for IP:", clientIp)
    return { valid: false, ip: clientIp, reason: "Rate limit exceeded" }
  }

  if (process.env.NODE_ENV === "production") {
    const isAllowed = SIDESHIFT_IPS.some((allowed) => isIpInRange(clientIp, allowed))

    if (!isAllowed) {
      console.error("[SECURITY] Webhook from unauthorized IP:", clientIp)
      return { valid: false, ip: clientIp, reason: "Unauthorized IP" }
    }
  }

  return { valid: true, ip: clientIp }
}

function validateWebhookPayload(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid payload format" }
  }

  const { orderId, status } = body

  if (!orderId || typeof orderId !== "string") {
    return { valid: false, error: "Missing or invalid orderId" }
  }

  // Validate orderId format (alphanumeric with hyphens, max 100 chars)
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(orderId)) {
    return { valid: false, error: "Invalid orderId format" }
  }

  if (!status || typeof status !== "string") {
    return { valid: false, error: "Missing or invalid status" }
  }

  // Only allow known SideShift statuses
  const validStatuses = ["waiting", "pending", "processing", "settling", "settled", "failed", "expired", "refunded"]
  if (!validStatuses.includes(status)) {
    return { valid: false, error: "Unknown status value" }
  }

  return { valid: true }
}

export async function POST(request: NextRequest) {
  try {
    const { valid, ip, reason } = verifyWebhookSource(request)
    if (!valid) {
      console.error("[SECURITY] Webhook rejected:", reason, "IP:", ip)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const payloadValidation = validateWebhookPayload(body)
    if (!payloadValidation.valid) {
      console.error("[SECURITY] Invalid webhook payload:", payloadValidation.error)
      return NextResponse.json({ error: payloadValidation.error }, { status: 400 })
    }

    console.log("[v0] SideShift webhook received:", {
      orderId: body.orderId,
      status: body.status,
      fromIp: ip,
    })

    const { orderId, status, depositHash, settleHash } = body

    const sideShift = createSideShiftClient()
    let verifiedStatus: string
    let verifiedOrder: any

    try {
      verifiedOrder = await sideShift.getOrder(orderId)
      verifiedStatus = verifiedOrder.status
      console.log("[v0] Verified order status via API:", verifiedStatus)

      if (verifiedOrder.settleAmount && body.settleAmount) {
        if (Math.abs(Number.parseFloat(verifiedOrder.settleAmount) - Number.parseFloat(body.settleAmount)) > 0.01) {
          console.error("[SECURITY] Amount mismatch in webhook - possible tampering")
          return NextResponse.json({ error: "Verification failed" }, { status: 403 })
        }
      }
    } catch (apiError) {
      console.error("[SECURITY] Failed to verify webhook with SideShift API:", apiError)
      return NextResponse.json({ error: "Failed to verify with SideShift" }, { status: 403 })
    }

    const supabase = createServiceRoleClient()

    // Find session by shift ID
    const { data: sessions, error: findError } = await supabase
      .from("payment_sessions")
      .select("*, merchants(webhook_url, webhook_secret, test_mode)")
      .contains("metadata", { shift_id: orderId })
      .limit(1)

    if (findError) {
      console.error("[v0] Error finding session:", findError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!sessions || sessions.length === 0) {
      console.error("[v0] No session found for shift:", orderId)
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const session = sessions[0]

    const statusMap: Record<string, string> = {
      waiting: "awaiting_payment",
      pending: "processing",
      processing: "confirming",
      settling: "processing",
      settled: "completed",
      failed: "failed",
      expired: "expired",
      refunded: "refunded",
    }

    const newStatus = statusMap[verifiedStatus] || session.status

    const statusOrder = ["awaiting_payment", "processing", "confirming", "completed", "failed", "expired", "refunded"]
    const currentStatusIndex = statusOrder.indexOf(session.status)
    const newStatusIndex = statusOrder.indexOf(newStatus)

    if (newStatusIndex < currentStatusIndex && !["failed", "expired", "refunded"].includes(newStatus)) {
      console.error("[SECURITY] Attempted status rollback from", session.status, "to", newStatus)
      return NextResponse.json({ error: "Invalid status transition" }, { status: 400 })
    }

    // Update session with webhook data
    const { error: updateError } = await supabase
      .from("payment_sessions")
      .update({
        status: newStatus,
        deposit_hash: depositHash || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", session.session_id)

    if (updateError) {
      console.error("[v0] Failed to update session:", updateError)
      return NextResponse.json({ error: "Failed to update session" }, { status: 500 })
    }

    if (session.merchants?.webhook_url) {
      const eventMap: Record<string, string> = {
        awaiting_payment: "payment.pending",
        processing: "payment.confirming",
        confirming: "payment.confirming",
        completed: "payment.completed",
        failed: "payment.failed",
        expired: "payment.expired",
        refunded: "payment.refunded",
      }

      const event = eventMap[newStatus] || `payment.${newStatus}`

      const payload = {
        event,
        session_id: session.session_id,
        status: newStatus,
        amount: session.amount,
        currency: session.currency,
        deposit_address: session.deposit_address,
        deposit_chain: session.deposit_chain,
        deposit_tx_hash: depositHash,
        settle_tx_hash: settleHash,
        metadata: session.metadata,
        test_mode: session.merchants.test_mode,
        timestamp: new Date().toISOString(),
      }

      callMerchantWebhook(
        session.merchants.webhook_url,
        payload,
        session.merchants.webhook_secret || "default_secret",
        session.merchant_id,
        session.session_id,
      ).catch((err) => console.error("[v0] Failed to send immediate webhook:", err))
    }

    monitorSideShiftTransaction(session.session_id, orderId).catch((err) =>
      console.error("[v0] Monitoring error:", err),
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] SideShift webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
