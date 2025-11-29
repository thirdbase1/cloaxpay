-- Fix session_id type mismatch between payment_sessions and transactions tables
-- The transactions table references payment_sessions(id) not payment_sessions(session_id)

-- Drop the foreign key constraint first
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_session_id_fkey;

-- Change session_id in transactions to TEXT to match the session_id format (sess_xxx)
ALTER TABLE public.transactions 
ALTER COLUMN session_id TYPE TEXT;

-- Add proper index on session_id for lookups
CREATE INDEX IF NOT EXISTS idx_transactions_session_id ON public.transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_session_id ON public.payment_sessions(session_id);
