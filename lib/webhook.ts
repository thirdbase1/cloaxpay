import crypto from "crypto"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { decrypt, isEncrypted } from "@/lib/encryption"

export interface WebhookPayload {
  event: string
  session_id: string
  status: string
  amount: number
  currency: string
  deposit_address?: string
  deposit_chain?: string
  deposit_tx_hash?: string
  settle_tx_hash?: string
  metadata?: any
  test_mode: boolean
  timestamp: string
}

export function generateWebhookSignature(payload: WebhookPayload, secret: string): string {
  let actualSecret = secret
  if (isEncrypted(secret)) {
    try {
      actualSecret = decrypt(secret)
    } catch (e) {
      console.error("[v0] Failed to decrypt webhook secret, using as-is")
    }
  }

  const payloadString = JSON.stringify(payload)
  return crypto.createHmac("sha256", actualSecret).update(payloadString).digest("hex")
}

export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  let actualSecret = secret
  if (isEncrypted(secret)) {
    try {
      actualSecret = decrypt(secret)
    } catch (e) {
      console.error("[v0] Failed to decrypt webhook secret for verification")
      return false
    }
  }

  const expectedSignature = crypto.createHmac("sha256", actualSecret).update(payload).digest("hex")

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  } catch {
    return false
  }
}

export async function callMerchantWebhook(
  url: string,
  payload: WebhookPayload,
  secret: string,
  merchantId?: string,
  sessionId?: string,
  maxRetries = 3,
): Promise<boolean> {
  const signature = generateWebhookSignature(payload, secret)

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[v0] Calling merchant webhook (attempt ${attempt}/${maxRetries}):`, url)

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CloaxPay-Signature": signature,
          "X-CloaxPay-Event": payload.event,
          "X-CloaxPay-Timestamp": payload.timestamp,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      })

      let responseBody = ""
      try {
        responseBody = await response.text()
      } catch (e) {
        responseBody = "[Failed to read response body]"
      }

      if (merchantId) {
        try {
          const supabase = createServiceRoleClient()
          const { error } = await supabase.from("webhook_logs").insert({
            merchant_id: merchantId,
            session_id: sessionId,
            event_type: payload.event,
            url,
            payload,
            status_code: response.status,
            response_body: responseBody.substring(0, 1000),
            success: response.ok,
            attempt_number: attempt,
          })

          if (error) {
            console.error("[v0] Database error logging webhook:", error.message)
          }
        } catch (logError) {
          console.error("[v0] Failed to log webhook attempt:", logError)
        }
      }

      if (response.ok) {
        console.log("[v0] Merchant webhook called successfully")
        return true
      } else {
        console.error(`[v0] Merchant webhook returned ${response.status}`)
      }
    } catch (error) {
      console.error(`[v0] Failed to call merchant webhook (attempt ${attempt}):`, error)

      if (merchantId) {
        try {
          const supabase = createServiceRoleClient()
          await supabase.from("webhook_logs").insert({
            merchant_id: merchantId,
            session_id: sessionId,
            event_type: payload.event,
            url,
            payload,
            status_code: 0,
            response_body: (error as Error).message,
            success: false,
            attempt_number: attempt,
          })
        } catch (logError) {
          console.error("[v0] Failed to log webhook failure:", logError)
        }
      }

      if (attempt < maxRetries) {
        const baseDelay = 1000 * Math.pow(2, attempt)
        const jitter = Math.random() * 500
        await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter))
      }
    }
  }

  return false
}

export function getWebhookEvents() {
  return {
    PAYMENT_PENDING: "payment.pending",
    PAYMENT_CONFIRMING: "payment.confirming",
    PAYMENT_COMPLETED: "payment.completed",
    PAYMENT_FAILED: "payment.failed",
    PAYMENT_EXPIRED: "payment.expired",
    PAYMENT_UNDERPAID: "payment.underpaid",
    PAYMENT_OVERPAID: "payment.overpaid",
  }
}
