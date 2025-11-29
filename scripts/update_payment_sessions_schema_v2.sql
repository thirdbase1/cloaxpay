-- Add missing columns to payment_sessions table
ALTER TABLE payment_sessions 
ADD COLUMN IF NOT EXISTS sideshift_order_id text,
ADD COLUMN IF NOT EXISTS sideshift_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deposit_amount_crypto text,
ADD COLUMN IF NOT EXISTS settle_amount_crypto text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_sessions_sideshift_order_id ON payment_sessions(sideshift_order_id);
