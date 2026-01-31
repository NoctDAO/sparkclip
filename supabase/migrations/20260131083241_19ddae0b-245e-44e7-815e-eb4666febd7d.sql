-- =====================================================
-- RATE LIMITING: Server-side protection against abuse
-- =====================================================

-- 1. Create rate_limits table to track request counts
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, action_type, window_start)
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits (used by functions)
CREATE POLICY "Service role manages rate limits"
ON public.rate_limits FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 2. Create rate limiting check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_action_type TEXT,
  p_max_requests INTEGER,
  p_window_minutes INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
BEGIN
  -- Calculate window start (truncate to window size)
  v_window_start := date_trunc('minute', now()) - 
    (EXTRACT(MINUTE FROM now())::INTEGER % p_window_minutes) * INTERVAL '1 minute';
  
  -- Clean up old entries (older than 1 hour)
  DELETE FROM rate_limits 
  WHERE window_start < now() - INTERVAL '1 hour';
  
  -- Get current count for this window
  SELECT request_count INTO v_current_count
  FROM rate_limits
  WHERE user_id = p_user_id 
    AND action_type = p_action_type
    AND window_start = v_window_start;
  
  -- If no record exists, create one
  IF v_current_count IS NULL THEN
    INSERT INTO rate_limits (user_id, action_type, window_start, request_count)
    VALUES (p_user_id, p_action_type, v_window_start, 1)
    ON CONFLICT (user_id, action_type, window_start) 
    DO UPDATE SET request_count = rate_limits.request_count + 1
    RETURNING request_count INTO v_current_count;
  ELSE
    -- Increment and check
    UPDATE rate_limits 
    SET request_count = request_count + 1
    WHERE user_id = p_user_id 
      AND action_type = p_action_type
      AND window_start = v_window_start
    RETURNING request_count INTO v_current_count;
  END IF;
  
  -- Return true if within limit, false if exceeded
  RETURN v_current_count <= p_max_requests;
END;
$$;

-- 3. Create wrapper functions for specific actions with their limits

-- Video uploads: 10 per hour
CREATE OR REPLACE FUNCTION public.can_upload_video()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT check_rate_limit(auth.uid(), 'video_upload', 10, 60);
$$;

-- Comments: 30 per 5 minutes
CREATE OR REPLACE FUNCTION public.can_post_comment()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT check_rate_limit(auth.uid(), 'comment', 30, 5);
$$;

-- Likes: 100 per 5 minutes
CREATE OR REPLACE FUNCTION public.can_like()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT check_rate_limit(auth.uid(), 'like', 100, 5);
$$;

-- Follows: 50 per 5 minutes
CREATE OR REPLACE FUNCTION public.can_follow()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT check_rate_limit(auth.uid(), 'follow', 50, 5);
$$;

-- Reports: 10 per hour (prevent report spam)
CREATE OR REPLACE FUNCTION public.can_submit_report()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT check_rate_limit(auth.uid(), 'report', 10, 60);
$$;

-- Messages: 60 per 5 minutes
CREATE OR REPLACE FUNCTION public.can_send_message()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT check_rate_limit(auth.uid(), 'message', 60, 5);
$$;

-- 4. Update RLS policies to enforce rate limits

-- Videos: Add rate limit check
DROP POLICY IF EXISTS "Users can upload their own videos" ON public.videos;
CREATE POLICY "Users can upload their own videos"
ON public.videos FOR INSERT
WITH CHECK (auth.uid() = user_id AND can_upload_video());

-- Comments: Add rate limit check
DROP POLICY IF EXISTS "Authenticated users can comment" ON public.comments;
CREATE POLICY "Authenticated users can comment"
ON public.comments FOR INSERT
WITH CHECK (auth.uid() = user_id AND can_post_comment());

-- Likes: Add rate limit check
DROP POLICY IF EXISTS "Authenticated users can like" ON public.likes;
CREATE POLICY "Authenticated users can like"
ON public.likes FOR INSERT
WITH CHECK (auth.uid() = user_id AND can_like());

-- Comment likes: Add rate limit check
DROP POLICY IF EXISTS "Authenticated users can like comments" ON public.comment_likes;
CREATE POLICY "Authenticated users can like comments"
ON public.comment_likes FOR INSERT
WITH CHECK (auth.uid() = user_id AND can_like());

-- Follows: Add rate limit check
DROP POLICY IF EXISTS "Authenticated users can follow" ON public.follows;
CREATE POLICY "Authenticated users can follow"
ON public.follows FOR INSERT
WITH CHECK (auth.uid() = follower_id AND can_follow());

-- Reports: Add rate limit check
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports"
ON public.reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id AND can_submit_report());

-- Messages: Add rate limit check
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
CREATE POLICY "Users can send messages in their conversations"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND can_send_message()
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id 
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
);

-- 5. Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
ON public.rate_limits(user_id, action_type, window_start);