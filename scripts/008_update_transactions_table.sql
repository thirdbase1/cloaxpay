-- Update transactions table with all required fields for Phase 3
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS deposit_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS deposit_chain TEXT,
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC,
ADD COLUMN IF NOT EXISTS settle_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS settle_chain TEXT,
ADD COLUMN IF NOT EXISTS settle_amount NUMERIC,
ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS gas_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount NUMERIC,
ADD COLUMN IF NOT EXISTS swap_route JSONB,
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;

-- Add indexes for transaction monitoring
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_deposit_hash ON transactions(deposit_tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
