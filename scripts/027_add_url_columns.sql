-- Add missing URL columns to merchants table
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS success_url text;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS cancel_url text;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS notification_webhook_enabled boolean DEFAULT false;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS notification_daily_summary boolean DEFAULT false;

-- Drop the old unique constraint on merchant_wallets if it exists
-- The old constraint was on (merchant_id, chain) but we need to allow multiple wallets per chain
DO $$ 
BEGIN
    -- Drop the constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'merchant_wallets_merchant_id_chain_key'
    ) THEN
        ALTER TABLE merchant_wallets DROP CONSTRAINT merchant_wallets_merchant_id_chain_key;
    END IF;
END $$;

-- Create new unique constraint on (merchant_id, token, network) to prevent true duplicates
-- This allows multiple wallets on the same chain with different tokens
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'merchant_wallets_merchant_token_network_key'
    ) THEN
        ALTER TABLE merchant_wallets 
        ADD CONSTRAINT merchant_wallets_merchant_token_network_key 
        UNIQUE (merchant_id, token, network);
    END IF;
END $$;

-- Add delete policy for merchant_wallets if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'merchant_wallets' 
        AND policyname = 'Merchants can delete own wallets'
    ) THEN
        CREATE POLICY "Merchants can delete own wallets" ON merchant_wallets
            FOR DELETE USING (merchant_id = auth.uid());
    END IF;
END $$;
