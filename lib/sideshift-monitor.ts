import { createSideShiftClient } from "./sideshift"
import { updateTransactionLog } from "./transaction-logger"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { callMerchantWebhook } from "./webhook"

export async function monitorSideShiftTransaction(sessionId: string, sideshiftId: string) {
  console.log(`[v0] Starting monitor for session ${sessionId}, shift ${sideshiftId}`)

  const sideshift = createSideShiftClient()
  const supabase = createServiceRoleClient()

  let attempts = 0
  const maxAttempts = 360 // 30 minutes (5s intervals)
  let monitoringStopped = false

  const check = async () => {
    const { data: session } = await supabase
      .from("payment_sessions")
      .select("status")
      .eq("session_id", sessionId)
      .single()

    if (!session || session.status === "cancelled" || session.status === "expired") {
      console.log(`[v0] Monitoring stopped - session ${sessionId} was ${session?.status || "deleted"}`)
      monitoringStopped = true
      return
    }

    attempts++

    try {
      const shift = await sideshift.getShift(sideshiftId)
      console.log(`[v0] Shift status (attempt ${attempts}):`, shift.status)

      const updates: any = {
        status: mapSideShiftStatus(shift.status),
      }

      if (shift.deposits && shift.deposits.length > 0 && !updates.detected_at) {
        const deposit = shift.deposits[0]
        updates.deposit_amount = Number.parseFloat(deposit.amount || "0")
        updates.deposit_tx_hash = deposit.txHash
        updates.deposit_confirmations = deposit.confirmations || 0
        updates.detected_at = new Date()

        await notifyMerchant(sessionId, "payment.confirming", {
          deposit_tx_hash: deposit.txHash,
          deposit_amount: deposit.amount,
          confirmations: deposit.confirmations,
        })
      }

      if (shift.deposits && shift.deposits[0]?.confirmations) {
        updates.deposit_confirmations = shift.deposits[0].confirmations
      }

      if (shift.settleAmount) {
        updates.settle_amount = Number.parseFloat(shift.settleAmount)
      }

      if (shift.status === "settled") {
        updates.status = "settled"
        updates.settled_at = new Date()
        updates.confirmed_at = updates.confirmed_at || new Date()
        updates.settle_tx_hash = shift.settleAddress?.txHash || sideshiftId

        if (shift.depositAmount && shift.settleAmount) {
          const depositAmt = Number.parseFloat(shift.depositAmount)
          const settleAmt = Number.parseFloat(shift.settleAmount)
          updates.sideshift_fee = depositAmt - settleAmt
          updates.exchange_rate = settleAmt / depositAmt
        }

        await supabase.from("payment_sessions").update({ status: "completed" }).eq("session_id", sessionId)

        await notifyMerchant(sessionId, "payment.completed", {
          deposit_tx_hash: updates.deposit_tx_hash,
          settle_tx_hash: updates.settle_tx_hash,
          deposit_amount: updates.deposit_amount,
          settle_amount: updates.settle_amount,
          exchange_rate: updates.exchange_rate,
        })

        console.log(`[v0] Payment completed for session ${sessionId}`)
        await updateTransactionLog(sessionId, updates)
        return // Stop monitoring
      }

      if (shift.status === "rejected" || shift.status === "refunded") {
        updates.status = "failed"
        updates.failed_at = new Date()

        await supabase.from("payment_sessions").update({ status: "failed" }).eq("session_id", sessionId)

        await notifyMerchant(sessionId, "payment.failed", {
          reason: shift.status,
        })

        console.log(`[v0] Payment failed for session ${sessionId}`)
        await updateTransactionLog(sessionId, updates)
        return // Stop monitoring
      }

      await updateTransactionLog(sessionId, updates)

      if (attempts < maxAttempts && !monitoringStopped) {
        setTimeout(check, 5000) // Check every 5 seconds
      } else if (attempts >= maxAttempts) {
        console.log(`[v0] Max monitoring attempts reached for session ${sessionId}`)

        try {
          if (sideshiftId) {
            await sideshift.cancelOrder(sideshiftId)
            console.log(`[v0] Cancelled expired SideShift order: ${sideshiftId}`)
          }
        } catch (e) {
          console.error(`[v0] Failed to cancel expired order ${sideshiftId}:`, e)
        }

        await supabase.from("payment_sessions").update({ status: "expired" }).eq("session_id", sessionId)

        await notifyMerchant(sessionId, "payment.expired", {})
      }
    } catch (error) {
      console.error(`[v0] Error monitoring shift:`, error)
      if (attempts < maxAttempts && !monitoringStopped) {
        setTimeout(check, 5000)
      }
    }
  }

  check()
}

function mapSideShiftStatus(sideshiftStatus: string): string {
  const statusMap: Record<string, string> = {
    pending: "pending",
    processing: "confirming",
    settling: "swapping",
    settled: "settled",
    rejected: "failed",
    refunded: "failed",
  }

  return statusMap[sideshiftStatus] || "pending"
}

interface WebhookPayload {
  event: string
  session_id: string
  status: string
  amount: number
  currency: string
  deposit_address: string
  deposit_chain: string
  metadata: any
  test_mode: boolean
  timestamp: string
  [key: string]: any
}

async function notifyMerchant(sessionId: string, event: string, additionalData: any) {
  const supabase = createServiceRoleClient()

  const { data: session } = await supabase
    .from("payment_sessions")
    .select("*, merchants(webhook_url, webhook_secret, business_name, test_mode)")
    .eq("session_id", sessionId)
    .single()

  if (!session || !session.merchants.webhook_url) {
    return
  }

  const payload: WebhookPayload = {
    event,
    session_id: sessionId,
    status: session.status,
    amount: session.amount,
    currency: session.currency,
    deposit_address: session.deposit_address,
    deposit_chain: session.deposit_chain,
    metadata: session.metadata,
    test_mode: session.merchants.test_mode,
    timestamp: new Date().toISOString(),
    ...additionalData,
  }

  await callMerchantWebhook(
    session.merchants.webhook_url,
    payload,
    session.merchants.webhook_secret || "default_secret",
  )
}
