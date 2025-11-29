-- Add 'cancelled' to the allowed status values in payment_sessions
ALTER TABLE public.payment_sessions 
DROP CONSTRAINT IF EXISTS payment_sessions_status_check;

ALTER TABLE public.payment_sessions 
ADD CONSTRAINT payment_sessions_status_check 
CHECK (status IN ('pending', 'awaiting_payment', 'paid', 'processing', 'completed', 'failed', 'expired', 'cancelled'));
