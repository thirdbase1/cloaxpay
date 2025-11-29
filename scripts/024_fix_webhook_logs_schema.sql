-- Fix webhook_logs table schema to match payment_sessions types
-- Drop the table if it exists with the wrong schema
DROP TABLE IF EXISTS webhook_logs;

-- Ensure payment_sessions.session_id is unique so it can be referenced
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_sessions_session_id_key'
  ) THEN
    ALTER TABLE payment_sessions ADD CONSTRAINT payment_sessions_session_id_key UNIQUE (session_id);
  END IF;
END $$;

-- Create webhook_logs table with correct types
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id),
  session_id TEXT REFERENCES payment_sessions(session_id), -- Changed from UUID to TEXT to match payment_sessions
  event_type VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  payload JSONB NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  success BOOLEAN DEFAULT FALSE,
  attempt_number INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_webhook_logs_merchant ON webhook_logs(merchant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_session ON webhook_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at DESC);

-- Enable RLS
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Merchants can view their own webhook logs
DROP POLICY IF EXISTS "Merchants can view their own webhook logs" ON webhook_logs;
CREATE POLICY "Merchants can view their own webhook logs" ON webhook_logs
  FOR SELECT USING (auth.uid() = merchant_id);

-- Policy: System can insert logs
DROP POLICY IF EXISTS "System can insert webhook logs" ON webhook_logs;
CREATE POLICY "System can insert webhook logs" ON webhook_logs
  FOR INSERT WITH CHECK (true);
