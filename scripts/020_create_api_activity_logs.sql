-- Create API activity logs table for security auditing
CREATE TABLE IF NOT EXISTS api_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'key_generated', 'key_viewed', 'key_revoked', 'api_called'
  endpoint TEXT, -- API endpoint called (if applicable)
  status_code INTEGER, -- HTTP status code (if applicable)
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index for fast merchant queries
CREATE INDEX IF NOT EXISTS idx_api_activity_merchant ON api_activity_logs(merchant_id, created_at DESC);

-- Add index for key-specific logs
CREATE INDEX IF NOT EXISTS idx_api_activity_key ON api_activity_logs(api_key_id, created_at DESC);

-- Enable RLS
ALTER TABLE api_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Merchants can view their own activity logs
CREATE POLICY "Merchants can view own API activity"
  ON api_activity_logs FOR SELECT
  USING (auth.uid() = merchant_id);
