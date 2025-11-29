-- Fix the transactions table to use text session_id instead of UUID foreign key
-- This allows us to reference payment_sessions.session_id (text) instead of payment_sessions.id (uuid)

-- Step 1: Drop foreign key constraint on transactions
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_session_id_fkey;

-- Step 2: Drop foreign key constraint on unresolved_transactions
ALTER TABLE public.unresolved_transactions
DROP CONSTRAINT IF EXISTS unresolved_transactions_session_id_fkey;

-- Step 3: Alter transactions.session_id to TEXT (if not already)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'session_id' 
    AND data_type = 'uuid'
  ) THEN
    -- Add new column
    ALTER TABLE public.transactions ADD COLUMN session_id_new TEXT;
    
    -- Copy data with conversion
    UPDATE public.transactions SET session_id_new = 
      COALESCE(
        (SELECT session_id FROM public.payment_sessions WHERE id = transactions.session_id),
        transactions.session_id::text
      );
    
    -- Drop old column
    ALTER TABLE public.transactions DROP COLUMN session_id;
    
    -- Rename new column
    ALTER TABLE public.transactions RENAME COLUMN session_id_new TO session_id;
  END IF;
END $$;

-- Step 4: Add foreign key constraint referencing payment_sessions.session_id (text to text)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'transactions_session_id_fkey_text'
  ) THEN
    ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_session_id_fkey_text
    FOREIGN KEY (session_id) REFERENCES public.payment_sessions(session_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 5: Update transaction_logs.session_id column type (already TEXT, but ensure consistency)
-- No changes needed as transaction_logs already uses TEXT session_id

-- Step 6: Fix unresolved_transactions to use TEXT session_id
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'unresolved_transactions' 
    AND column_name = 'session_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.unresolved_transactions DROP COLUMN session_id;
    ALTER TABLE public.unresolved_transactions ADD COLUMN session_id TEXT;
  END IF;
END $$;

-- Step 7: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_session_id_text ON public.transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_session_id ON public.transaction_logs(session_id);

-- Step 8: Ensure transactions.deposit_tx_hash and settle_tx_hash are indexed
CREATE INDEX IF NOT EXISTS idx_transactions_deposit_tx ON public.transactions(deposit_tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_settle_tx ON public.transactions(settle_tx_hash);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_deposit_tx ON public.transaction_logs(deposit_tx_hash);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_settle_tx ON public.transaction_logs(settle_tx_hash);
