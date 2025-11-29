-- Keep test_mode column in database for backward compatibility
-- But set all values to false (everything is now production-only)
UPDATE public.merchants SET test_mode = false WHERE test_mode = true;
UPDATE public.merchant_profiles SET test_mode = false WHERE test_mode = true;

-- Set default to false for new records
ALTER TABLE public.merchants ALTER COLUMN test_mode SET DEFAULT false;
ALTER TABLE public.merchant_profiles ALTER COLUMN test_mode SET DEFAULT false;

-- Keep is_live in API keys but set all to true (all keys are now live)
UPDATE public.api_keys SET is_live = true WHERE is_live = false;
ALTER TABLE public.api_keys ALTER COLUMN is_live SET DEFAULT true;

-- Add new merchant settings columns for notifications and branding
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS notification_email_enabled boolean default true;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS notification_webhook_enabled boolean default true;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS notification_daily_summary boolean default false;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS branding_logo_url text;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS branding_color text default '#0070f3';
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS branding_company_url text;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS success_url text;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS cancel_url text;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_merchants_email ON public.merchants(email);
CREATE INDEX IF NOT EXISTS idx_merchants_created_at ON public.merchants(created_at);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_merchant_created ON public.transaction_logs(merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_status ON public.transaction_logs(status);
