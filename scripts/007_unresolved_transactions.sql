-- Add additional columns and indexes to unresolved_transactions table
-- (Table already created in 001_create_tables.sql)

-- Add deposit_address column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='unresolved_transactions' 
                 AND column_name='deposit_address') THEN
    ALTER TABLE unresolved_transactions ADD COLUMN deposit_address TEXT;
  END IF;
END $$;

-- Add deposit_chain column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='unresolved_transactions' 
                 AND column_name='deposit_chain') THEN
    ALTER TABLE unresolved_transactions ADD COLUMN deposit_chain TEXT;
  END IF;
END $$;

-- Add amount_received column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='unresolved_transactions' 
                 AND column_name='amount_received') THEN
    ALTER TABLE unresolved_transactions ADD COLUMN amount_received NUMERIC;
  END IF;
END $$;

-- Add metadata column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='unresolved_transactions' 
                 AND column_name='metadata') THEN
    ALTER TABLE unresolved_transactions ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- Add session_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='unresolved_transactions' 
                 AND column_name='session_id') THEN
    ALTER TABLE unresolved_transactions ADD COLUMN session_id UUID REFERENCES payment_sessions(id);
  END IF;
END $$;

-- Add additional indexes
CREATE INDEX IF NOT EXISTS idx_unresolved_status ON unresolved_transactions(reason);
CREATE INDEX IF NOT EXISTS idx_unresolved_session ON unresolved_transactions(session_id);
