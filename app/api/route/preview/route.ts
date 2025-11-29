import { NextResponse } from "next/server";
import { previewRoute } from "@/lib/swap-orchestrator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, depositCoin, depositNetwork, depositAmount } = body;

    if (!sessionId || !depositCoin || !depositNetwork || !depositAmount) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const preview = await previewRoute({
      sessionId,
      depositCoin,
      depositNetwork,
      depositAmount,
    });

    return NextResponse.json({ preview });
  } catch (error) {
    console.error("[v0] Route preview error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to preview route" },
      { status: 500 }
    );
  }
}
