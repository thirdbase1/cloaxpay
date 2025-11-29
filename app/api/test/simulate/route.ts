import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { amount } = await request.json();
    
    // Maximum $10 for test mode
    if (amount > 10) {
      return NextResponse.json(
        { error: "Test mode limited to $10 maximum" },
        { status: 400 }
      );
    }

    // Generate a test widget URL
    const widgetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/widget?amount=${amount}&currency=USD&test=true`;
    
    return NextResponse.json({
      success: true,
      widget_url: widgetUrl,
      amount,
      message: "Test payment created with live SideShift API (small amounts only)"
    });
  } catch (error) {
    console.error("[v0] Test simulate error:", error);
    return NextResponse.json(
      { error: "Failed to create test payment" },
      { status: 500 }
    );
  }
}
