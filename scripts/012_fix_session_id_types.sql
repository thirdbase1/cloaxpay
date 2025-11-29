-- Fix session_id type mismatch between payment_sessions and transactions
-- payment_sessions.session_id is TEXT (like sess_xxx)
-- transactions.session_id should also be TEXT, not UUID

-- Update transactions table to use TEXT session_id instead of UUID
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_session_id_fkey;

ALTER TABLE public.transactions
ALTER COLUMN session_id TYPE text USING session_id::text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transactions_session_id ON public.transactions(session_id);

-- Update transaction_logs to match
ALTER TABLE public.transaction_logs
ALTER COLUMN session_id TYPE text USING session_id::text;

CREATE INDEX IF NOT EXISTS idx_transaction_logs_session_id ON public.transaction_logs(session_id);

-- Update unresolved_transactions session_id
ALTER TABLE public.unresolved_transactions
ALTER COLUMN session_id TYPE text USING session_id::text;

CREATE INDEX IF NOT EXISTS idx_unresolved_session_id ON public.unresolved_transactions(session_id);
