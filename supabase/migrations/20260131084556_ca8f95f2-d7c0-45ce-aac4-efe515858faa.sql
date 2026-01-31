-- =====================================================
-- FIX CRITICAL SECURITY ISSUES (Corrected)
-- =====================================================

-- 1. RESTRICT USER ROLES - Drop public visibility, keep user's own view
DROP POLICY IF EXISTS "User roles are viewable by everyone" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 2. FIX PRIVACY SETTINGS - Remove public policy, only own settings visible
DROP POLICY IF EXISTS "Privacy settings are viewable by everyone" ON public.user_privacy_settings;

-- 3. FIX VIDEO VIEWS - Remove policy that exposes viewer identity
DROP POLICY IF EXISTS "Video owners can view their video analytics" ON public.video_views;

-- Create aggregate function for video analytics without exposing viewer IDs
CREATE OR REPLACE FUNCTION public.get_video_analytics(p_video_id UUID)
RETURNS TABLE (
  total_views BIGINT,
  avg_watch_duration NUMERIC,
  avg_completion NUMERIC,
  views_today BIGINT,
  views_this_week BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow video owners to see their analytics
  IF NOT EXISTS (SELECT 1 FROM videos WHERE id = p_video_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY SELECT 
    COUNT(*)::BIGINT as total_views,
    COALESCE(AVG(vv.watch_duration_seconds), 0) as avg_watch_duration,
    COALESCE(AVG(vv.completion_percentage), 0) as avg_completion,
    COUNT(*) FILTER (WHERE vv.watched_at >= NOW() - INTERVAL '1 day')::BIGINT as views_today,
    COUNT(*) FILTER (WHERE vv.watched_at >= NOW() - INTERVAL '7 days')::BIGINT as views_this_week
  FROM video_views vv
  WHERE vv.video_id = p_video_id;
END;
$$;

-- 4. Create helper function for profile viewing with privacy checks
CREATE OR REPLACE FUNCTION public.can_view_user_data(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_private BOOLEAN;
  v_is_blocked BOOLEAN;
BEGIN
  -- Users can always view their own data
  IF auth.uid() = target_user_id THEN
    RETURN TRUE;
  END IF;

  -- Check if blocked
  SELECT EXISTS(
    SELECT 1 FROM blocked_users
    WHERE (user_id = target_user_id AND blocked_user_id = auth.uid())
       OR (user_id = auth.uid() AND blocked_user_id = target_user_id)
  ) INTO v_is_blocked;

  IF v_is_blocked THEN
    RETURN FALSE;
  END IF;

  -- Check if private account
  SELECT COALESCE(is_private_account, false) INTO v_is_private
  FROM user_privacy_settings
  WHERE user_id = target_user_id;

  -- If private, only followers can view
  IF v_is_private THEN
    RETURN EXISTS(
      SELECT 1 FROM follows
      WHERE follower_id = auth.uid() AND following_id = target_user_id
    );
  END IF;

  RETURN TRUE;
END;
$$;

-- 5. FIX PROFILES - Replace open policy with privacy-respecting one
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

CREATE POLICY "Profiles viewable with privacy checks"
ON public.profiles FOR SELECT
TO authenticated
USING (public.can_view_user_data(user_id));

-- 6. FIX FOLLOWS - Add privacy checks
DROP POLICY IF EXISTS "Users can view follows they are part of" ON public.follows;
DROP POLICY IF EXISTS "Users can view own follow relationships" ON public.follows;

CREATE OR REPLACE FUNCTION public.can_view_follow(follower_user_id UUID, following_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_show_following BOOLEAN;
  v_show_followers BOOLEAN;
BEGIN
  -- Users can always view their own follow relationships
  IF auth.uid() = follower_user_id OR auth.uid() = following_user_id THEN
    RETURN TRUE;
  END IF;

  -- Check if follower allows showing their following list
  SELECT COALESCE(show_following_list, true) INTO v_show_following
  FROM user_privacy_settings
  WHERE user_id = follower_user_id;

  -- Check if the followed user allows showing their followers list
  SELECT COALESCE(show_followers_list, true) INTO v_show_followers
  FROM user_privacy_settings
  WHERE user_id = following_user_id;

  -- Need at least one side to allow visibility
  RETURN v_show_following OR v_show_followers;
END;
$$;

CREATE POLICY "Follows viewable with privacy checks"
ON public.follows FOR SELECT
TO authenticated
USING (public.can_view_follow(follower_id, following_id));

-- 7. Create secure moderation queue access function
CREATE OR REPLACE FUNCTION public.get_moderation_queue()
RETURNS TABLE (
  content_id TEXT,
  content_type TEXT,
  first_reported TIMESTAMPTZ,
  last_reported TIMESTAMPTZ,
  priority_score NUMERIC,
  reasons TEXT[],
  report_count BIGINT,
  report_ids TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY SELECT 
    mq.content_id::TEXT,
    mq.content_type,
    mq.first_reported,
    mq.last_reported,
    mq.priority_score::NUMERIC,
    mq.reasons,
    mq.report_count,
    mq.report_ids::TEXT[]
  FROM moderation_queue mq;
END;
$$;