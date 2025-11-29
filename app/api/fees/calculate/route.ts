import { NextResponse } from "next/server";
import { calculateFees, applyMerchantFeeSettings } from "@/lib/fee-calculator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, network, merchantId } = body;

    if (!amount || !network) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    let feeCalculation;
    
    if (merchantId) {
      feeCalculation = await applyMerchantFeeSettings(
        merchantId,
        parseFloat(amount),
        network
      );
    } else {
      feeCalculation = calculateFees(parseFloat(amount), network);
    }

    return NextResponse.json({ fees: feeCalculation });
  } catch (error) {
    console.error("[v0] Fee calculation error:", error);
    return NextResponse.json(
      { error: "Failed to calculate fees" },
      { status: 500 }
    );
  }
}
