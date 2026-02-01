-- Fix 1: Add RLS policies to ip_rate_limits table (restrict to service_role only)
CREATE POLICY "Service role manages ip rate limits" 
ON public.ip_rate_limits 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Block all other access to ip_rate_limits (deny authenticated users)
CREATE POLICY "Deny all regular user access to ip rate limits" 
ON public.ip_rate_limits 
FOR ALL 
USING (false);

-- Enable RLS on ip_rate_limits if not already enabled
ALTER TABLE public.ip_rate_limits ENABLE ROW LEVEL SECURITY;

-- Fix 2: Restrict trending_cache to authenticated users only
-- First drop the overly permissive policy
DROP POLICY IF EXISTS "Trending cache is viewable by everyone" ON public.trending_cache;

-- Create new policy requiring authentication
CREATE POLICY "Trending cache viewable by authenticated users" 
ON public.trending_cache 
FOR SELECT 
USING (auth.uid() IS NOT NULL);