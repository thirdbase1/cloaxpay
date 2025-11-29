import { type NextRequest, NextResponse } from "next/server"
import { processPayment } from "@/lib/payment-processor"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, depositChain, depositToken } = body

    // Validate all required fields
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "Missing or invalid field: sessionId" }, { status: 400 })
    }

    if (!depositChain || typeof depositChain !== "string") {
      return NextResponse.json({ error: "Missing or invalid field: depositChain" }, { status: 400 })
    }

    if (!depositToken || typeof depositToken !== "string") {
      return NextResponse.json({ error: "Missing or invalid field: depositToken" }, { status: 400 })
    }

    // Validate sessionId format
    if (!sessionId.startsWith("sess_")) {
      return NextResponse.json({ error: "Invalid sessionId format" }, { status: 400 })
    }

    // Extract user IP for geo-blocking and rate limiting
    const userIp =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      request.headers.get("cf-connecting-ip") ||
      "unknown"

    const result = await processPayment({
      sessionId,
      depositChain,
      depositToken,
      userIp,
    })

    return NextResponse.json({
      success: true,
      depositAddress: result.depositAddress,
      shiftId: result.shiftId,
    })
  } catch (error) {
    console.error("[v0] Widget initialize error:", error)

    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    const statusCode = errorMessage.includes("not found")
      ? 404
      : errorMessage.includes("expired")
        ? 400
        : errorMessage.includes("geo")
          ? 403
          : 500

    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
