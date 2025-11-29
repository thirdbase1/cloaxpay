import { createServiceRoleClient } from "@/lib/supabase/server";

export interface TransactionLog {
  session_id: string;
  merchant_id: string;
  merchant_name: string;
  sideshift_id?: string;
  status: string;
  deposit_coin: string;
  deposit_network: string;
  deposit_address: string;
  deposit_amount?: number;
  deposit_tx_hash?: string;
  deposit_confirmations?: number;
  settle_coin: string;
  settle_network: string;
  settle_address: string;
  settle_amount?: number;
  settle_tx_hash?: string;
  platform_fee?: number;
  network_fee?: number;
  sideshift_fee?: number;
  exchange_rate?: number;
  user_ip?: string;
  user_agent?: string;
  metadata?: any;
  detected_at?: Date;
  confirmed_at?: Date;
  settled_at?: Date;
  failed_at?: Date;
  expires_at?: Date;
}

export async function logTransaction(log: TransactionLog) {
  const supabase = createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("transaction_logs")
    .insert({
      session_id: log.session_id,
      merchant_id: log.merchant_id,
      merchant_name: log.merchant_name,
      sideshift_id: log.sideshift_id,
      status: log.status,
      deposit_coin: log.deposit_coin,
      deposit_network: log.deposit_network,
      deposit_address: log.deposit_address,
      deposit_amount: log.deposit_amount,
      deposit_tx_hash: log.deposit_tx_hash,
      deposit_confirmations: log.deposit_confirmations,
      settle_coin: log.settle_coin,
      settle_network: log.settle_network,
      settle_address: log.settle_address,
      settle_amount: log.settle_amount,
      settle_tx_hash: log.settle_tx_hash,
      platform_fee: log.platform_fee,
      network_fee: log.network_fee,
      sideshift_fee: log.sideshift_fee,
      exchange_rate: log.exchange_rate,
      user_ip: log.user_ip,
      user_agent: log.user_agent,
      metadata: log.metadata,
      detected_at: log.detected_at,
      confirmed_at: log.confirmed_at,
      settled_at: log.settled_at,
      failed_at: log.failed_at,
      expires_at: log.expires_at,
    })
    .select()
    .single();
  
  if (error) {
    console.error("[v0] Failed to log transaction:", error);
    throw error;
  }
  
  return data;
}

export async function updateTransactionLog(
  session_id: string,
  updates: Partial<TransactionLog>
) {
  const supabase = createServiceRoleClient();
  
  const updateData: any = {};
  
  if (updates.status) updateData.status = updates.status;
  if (updates.deposit_tx_hash) updateData.deposit_tx_hash = updates.deposit_tx_hash;
  if (updates.deposit_amount) updateData.deposit_amount = updates.deposit_amount;
  if (updates.settle_amount) updateData.settle_amount = updates.settle_amount;
  if (updates.platform_fee) updateData.platform_fee = updates.platform_fee;
  if (updates.network_fee) updateData.network_fee = updates.network_fee;
  if (updates.sideshift_fee) updateData.sideshift_fee = updates.sideshift_fee;
  if (updates.exchange_rate) updateData.exchange_rate = updates.exchange_rate;
  if (updates.confirmed_at) updateData.confirmed_at = updates.confirmed_at;
  if (updates.settled_at) updateData.settled_at = updates.settled_at;
  if (updates.failed_at) updateData.failed_at = updates.failed_at;
  
  const { data, error} = await supabase
    .from("transaction_logs")
    .update(updateData)
    .eq("session_id", session_id)
    .select()
    .single();
  
  if (error) {
    console.error("[v0] Failed to update transaction log:", error);
    throw error;
  }
  
  return data;
}

export async function getTransactionLog(session_id: string) {
  const supabase = createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("transaction_logs")
    .select("*")
    .eq("session_id", session_id)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error("[v0] Failed to get transaction log:", error);
  }
  
  return data;
}

export async function searchTransactions(query: string) {
  const supabase = createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("transaction_logs")
    .select("*")
    .or(`session_id.ilike.%${query}%,deposit_tx_hash.ilike.%${query}%,settle_tx_hash.ilike.%${query}%`)
    .order("created_at", { ascending: false })
    .limit(50);
  
  if (error) {
    console.error("[v0] Failed to search transactions:", error);
    return [];
  }
  
  return data || [];
}
