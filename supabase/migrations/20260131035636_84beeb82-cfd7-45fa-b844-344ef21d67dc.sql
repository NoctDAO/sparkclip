-- Fix security issues from linter

-- 1. Recreate moderation_queue view with security_invoker
DROP VIEW IF EXISTS public.moderation_queue;

CREATE VIEW public.moderation_queue
WITH (security_invoker = on) AS
SELECT 
  r.content_id,
  r.content_type,
  COUNT(*) as report_count,
  array_agg(DISTINCT r.reason) as reasons,
  array_agg(r.id) as report_ids,
  MIN(r.created_at) as first_reported,
  MAX(r.created_at) as last_reported,
  (
    COUNT(*) * 10 + 
    MAX(
      CASE r.reason 
        WHEN 'minor_safety' THEN 50 
        WHEN 'violence' THEN 40
        WHEN 'hate_speech' THEN 35
        WHEN 'harassment' THEN 30
        WHEN 'nudity' THEN 25
        WHEN 'copyright' THEN 20
        WHEN 'spam' THEN 10
        ELSE 5
      END
    ) +
    LEAST(EXTRACT(EPOCH FROM (now() - MIN(r.created_at))) / 3600, 20)
  )::integer as priority_score
FROM public.reports r
WHERE r.status = 'pending'
GROUP BY r.content_id, r.content_type
ORDER BY priority_score DESC;

-- 2. Drop overly permissive content_flags insert policy and replace with admin-only
DROP POLICY IF EXISTS "Service can insert content flags" ON public.content_flags;

-- Edge function will use service role, admins can also insert
CREATE POLICY "Admins can insert content flags"
ON public.content_flags
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- 3. Fix moderation_keywords SELECT policy - it's fine for admins to read, but restrict to authenticated
DROP POLICY IF EXISTS "Anyone can read keywords" ON public.moderation_keywords;

CREATE POLICY "Authenticated users can read keywords for moderation"
ON public.moderation_keywords
FOR SELECT
TO authenticated
USING (true);