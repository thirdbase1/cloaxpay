import { createClient } from "./supabase/server";

export type UnresolvedReason =
  | "wrong_chain"
  | "wrong_token"
  | "insufficient_amount"
  | "swap_failed"
  | "timeout"
  | "unknown_error";

interface CreateUnresolvedParams {
  sessionId: string;
  merchantId: string;
  depositAddress: string;
  depositChain: string;
  amountReceived?: number;
  reason: UnresolvedReason;
  errorDetails?: string;
  txHash?: string;
}

export async function createUnresolvedTransaction(params: CreateUnresolvedParams) {
  const supabase = await createClient();
  
  const { data: unresolved, error } = await supabase
    .from("unresolved_transactions")
    .insert({
      session_id: params.sessionId,
      merchant_id: params.merchantId,
      deposit_address: params.depositAddress,
      deposit_chain: params.depositChain,
      amount_received: params.amountReceived,
      reason: params.reason,
      status: "pending",
      metadata: {
        error_details: params.errorDetails,
        tx_hash: params.txHash,
        created_at: new Date().toISOString(),
      },
    })
    .select()
    .single();

  if (error) {
    console.error("[v0] Failed to create unresolved transaction:", error);
    throw error;
  }

  console.log(`[v0] Created unresolved transaction: ${unresolved.id}, reason: ${params.reason}`);

  await notifyAdminOfUnresolved(unresolved);

  return unresolved;
}

export async function handleWrongChainPayment(
  sessionId: string,
  receivedChain: string,
  expectedChain: string,
  txHash: string
) {
  const supabase = await createClient();
  
  const { data: session } = await supabase
    .from("payment_sessions")
    .select("*, merchants(*)")
    .eq("session_id", sessionId)
    .single();

  if (!session) {
    throw new Error("Session not found");
  }

  await createUnresolvedTransaction({
    sessionId: session.id,
    merchantId: session.merchant_id,
    depositAddress: session.deposit_address || "",
    depositChain: receivedChain,
    reason: "wrong_chain",
    errorDetails: `Expected ${expectedChain}, received ${receivedChain}`,
    txHash,
  });

  await supabase
    .from("payment_sessions")
    .update({ status: "failed" })
    .eq("id", session.id);
}

export async function handleInsufficientAmount(
  sessionId: string,
  amountReceived: number,
  amountRequired: number
) {
  const supabase = await createClient();
  
  const { data: session } = await supabase
    .from("payment_sessions")
    .select("*, merchants(*)")
    .eq("session_id", sessionId)
    .single();

  if (!session) {
    throw new Error("Session not found");
  }

  if (amountReceived < amountRequired * 0.5) {
    // Too small to process
    await createUnresolvedTransaction({
      sessionId: session.id,
      merchantId: session.merchant_id,
      depositAddress: session.deposit_address || "",
      depositChain: session.deposit_chain || "",
      amountReceived,
      reason: "insufficient_amount",
      errorDetails: `Received ${amountReceived}, required ${amountRequired}`,
    });
  } else {
    // Close enough - process with warning
    console.log(`[v0] Processing payment with reduced amount: ${amountReceived}/${amountRequired}`);
  }
}

export async function resolveUnresolvedTransaction(
  unresolvedId: string,
  resolution: "refunded" | "resolved",
  notes: string
) {
  const supabase = await createClient();
  
  await supabase
    .from("unresolved_transactions")
    .update({
      status: resolution,
      resolved_at: new Date().toISOString(),
      resolution_notes: notes,
    })
    .eq("id", unresolvedId);

  console.log(`[v0] Resolved unresolved transaction ${unresolvedId}: ${resolution}`);
}

async function notifyAdminOfUnresolved(unresolved: any) {
  console.log(`[v0] ADMIN ALERT: Unresolved transaction ${unresolved.id}, reason: ${unresolved.reason}`);
  
  // TODO: Integrate with email service (SendGrid, Resend, etc.)
}
