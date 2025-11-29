import { NextResponse } from "next/server";
import { executeSwap } from "@/lib/swap-orchestrator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, txHash } = body;

    if (!sessionId || !txHash) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const transaction = await executeSwap(sessionId, txHash);

    return NextResponse.json({ 
      success: true,
      transaction 
    });
  } catch (error) {
    console.error("[v0] Swap execution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute swap" },
      { status: 500 }
    );
  }
}
