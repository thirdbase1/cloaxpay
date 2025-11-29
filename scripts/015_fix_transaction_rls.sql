-- Fix RLS policies for transactions table to allow system inserts
-- This enables the payment system to log transactions securely

-- Add policy to allow service role to insert transactions
CREATE POLICY "System can insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (true);

-- Add policy to allow service role to update transactions  
CREATE POLICY "System can update transactions"
  ON public.transactions FOR UPDATE
  USING (true);

-- Also ensure transaction_logs has proper policies
CREATE POLICY "System can insert transaction logs" 
  ON public.transaction_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update transaction logs"
  ON public.transaction_logs FOR UPDATE
  USING (true);
