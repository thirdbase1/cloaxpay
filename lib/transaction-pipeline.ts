import { createClient } from "./supabase/server";
import { createSideShiftClient } from "./sideshift";
import { calculateFees } from "./fee-calculator";

export type TransactionStage = 
  | "detected"      // Payment detected on chain
  | "confirming"    // Waiting for block confirmations
  | "confirmed"     // Payment confirmed
  | "swapping"      // SideShift swap in progress
  | "swapped"       // Swap completed
  | "settling"      // Sending to merchant
  | "settled"       // Payment complete
  | "failed"        // Processing failed
  | "unresolved";   // Needs manual intervention

interface TransactionUpdate {
  stage: TransactionStage;
  metadata?: Record<string, any>;
  error?: string;
}

export async function processTransaction(transactionId: string) {
  const supabase = await createClient();
  
  const { data: transaction } = await supabase
    .from("transactions")
    .select("*, payment_sessions(*, merchants(*))")
    .eq("id", transactionId)
    .single();

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  const session = transaction.payment_sessions as any;
  const merchant = session.merchants;
  const shiftId = session.metadata?.shift_id;

  if (!shiftId) {
    throw new Error("Shift ID not found in session");
  }

  try {
    const sideshift = createSideShiftClient();
    const shift = await sideshift.getShift(shiftId);

    console.log(`[v0] Processing transaction ${transactionId}, shift status: ${shift.status}`);

    if (shift.status === "settled") {
      await updateTransactionStage(transactionId, {
        stage: "settled",
        metadata: {
          shift_status: shift.status,
          settle_amount: shift.settleAmount,
          settled_at: new Date().toISOString(),
        },
      });

      await supabase
        .from("payment_sessions")
        .update({ status: "completed" })
        .eq("id", session.id);

      if (merchant.webhook_url) {
        await sendWebhookNotification(merchant.webhook_url, {
          event: "payment.completed",
          session_id: session.session_id,
          amount: transaction.deposit_amount,
          settled_amount: shift.settleAmount,
          timestamp: new Date().toISOString(),
        });
      }

      return { success: true, stage: "settled" };
    } else if (shift.status === "pending") {
      await updateTransactionStage(transactionId, {
        stage: "swapping",
        metadata: { shift_status: shift.status },
      });

      return { success: true, stage: "swapping" };
    } else if (shift.status === "failed") {
      await updateTransactionStage(transactionId, {
        stage: "failed",
        metadata: { shift_status: shift.status },
        error: "Shift failed",
      });

      return { success: false, stage: "failed" };
    }

    return { success: true, stage: transaction.status };
  } catch (error) {
    console.error(`[v0] Transaction processing error:`, error);
    
    await updateTransactionStage(transactionId, {
      stage: "unresolved",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return { success: false, stage: "unresolved", error };
  }
}

export async function updateTransactionStage(
  transactionId: string,
  update: TransactionUpdate
) {
  const supabase = await createClient();
  
  const updateData: any = {
    status: update.stage,
    metadata: update.metadata,
    updated_at: new Date().toISOString(),
  };

  if (update.stage === "settled") {
    updateData.settled_at = new Date().toISOString();
  } else if (update.stage === "confirmed") {
    updateData.confirmed_at = new Date().toISOString();
  }

  await supabase
    .from("transactions")
    .update(updateData)
    .eq("id", transactionId);

  console.log(`[v0] Transaction ${transactionId} updated to stage: ${update.stage}`);
}

export async function monitorTransaction(transactionId: string) {
  const maxRetries = 60; // 5 minutes with 5 second intervals
  let retries = 0;

  while (retries < maxRetries) {
    const result = await processTransaction(transactionId);
    
    if (result.stage === "settled" || result.stage === "failed" || result.stage === "unresolved") {
      return result;
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    retries++;
  }

  await updateTransactionStage(transactionId, {
    stage: "unresolved",
    error: "Transaction monitoring timeout",
  });

  return { success: false, stage: "unresolved", error: "Timeout" };
}

async function sendWebhookNotification(url: string, data: any) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    console.log(`[v0] Webhook sent to ${url}`);
  } catch (error) {
    console.error(`[v0] Webhook failed:`, error);
  }
}
