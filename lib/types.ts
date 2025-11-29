export type PaymentStatus = "pending" | "awaiting_payment" | "paid" | "processing" | "completed" | "failed" | "expired"

export type TransactionStatus =
  | "detected"
  | "confirming"
  | "confirmed"
  | "swapping"
  | "swapped"
  | "settling"
  | "settled"
  | "unresolved"

export interface PaymentSession {
  id: string
  merchant_id: string
  session_id: string
  amount: number
  currency: string
  deposit_address?: string
  deposit_chain?: string
  status: PaymentStatus
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  expires_at?: string
}

export interface Transaction {
  id: string
  session_id: string
  merchant_id: string
  tx_hash: string
  from_chain: string
  from_token: string
  from_amount: number
  to_chain?: string
  to_token?: string
  to_amount?: number
  platform_fee: number
  gas_fee: number
  net_amount?: number
  status: TransactionStatus
  swap_route?: Record<string, any>
  device_info?: Record<string, any>
  created_at: string
  updated_at: string
  confirmed_at?: string
  settled_at?: string
}

export interface Merchant {
  id: string
  business_name: string
  email: string
  webhook_url?: string
  webhook_secret?: string
  test_mode: boolean
  accept_any_chain: boolean
  auto_gas_coverage: boolean
  preferred_token: string
  created_at: string
  updated_at: string
}

export interface MerchantWallet {
  id: string
  merchant_id: string
  chain: string
  address: string
  token?: string
  network?: string
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface ShiftInfo {
  shift_id: string
  deposit_address: string
  status: string
  deposit_amount?: string
  settle_amount?: string
}
