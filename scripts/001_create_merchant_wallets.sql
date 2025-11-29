-- Create merchant_wallets table for storing withdrawal addresses per chain
CREATE TABLE IF NOT EXISTS public.merchant_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  chain VARCHAR(50) NOT NULL,
  address VARCHAR(255) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(merchant_id, chain)
);

-- Add RLS policies
ALTER TABLE public.merchant_wallets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid "already exists" error
DROP POLICY IF EXISTS "Merchants can view own wallets" ON public.merchant_wallets;
DROP POLICY IF EXISTS "Merchants can insert own wallets" ON public.merchant_wallets;
DROP POLICY IF EXISTS "Merchants can update own wallets" ON public.merchant_wallets;
DROP POLICY IF EXISTS "Merchants can delete own wallets" ON public.merchant_wallets;

CREATE POLICY "Merchants can view own wallets"
  ON public.merchant_wallets FOR SELECT
  USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can insert own wallets"
  ON public.merchant_wallets FOR INSERT
  WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "Merchants can update own wallets"
  ON public.merchant_wallets FOR UPDATE
  USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can delete own wallets"
  ON public.merchant_wallets FOR DELETE
  USING (auth.uid() = merchant_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_merchant_wallets_merchant ON public.merchant_wallets(merchant_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_merchant_wallets_updated_at ON public.merchant_wallets;
CREATE TRIGGER update_merchant_wallets_updated_at
  BEFORE UPDATE ON public.merchant_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.merchant_wallets IS 'Stores merchant withdrawal wallet addresses for different blockchain networks';
