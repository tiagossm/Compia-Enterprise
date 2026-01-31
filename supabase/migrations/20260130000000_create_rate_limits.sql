-- Create table for Rate Limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
    key TEXT PRIMARY KEY,
    points INTEGER DEFAULT 0,
    expire_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS (although mostly used by service role)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Service Role has full access
CREATE POLICY "Service Role Full Access" ON public.rate_limits
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Index for cleanup query (finding expired records)
CREATE INDEX IF NOT EXISTS rate_limits_expire_at_idx ON public.rate_limits(expire_at);
