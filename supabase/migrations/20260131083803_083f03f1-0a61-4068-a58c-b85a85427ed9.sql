-- Create IP rate limits table
CREATE TABLE IF NOT EXISTS public.ip_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  action_type TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_ip_rate_limits_lookup ON public.ip_rate_limits (ip_address, action_type, window_start);

-- Enable RLS (service role only)
ALTER TABLE public.ip_rate_limits ENABLE ROW LEVEL SECURITY;

-- No public policies - only accessible via service role in edge function

-- Create cleanup function to remove old entries
CREATE OR REPLACE FUNCTION public.cleanup_ip_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM ip_rate_limits 
  WHERE window_start < now() - INTERVAL '1 hour';
END;
$$;