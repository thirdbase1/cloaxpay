import crypto from "crypto"

/**
 * Verify webhook signatures to ensure the webhook came from CloaxPay
 *
 * Example usage:
 * ```
 * import { verifyWebhookSignature } from "@/lib/webhook-signature"
 *
 * export async function POST(request: Request) {
 *   const body = await request.text()
 *   const signature = request.headers.get("x-cloaxpay-signature")
 *
 *   if (!signature || !verifyWebhookSignature(body, signature, process.env.WEBHOOK_SECRET!)) {
 *     return new Response("Invalid signature", { status: 401 })
 *   }
 *
 *   const payload = JSON.parse(body)
 *   // Process webhook...
 *   return new Response("OK")
 * }
 * ```
 */

export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex")
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  } catch (error) {
    console.error("[v0] Webhook signature verification error:", error)
    return false
  }
}

export function generateWebhookSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex")
}
