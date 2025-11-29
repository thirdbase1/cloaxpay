-- Transaction Explorer: Full blockchain transaction logging
CREATE TABLE IF NOT EXISTS transaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  sideshift_id TEXT,
  
  -- Transaction details
  status TEXT NOT NULL, -- pending, detected, confirming, confirmed, swapping, swapped, settling, settled, failed
  deposit_coin TEXT NOT NULL,
  deposit_network TEXT NOT NULL,
  deposit_address TEXT NOT NULL,
  deposit_amount DECIMAL,
  deposit_tx_hash TEXT,
  deposit_confirmations INTEGER DEFAULT 0,
  
  -- Settlement details
  settle_coin TEXT NOT NULL,
  settle_network TEXT NOT NULL,
  settle_address TEXT NOT NULL,
  settle_amount DECIMAL,
  settle_tx_hash TEXT,
  
  -- Fees
  platform_fee DECIMAL DEFAULT 0,
  network_fee DECIMAL DEFAULT 0,
  sideshift_fee DECIMAL DEFAULT 0,
  
  -- Metadata
  exchange_rate DECIMAL,
  user_ip TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  detected_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Issue reports from users
CREATE TABLE IF NOT EXISTS issue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  merchant_id UUID REFERENCES merchants(id),
  
  -- Issue details
  issue_type TEXT NOT NULL, -- payment_not_detected, wrong_amount, stuck_transaction, other
  description TEXT NOT NULL,
  tx_hash TEXT,
  
  -- Reporter info
  user_email TEXT,
  user_ip TEXT,
  screenshots JSONB DEFAULT '[]',
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, investigating, resolved, rejected
  admin_notes TEXT,
  resolved_by UUID REFERENCES merchants(id),
  resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transaction_logs_session ON transaction_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_merchant ON transaction_logs(merchant_id);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_status ON transaction_logs(status);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_sideshift ON transaction_logs(sideshift_id);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_created ON transaction_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_issue_reports_session ON issue_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_issue_reports_status ON issue_reports(status);
CREATE INDEX IF NOT EXISTS idx_issue_reports_created ON issue_reports(created_at DESC);

-- RLS Policies
ALTER TABLE transaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_reports ENABLE ROW LEVEL SECURITY;

-- Merchants can view their own transaction logs
CREATE POLICY "Merchants view own logs" ON transaction_logs
  FOR SELECT
  USING (merchant_id = auth.uid());

-- Anyone can search/view transaction logs (for public explorer)
CREATE POLICY "Public view transaction logs" ON transaction_logs
  FOR SELECT
  USING (true);

-- Anyone can submit issue reports
CREATE POLICY "Anyone can submit issues" ON issue_reports
  FOR INSERT
  WITH CHECK (true);

-- Admins can view all issues
CREATE POLICY "Admins view all issues" ON issue_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE merchants.id = auth.uid()
      AND merchants.email LIKE '%admin%'
    )
  );
