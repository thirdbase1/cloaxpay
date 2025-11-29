-- Add merchant_name column to transaction_logs if it doesn't exist
-- This column stores the immutable company name for all transactions

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transaction_logs' 
    AND column_name = 'merchant_name'
  ) THEN
    ALTER TABLE transaction_logs 
    ADD COLUMN merchant_name TEXT;
    
    -- Backfill existing records with merchant business names
    UPDATE transaction_logs tl
    SET merchant_name = mp.business_name
    FROM merchant_profiles mp
    WHERE tl.merchant_id = mp.id
    AND tl.merchant_name IS NULL;
    
    COMMENT ON COLUMN transaction_logs.merchant_name IS 'Immutable company name captured at transaction time';
  END IF;
END $$;
