import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validateApiKey } from "@/lib/api-keys";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: sessionId } = await params;
    const supabase = await createServiceRoleClient();

    const { data: session, error } = await supabase
      .from("payment_sessions")
      .select(`
        *,
        merchants (
          business_name,
          email
        )
      `)
      .eq("session_id", sessionId)
      .eq("merchant_id", validation.merchantId)
      .single();

    if (error || !session) {
      return NextResponse.json(
        { error: "Payment session not found" },
        { status: 404 }
      );
    }

    const { data: transaction } = await supabase
      .from("transaction_logs")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      data: {
        session_id: session.session_id,
        amount: session.amount,
        currency: session.currency,
        status: session.status,
        deposit_address: session.deposit_address,
        deposit_chain: session.deposit_chain,
        created_at: session.created_at,
        expires_at: session.expires_at,
        metadata: session.metadata,
        transaction: transaction ? {
          deposit_amount: transaction.deposit_amount,
          deposit_tx_hash: transaction.deposit_tx_hash,
          deposit_confirmations: transaction.deposit_confirmations,
          settle_amount: transaction.settle_amount,
          settle_tx_hash: transaction.settle_tx_hash,
          status: transaction.status,
          exchange_rate: transaction.exchange_rate,
          platform_fee: transaction.platform_fee,
          network_fee: transaction.network_fee,
          detected_at: transaction.detected_at,
          confirmed_at: transaction.confirmed_at,
          settled_at: transaction.settled_at,
        } : null,
      },
    });
  } catch (error) {
    console.error("[v0] Payment verify API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
