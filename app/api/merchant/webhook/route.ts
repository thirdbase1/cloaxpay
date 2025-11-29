import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import crypto from "crypto"
import { callMerchantWebhook } from "@/lib/webhook"
import { encrypt } from "@/lib/encryption"

function isValidWebhookUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url)

    // Must be HTTPS in production
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
      return { valid: false, error: "Webhook URL must use HTTPS" }
    }

    // Block localhost/internal IPs in production
    if (process.env.NODE_ENV === "production") {
      const hostname = parsed.hostname.toLowerCase()
      if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.startsWith("192.168.") ||
        hostname.startsWith("10.") ||
        hostname.startsWith("172.16.") ||
        hostname.endsWith(".local")
      ) {
        return { valid: false, error: "Webhook URL cannot point to internal/local addresses" }
      }
    }

    // Block dangerous ports
    const dangerousPorts = ["22", "23", "25", "3389", "5900"]
    if (parsed.port && dangerousPorts.includes(parsed.port)) {
      return { valid: false, error: "Invalid port in webhook URL" }
    }

    return { valid: true }
  } catch {
    return { valid: false, error: "Invalid URL format" }
  }
}

const testRateLimit = new Map<string, { count: number; resetAt: number }>()

function checkTestRateLimit(userId: string): boolean {
  const now = Date.now()
  const limit = testRateLimit.get(userId)

  if (!limit || now > limit.resetAt) {
    testRateLimit.set(userId, { count: 1, resetAt: now + 60000 }) // 1 minute window
    return true
  }

  if (limit.count >= 5) {
    // Max 5 test webhooks per minute
    return false
  }

  limit.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    if (action === "regenerate_secret") {
      const rawSecret = `whsec_${crypto.randomBytes(32).toString("hex")}`
      const encryptedSecret = encrypt(rawSecret)

      const { error } = await supabase.from("merchants").update({ webhook_secret: encryptedSecret }).eq("id", user.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, secret: rawSecret })
    }

    if (action === "test") {
      const { url } = body

      if (!url) {
        return NextResponse.json({ error: "URL is required" }, { status: 400 })
      }

      const urlValidation = isValidWebhookUrl(url)
      if (!urlValidation.valid) {
        return NextResponse.json({ error: urlValidation.error }, { status: 400 })
      }

      if (!checkTestRateLimit(user.id)) {
        return NextResponse.json({ error: "Too many test webhooks. Please wait a minute." }, { status: 429 })
      }

      const { data: merchant } = await supabase.from("merchants").select("webhook_secret").eq("id", user.id).single()

      const secret = merchant?.webhook_secret || "test_secret"

      const testPayload = {
        event: "payment.test",
        session_id: "test_session_" + Date.now(),
        status: "completed",
        amount: 100.0,
        currency: "USD",
        deposit_address: "0x1234567890abcdef1234567890abcdef12345678",
        deposit_chain: "ethereum",
        metadata: { test: true },
        test_mode: true,
        timestamp: new Date().toISOString(),
      }

      const success = await callMerchantWebhook(url, testPayload, secret, user.id, undefined, 1)

      if (success) {
        return NextResponse.json({ success: true })
      } else {
        return NextResponse.json({ error: "Webhook delivery failed. Check your server logs." }, { status: 400 })
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Webhook action error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
