-- Fix session_id type conflicts by properly handling foreign keys

-- Step 1: Drop foreign key constraint on unresolved_transactions
ALTER TABLE public.unresolved_transactions 
DROP CONSTRAINT IF EXISTS unresolved_transactions_session_id_fkey;

-- Step 2: Change transactions.session_id from UUID to TEXT
-- First, add a new TEXT column
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS session_id_text TEXT;

-- Copy data from UUID session_id by joining with payment_sessions
UPDATE public.transactions t
SET session_id_text = ps.session_id
FROM public.payment_sessions ps
WHERE t.session_id = ps.id;

-- Drop old UUID column and rename new TEXT column
ALTER TABLE public.transactions DROP COLUMN IF EXISTS session_id CASCADE;
ALTER TABLE public.transactions RENAME COLUMN session_id_text TO session_id;

-- Add NOT NULL constraint after data is populated
ALTER TABLE public.transactions ALTER COLUMN session_id SET NOT NULL;

-- Step 3: Update unresolved_transactions to remove session_id column (not needed)
ALTER TABLE public.unresolved_transactions 
DROP COLUMN IF EXISTS session_id CASCADE;

-- Step 4: Create index on new TEXT session_id
CREATE INDEX IF NOT EXISTS idx_transactions_session_text 
ON public.transactions(session_id);

-- Step 5: Update transactions table to add SideShift shift_id
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS shift_id TEXT,
ADD COLUMN IF NOT EXISTS deposit_address TEXT,
ADD COLUMN IF NOT EXISTS settle_address TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_shift 
ON public.transactions(shift_id);
