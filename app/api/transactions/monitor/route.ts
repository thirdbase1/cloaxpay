import { NextResponse } from "next/server";
import { monitorTransaction } from "@/lib/transaction-pipeline";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transactionId } = body;

    if (!transactionId) {
      return NextResponse.json(
        { error: "Transaction ID required" },
        { status: 400 }
      );
    }

    monitorTransaction(transactionId).catch(error => {
      console.error("[v0] Background monitoring error:", error);
    });

    return NextResponse.json({ 
      success: true,
      message: "Transaction monitoring started" 
    });
  } catch (error) {
    console.error("[v0] Monitor start error:", error);
    return NextResponse.json(
      { error: "Failed to start monitoring" },
      { status: 500 }
    );
  }
}
