-- Security Enhancement Script
-- Run this after all other migration scripts

-- 1. Enable RLS on merchant_profiles if not already enabled
ALTER TABLE IF EXISTS public.merchant_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Add RLS policies for merchant_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.merchant_profiles;
CREATE POLICY "Users can view own profile" ON public.merchant_profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.merchant_profiles;
CREATE POLICY "Users can update own profile" ON public.merchant_profiles
  FOR UPDATE USING (auth.uid() = id);

-- 3. Ensure API keys table has proper indexes for secure lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_lookup ON public.api_keys (key_value) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_merchant ON public.api_keys (merchant_id, key_type, is_live);

-- 4. Add index for payment session lookups
CREATE INDEX IF NOT EXISTS idx_payment_sessions_session_id ON public.payment_sessions (session_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_status ON public.payment_sessions (status) WHERE status IN ('pending', 'awaiting_payment', 'processing');

-- 5. Add index for webhook logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_merchant ON public.webhook_logs (merchant_id, created_at DESC);

-- 6. Ensure service role can insert system records
DROP POLICY IF EXISTS "Service role can manage all" ON public.payment_sessions;

-- 7. Add audit logging trigger for sensitive operations
CREATE OR REPLACE FUNCTION log_api_key_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_logs (merchant_id, activity_type, entity_type, entity_id, description)
    VALUES (OLD.merchant_id, 'api_key_deleted', 'api_key', OLD.id, 'API key was deleted');
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL THEN
    INSERT INTO public.activity_logs (merchant_id, activity_type, entity_type, entity_id, description)
    VALUES (NEW.merchant_id, 'api_key_revoked', 'api_key', NEW.id, 'API key was revoked');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS api_key_audit_trigger ON public.api_keys;
CREATE TRIGGER api_key_audit_trigger
  AFTER UPDATE OR DELETE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION log_api_key_changes();

-- 8. Add function to clean up expired sessions (for security)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE public.payment_sessions
  SET status = 'expired', updated_at = NOW()
  WHERE status IN ('pending', 'awaiting_payment')
    AND expires_at < NOW()
    AND status != 'expired';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
