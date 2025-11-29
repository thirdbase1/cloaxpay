-- Add missing columns to payment_sessions table
ALTER TABLE payment_sessions 
ADD COLUMN IF NOT EXISTS sideshift_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deposit_amount_crypto TEXT,
ADD COLUMN IF NOT EXISTS settle_amount_crypto TEXT;

-- Ensure sideshift_order_id exists
ALTER TABLE payment_sessions 
ADD COLUMN IF NOT EXISTS sideshift_order_id TEXT;
