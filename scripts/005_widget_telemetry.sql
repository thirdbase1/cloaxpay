-- Create widget_events table for telemetry tracking
CREATE TABLE IF NOT EXISTS widget_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  user_agent TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_widget_events_session ON widget_events(session_id);
CREATE INDEX IF NOT EXISTS idx_widget_events_type ON widget_events(event_type);
CREATE INDEX IF NOT EXISTS idx_widget_events_created ON widget_events(created_at DESC);

-- Add RLS (public can insert for telemetry)
ALTER TABLE widget_events ENABLE ROW LEVEL SECURITY;

-- Fixed to use merchants table instead of merchant_profiles
DROP POLICY IF EXISTS "Anyone can insert widget events" ON widget_events;
CREATE POLICY "Anyone can insert widget events"
  ON widget_events FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view widget events" ON widget_events;
CREATE POLICY "Admins can view widget events"
  ON widget_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE id = auth.uid()
    )
  );
