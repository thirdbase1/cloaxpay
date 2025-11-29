-- Add settlement_tokens column to merchants table to support multiple token preferences
-- This allows merchants to toggle which tokens they want to receive (e.g., USDC on ETH, USDT on SOL, BTC)

ALTER TABLE public.merchants
ADD COLUMN IF NOT EXISTS settlement_tokens JSONB DEFAULT '["USDC"]'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN public.merchants.settlement_tokens IS 'Array of settlement token preferences with network info. Example: [{"symbol": "USDC", "network": "ethereum"}, {"symbol": "USDT", "network": "solana"}]';

-- Update existing merchants to have default settlement preferences based on their preferred_token
UPDATE public.merchants
SET settlement_tokens = jsonb_build_array(
  jsonb_build_object(
    'symbol', COALESCE(preferred_token, 'USDC'),
    'network', 'ethereum',
    'enabled', true
  )
)
WHERE settlement_tokens = '["USDC"]'::jsonb;

-- Add token and network columns to merchant_wallets for better validation
ALTER TABLE public.merchant_wallets
ADD COLUMN IF NOT EXISTS token TEXT,
ADD COLUMN IF NOT EXISTS network TEXT;

-- Update existing wallets to infer network from chain
UPDATE public.merchant_wallets
SET network = CASE
  WHEN chain IN ('eth', 'ethereum') THEN 'ethereum'
  WHEN chain IN ('bsc', 'bnb') THEN 'bsc'
  WHEN chain IN ('polygon', 'matic') THEN 'polygon'
  WHEN chain IN ('arbitrum', 'arb') THEN 'arbitrum'
  WHEN chain IN ('optimism', 'op') THEN 'optimism'
  WHEN chain IN ('sol', 'solana') THEN 'solana'
  WHEN chain IN ('btc', 'bitcoin') THEN 'bitcoin'
  ELSE chain
END
WHERE network IS NULL;

-- Create index for faster settlement token lookups
CREATE INDEX IF NOT EXISTS idx_merchants_settlement_tokens ON public.merchants USING GIN (settlement_tokens);

-- Add validation function to ensure wallet matches settlement token
CREATE OR REPLACE FUNCTION validate_wallet_token_match()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure that if a token is specified, the network matches
  IF NEW.token IS NOT NULL AND NEW.network IS NOT NULL THEN
    -- EVM chains can hold USDC, USDT, ETH, etc.
    IF NEW.network IN ('ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'base') THEN
      IF NEW.token NOT IN ('USDC', 'USDT', 'ETH', 'BNB', 'MATIC', 'DAI', 'WETH') THEN
        RAISE EXCEPTION 'Token % is not supported on network %', NEW.token, NEW.network;
      END IF;
    -- Solana can hold SOL, USDC, USDT
    ELSIF NEW.network = 'solana' THEN
      IF NEW.token NOT IN ('SOL', 'USDC', 'USDT') THEN
        RAISE EXCEPTION 'Token % is not supported on Solana', NEW.token;
      END IF;
    -- Bitcoin only holds BTC
    ELSIF NEW.network = 'bitcoin' THEN
      IF NEW.token != 'BTC' THEN
        RAISE EXCEPTION 'Bitcoin network only supports BTC';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate wallet-token matches
DROP TRIGGER IF EXISTS validate_wallet_token_trigger ON public.merchant_wallets;
CREATE TRIGGER validate_wallet_token_trigger
  BEFORE INSERT OR UPDATE ON public.merchant_wallets
  FOR EACH ROW
  EXECUTE FUNCTION validate_wallet_token_match();
