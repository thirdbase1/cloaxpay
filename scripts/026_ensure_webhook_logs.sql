-- New script to ensure webhook_logs table exists and has correct schema (idempotent)
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id),
    session_id TEXT, -- Can be null for test events
    event_type VARCHAR NOT NULL,
    url TEXT NOT NULL,
    payload JSONB NOT NULL,
    status_code INTEGER,
    response_body TEXT,
    success BOOLEAN DEFAULT false,
    attempt_number INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policy for merchants to view their own logs
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'webhook_logs' AND policyname = 'Merchants can view their own webhook logs'
    ) THEN
        CREATE POLICY "Merchants can view their own webhook logs" 
        ON public.webhook_logs 
        FOR SELECT 
        USING (auth.uid() = merchant_id);
    END IF;
END $$;

-- Policy for system to insert logs (service role)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'webhook_logs' AND policyname = 'System can insert webhook logs'
    ) THEN
        CREATE POLICY "System can insert webhook logs" 
        ON public.webhook_logs 
        FOR INSERT 
        WITH CHECK (true);
    END IF;
END $$;
