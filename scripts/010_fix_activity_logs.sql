-- Fix activity_logs table to ensure it exists and has correct structure

-- Drop the function if it exists
DROP FUNCTION IF EXISTS log_activity;

-- Create activity_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id),
  user_id UUID,
  activity_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_merchant ON activity_logs(merchant_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Merchants can view their own activity" ON activity_logs;
DROP POLICY IF EXISTS "Admins can view all activity" ON activity_logs;
DROP POLICY IF EXISTS "System can insert activity logs" ON activity_logs;

-- Create policies
CREATE POLICY "Merchants can view their own activity" ON activity_logs
  FOR SELECT USING (
    auth.uid() = (SELECT id FROM merchants WHERE id = merchant_id)
  );

CREATE POLICY "Admins can view all activity" ON activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM merchants 
      WHERE id = auth.uid()::uuid 
      AND email = 'admin@web3paystack.com'
    )
  );

CREATE POLICY "System can insert activity logs" ON activity_logs
  FOR INSERT WITH CHECK (true);
