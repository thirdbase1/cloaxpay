import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { createSideShiftClient } from "@/lib/sideshift"

interface RouteParams {
  params: Promise<{ sessionId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params
    const body = await request.json().catch(() => ({}))

    if (!sessionId || !sessionId.startsWith("sess_")) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    // Get session with shift_id
    const { data: session, error: sessionError } = await supabase
      .from("payment_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const shiftId = session.metadata?.shift_id

    if (!shiftId) {
      return NextResponse.json({
        status: session.status,
        message: "No shift created yet",
      })
    }

    // Check SideShift status
    try {
      const sideshift = createSideShiftClient()
      const shiftStatus = await sideshift.getShiftStatus(shiftId)

      console.log("[v0] Manual check - SideShift status:", shiftStatus.status)

      let newStatus = session.status

      // Map SideShift status to our status
      const statusMap: Record<string, string> = {
        waiting: "awaiting_payment",
        pending: "processing",
        settling: "processing",
        settled: "completed",
        failed: "failed",
        expired: "expired",
        refunded: "refunded",
      }

      newStatus = statusMap[shiftStatus.status] || session.status

      // Check for deposits
      if (shiftStatus.deposits && shiftStatus.deposits.length > 0) {
        newStatus = "confirming"
      }

      // Update transaction log if completed
      if (shiftStatus.status === "settled") {
        await supabase.from("transaction_logs").upsert(
          {
            session_id: sessionId,
            merchant_id: session.merchant_id,
            shift_id: shiftId,
            status: "settled",
            deposit_amount: shiftStatus.depositAmount,
            settle_amount: shiftStatus.settleAmount,
            deposit_tx_hash: shiftStatus.depositTxHash,
            settle_tx_hash: shiftStatus.settleTxHash,
            settled_at: new Date().toISOString(),
            confirmed_at: shiftStatus.confirmedAt,
            detected_at: shiftStatus.detectedAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "session_id" },
        )
      }

      // Update session if status changed
      if (newStatus !== session.status) {
        await supabase
          .from("payment_sessions")
          .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("session_id", sessionId)
      }

      return NextResponse.json({
        status: newStatus,
        sideshift_status: shiftStatus.status,
        deposits: shiftStatus.deposits?.length || 0,
        message:
          newStatus === "confirming"
            ? "Payment detected! Waiting for confirmations..."
            : newStatus === "completed"
              ? "Payment completed!"
              : "Monitoring for payment...",
      })
    } catch (error) {
      console.error("[v0] SideShift check failed:", error)
      return NextResponse.json({
        status: session.status,
        message: "Unable to check payment status, will retry automatically",
      })
    }
  } catch (error) {
    console.error("[v0] Manual check error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params

    // Validate sessionId format
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    // Validate sessionId format (should start with sess_)
    if (!sessionId.startsWith("sess_")) {
      return NextResponse.json({ error: "Invalid session ID format" }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    let session
    let merchantInfo = {
      business_name: "Merchant",
      email: "",
      success_url: "",
      cancel_url: "",
    }

    try {
      const { data, error } = await supabase
        .from("payment_sessions")
        .select(`
          *,
          merchants!inner(business_name, email, success_url, cancel_url)
        `)
        .eq("session_id", sessionId)
        .single()

      if (error) throw error
      session = data
      if (data.merchants) {
        merchantInfo = {
          business_name: data.merchants.business_name || "Merchant",
          email: data.merchants.email || "",
          success_url: data.merchants.success_url || "",
          cancel_url: data.merchants.cancel_url || "",
        }
      }
    } catch (merchantError) {
      console.log("[v0] Failed to load merchant with join, trying without:", merchantError)

      // Fallback: load session without merchant join
      const { data, error } = await supabase.from("payment_sessions").select("*").eq("session_id", sessionId).single()

      if (error || !data) {
        console.error("[v0] Session lookup error:", error)
        return NextResponse.json({ error: "Payment session not found" }, { status: 404 })
      }

      session = data

      // Try to load merchant separately from correct table
      try {
        const { data: merchant } = await supabase
          .from("merchants")
          .select("business_name, email, success_url, cancel_url")
          .eq("id", session.merchant_id)
          .single()

        if (merchant) {
          merchantInfo = {
            business_name: merchant.business_name || "Merchant",
            email: merchant.email || "",
            success_url: merchant.success_url || "",
            cancel_url: merchant.cancel_url || "",
          }
        }
      } catch (err) {
        console.log("[v0] Merchant not found, using defaults")
      }
    }

    if (!session) {
      return NextResponse.json({ error: "Payment session not found" }, { status: 404 })
    }

    // Check if session expired
    if (new Date(session.expires_at) < new Date() && session.status !== "completed") {
      const { error: updateError } = await supabase
        .from("payment_sessions")
        .update({
          status: "expired",
          updated_at: new Date().toISOString(),
        })
        .eq("session_id", sessionId)

      if (updateError) {
        console.error("[v0] Failed to update expired session:", updateError)
      }

      session.status = "expired"
    }

    const shiftId = session.metadata?.shift_id

    // Only check SideShift status if shift exists and session not completed/expired
    if (shiftId && !["completed", "expired", "failed", "refunded"].includes(session.status)) {
      try {
        const sideshift = createSideShiftClient()
        const shiftStatus = await sideshift.getShiftStatus(shiftId)

        console.log("[v0] SideShift status:", shiftStatus.status)

        let newStatus = session.status

        // Map SideShift status to our status
        const statusMap: Record<string, string> = {
          waiting: "awaiting_payment",
          pending: "processing",
          settling: "processing",
          settled: "completed",
          failed: "failed",
          expired: "expired",
          refunded: "refunded",
        }

        newStatus = statusMap[shiftStatus.status] || session.status

        // Update transaction log if completed
        if (shiftStatus.status === "settled") {
          const { error: logError } = await supabase.from("transaction_logs").upsert(
            {
              session_id: sessionId,
              merchant_id: session.merchant_id,
              shift_id: shiftId,
              status: "settled",
              deposit_amount: shiftStatus.depositAmount,
              settle_amount: shiftStatus.settleAmount,
              deposit_tx_hash: shiftStatus.depositTxHash,
              settle_tx_hash: shiftStatus.settleTxHash,
              settled_at: new Date().toISOString(),
              confirmed_at: shiftStatus.confirmedAt,
              detected_at: shiftStatus.detectedAt,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "session_id",
            },
          )

          if (logError) {
            console.error("[v0] Failed to update transaction log:", logError)
          }
        } else if (shiftStatus.deposits && shiftStatus.deposits.length > 0) {
          newStatus = "confirming"
        }

        // Update session if status changed
        if (newStatus !== session.status) {
          const { error: statusError } = await supabase
            .from("payment_sessions")
            .update({
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("session_id", sessionId)

          if (statusError) {
            console.error("[v0] Failed to update session status:", statusError)
          } else {
            session.status = newStatus
          }
        }
      } catch (error) {
        console.error("[v0] SideShift status check failed:", error)
        // Don't fail the entire request if SideShift check fails
      }
    }

    let transaction = null
    try {
      const { data: txData } = await supabase.from("transaction_logs").select("*").eq("session_id", sessionId).single()

      transaction = txData
    } catch (txError) {
      console.log("[v0] No transaction log found yet:", txError)
    }

    return NextResponse.json({
      session_id: session.session_id,
      status: session.status,
      amount: session.amount,
      currency: session.currency,
      deposit_address: session.deposit_address,
      deposit_chain: session.deposit_chain,
      merchant: merchantInfo,
      callback_url: session.metadata?.callback_url || null,
      transaction: transaction
        ? {
            deposit_amount: transaction.deposit_amount,
            deposit_tx_hash: transaction.deposit_tx_hash,
            settle_amount: transaction.settle_amount,
            settle_tx_hash: transaction.settle_tx_hash,
            status: transaction.status,
            confirmed_at: transaction.confirmed_at,
            settled_at: transaction.settled_at,
          }
        : null,
      created_at: session.created_at,
      expires_at: session.expires_at,
    })
  } catch (error) {
    console.error("[v0] Widget status error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
