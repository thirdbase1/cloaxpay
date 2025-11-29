-- Activity logging system for all platform events

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id),
  user_id UUID,
  activity_type VARCHAR(100) NOT NULL, -- e.g., 'payment_created', 'payment_completed', 'api_key_generated', 'settings_updated'
  entity_type VARCHAR(50), -- e.g., 'payment', 'api_key', 'merchant', 'widget'
  entity_id UUID,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_activity_logs_merchant ON activity_logs(merchant_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- RLS Policies
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchants can view their own activity" ON activity_logs;
CREATE POLICY "Merchants can view their own activity" ON activity_logs
  FOR SELECT USING (auth.uid() = merchant_id);

DROP POLICY IF EXISTS "Admins can view all activity" ON activity_logs;
CREATE POLICY "Admins can view all activity" ON activity_logs
  FOR SELECT USING (
    (SELECT (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean) = true
  );

DROP POLICY IF EXISTS "System can insert activity logs" ON activity_logs;
CREATE POLICY "System can insert activity logs" ON activity_logs
  FOR INSERT WITH CHECK (true);

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_merchant_id UUID,
  p_activity_type VARCHAR,
  p_entity_type VARCHAR DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO activity_logs (
    merchant_id,
    activity_type,
    entity_type,
    entity_id,
    description,
    metadata
  ) VALUES (
    p_merchant_id,
    p_activity_type,
    p_entity_type,
    p_entity_id,
    p_description,
    p_metadata
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
