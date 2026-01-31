-- Secure the moderation_queue view by recreating it with security_invoker
-- This ensures the view respects RLS policies of the underlying tables

-- First, drop the existing view
DROP VIEW IF EXISTS public.moderation_queue;

-- Recreate the view with security_invoker enabled
CREATE VIEW public.moderation_queue
WITH (security_invoker = on)
AS
SELECT 
  r.content_id,
  r.content_type,
  array_agg(DISTINCT r.id) AS report_ids,
  array_agg(DISTINCT r.reason) AS reasons,
  COUNT(*)::bigint AS report_count,
  MIN(r.created_at) AS first_reported,
  MAX(r.created_at) AS last_reported,
  (COUNT(*) * 10 + 
   CASE WHEN 'illegal' = ANY(array_agg(r.reason)) THEN 50
        WHEN 'harassment' = ANY(array_agg(r.reason)) THEN 30
        WHEN 'hate_speech' = ANY(array_agg(r.reason)) THEN 30
        ELSE 0 END)::integer AS priority_score
FROM reports r
WHERE r.status = 'pending'
GROUP BY r.content_id, r.content_type;

-- Grant access to the view for authenticated users (RLS on reports table will filter)
GRANT SELECT ON public.moderation_queue TO authenticated;

-- Add a comment explaining the security model
COMMENT ON VIEW public.moderation_queue IS 'Aggregated moderation queue - access controlled via RLS on reports table (admins/moderators only)';