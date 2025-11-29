import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createSideShiftClient } from "@/lib/sideshift-client"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }

    const supabase = await createServerClient()

    // Get session from database
    const { data: session, error } = await supabase
      .from("payment_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .single()

    if (error || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    let shiftStatus = null

    // If we have a shift ID, get live status from SideShift
    if (session.shift_id) {
      try {
        const sideshift = createSideShiftClient()
        const shift = await sideshift.getShiftStatus(session.shift_id)

        shiftStatus = {
          status: shift.status,
          depositAmount: shift.depositAmount,
          settleAmount: shift.settleAmount,
          depositTxHash: shift.depositTxHash,
          settleTxHash: shift.settleTxHash,
        }

        // Map SideShift status to our status
        const statusMap: Record<string, string> = {
          waiting: "waitingDeposit",
          "pending-confirmation": "confirming",
          settling: "swapping",
          settled: "completed",
          failed: "failed",
          expired: "expired",
        }

        const mappedStatus = statusMap[shift.status] || session.status

        // Update database if status changed
        if (mappedStatus !== session.status) {
          const isFinalState = ["cancelled", "expired", "failed"].includes(session.status)
          const isNewStatePending = ["waitingDeposit", "pending", "confirming"].includes(mappedStatus)

          if (isFinalState && isNewStatePending && mappedStatus !== "completed") {
            console.log(
              `[v0] Ignoring status revert from ${session.status} to ${mappedStatus} for session ${sessionId}`,
            )
          } else {
            await supabase
              .from("payment_sessions")
              .update({
                status: mappedStatus,
                updated_at: new Date().toISOString(),
              })
              .eq("session_id", sessionId)
          }
        }
      } catch (shiftError) {
        console.error("[v0] Failed to fetch shift status:", shiftError)
        // Continue with database status
      }
    }

    // Calculate time remaining
    const expiresAt = session.expires_at ? new Date(session.expires_at).getTime() : 0
    const now = Date.now()
    const timeRemaining = Math.max(0, Math.floor((expiresAt - now) / 1000))

    return NextResponse.json({
      sessionId: session.session_id,
      status: session.status,
      amount: session.amount,
      currency: session.currency,
      depositAddress: session.deposit_address,
      depositCoin: session.deposit_coin,
      depositNetwork: session.deposit_network,
      depositAmount: session.deposit_amount,
      shiftId: session.shift_id,
      timeRemaining,
      expiresAt: session.expires_at,
      shift: shiftStatus,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    })
  } catch (error) {
    console.error("[v0] Status check error:", error)
    return NextResponse.json({ error: "Failed to check payment status" }, { status: 500 })
  }
}
