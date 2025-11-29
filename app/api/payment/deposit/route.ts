import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validateApiKey } from "@/lib/api-keys";
import { createSideShiftClient } from "@/lib/sideshift";
import { logActivity, getRequestInfo } from "@/lib/activity-logger";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const secretKey = authHeader.replace("Bearer ", "");
    const validation = await validateApiKey(secretKey);

    if (!validation.valid || !validation.merchantId) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { amount, currency, metadata, depositChain, depositToken, settleAddress } = body;

    if (!amount || !currency || !depositChain || !depositToken || !settleAddress) {
      return NextResponse.json(
        { error: "Missing required fields: amount, currency, depositChain, depositToken, settleAddress" },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();
    
    const { data: merchant } = await supabase
      .from("merchants")
      .select("preferred_token, business_name, email")
      .eq("id", validation.merchantId)
      .single();

    const settleCoin = merchant?.preferred_token || "USDC";
    const settleNetwork = "mainnet";

    const { ipAddress, userAgent } = getRequestInfo(request);

    const sideshift = createSideShiftClient();
    
    const shift = await sideshift.createVariableShift(
      depositToken.toLowerCase(),
      depositChain.toLowerCase(),
      settleCoin.toLowerCase(),
      settleNetwork,
      settleAddress,
      undefined, // refundAddress
      undefined, // refundMemo
      ipAddress  // userIp
    );

    const sessionId = `sess_${crypto.randomBytes(16).toString("hex")}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: session, error } = await supabase
      .from("payment_sessions")
      .insert({
        merchant_id: validation.merchantId,
        session_id: sessionId,
        amount,
        currency,
        status: "awaiting_payment",
        deposit_address: shift.depositAddress,
        deposit_chain: `${depositToken}/${depositChain}`,
        metadata: {
          ...metadata,
          shift_id: shift.id,
          settle_address: settleAddress,
          settle_coin: settleCoin,
          settle_network: settleNetwork,
          merchant_name: merchant?.business_name,
          merchant_email: merchant?.email,
        },
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      console.error("[v0] Failed to create payment session:", error);
      
      await logActivity({
        merchantId: validation.merchantId,
        activityType: "payment_failed",
        entityType: "payment",
        description: `Failed to create payment session for ${amount} ${currency}`,
        metadata: { error: error.message, amount, currency, depositChain, depositToken },
        ipAddress,
        userAgent,
      });
      
      return NextResponse.json(
        { error: "Failed to create payment session" },
        { status: 500 }
      );
    }

    await logActivity({
      merchantId: validation.merchantId,
      activityType: "payment_created",
      entityType: "payment",
      entityId: session.id,
      description: `Payment session created: ${amount} ${currency} via ${depositToken}/${depositChain}`,
      metadata: {
        session_id: sessionId,
        amount,
        currency,
        deposit_chain: `${depositToken}/${depositChain}`,
        deposit_address: shift.depositAddress,
        shift_id: shift.id,
        settle_address: settleAddress,
        settle_coin: settleCoin,
      },
      ipAddress,
      userAgent,
    });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    
    return NextResponse.json({
      success: true,
      session_id: sessionId,
      widget_url: `${baseUrl}/p/${sessionId}`,
      deposit_address: shift.depositAddress,
      deposit_chain: `${depositToken}/${depositChain}`,
      shift_id: shift.id,
      amount,
      currency,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error("[v0] Payment deposit API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
