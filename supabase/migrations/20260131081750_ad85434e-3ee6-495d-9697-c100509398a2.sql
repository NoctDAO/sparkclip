-- =====================================================
-- PHASE 1: Composite Indexes for Performance at Scale
-- =====================================================

-- Video feed queries (user's videos sorted by date)
CREATE INDEX IF NOT EXISTS idx_videos_user_created 
ON public.videos(user_id, created_at DESC);

-- Series navigation (videos in a series in order)
CREATE INDEX IF NOT EXISTS idx_videos_series_order 
ON public.videos(series_id, series_order) 
WHERE series_id IS NOT NULL;

-- Follow relationship lookups (checking if user follows another)
CREATE INDEX IF NOT EXISTS idx_follows_relationship 
ON public.follows(follower_id, following_id);

-- Like status checks (checking if user liked a video)
CREATE INDEX IF NOT EXISTS idx_likes_user_video 
ON public.likes(user_id, video_id);

-- Bookmark status checks
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_video 
ON public.bookmarks(user_id, video_id);

-- Notification queries (user's unread notifications by date)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
ON public.notifications(user_id, is_read, created_at DESC);

-- Video views for analytics (video's views by date)
CREATE INDEX IF NOT EXISTS idx_video_views_video_watched 
ON public.video_views(video_id, watched_at DESC);

-- Trending cache lookups (by entity type and period)
CREATE INDEX IF NOT EXISTS idx_trending_cache_type_period 
ON public.trending_cache(entity_type, period, score DESC);

-- =====================================================
-- PHASE 2: Optimized Feed Query Function
-- =====================================================

-- Function to get feed videos with all related data in one query
CREATE OR REPLACE FUNCTION public.get_feed_videos(
  p_user_id UUID DEFAULT NULL,
  p_feed_type TEXT DEFAULT 'foryou',
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_blocked_user_ids UUID[] DEFAULT '{}'
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  video_url TEXT,
  thumbnail_url TEXT,
  caption TEXT,
  hashtags TEXT[],
  likes_count INT,
  comments_count INT,
  shares_count INT,
  views_count INT,
  sound_id UUID,
  series_id UUID,
  series_order INT,
  duet_source_id UUID,
  duet_layout TEXT,
  allow_duets BOOLEAN,
  created_at TIMESTAMPTZ,
  visibility TEXT,
  -- Profile fields
  profile_username TEXT,
  profile_display_name TEXT,
  profile_avatar_url TEXT,
  -- Sound fields
  sound_title TEXT,
  sound_artist TEXT,
  sound_audio_url TEXT,
  sound_cover_url TEXT,
  -- Series fields
  series_title TEXT,
  series_description TEXT,
  series_videos_count INT,
  -- User interaction flags (if user_id provided)
  is_liked BOOLEAN,
  is_bookmarked BOOLEAN,
  is_following BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_following_ids UUID[];
BEGIN
  -- If following feed, get the user's following list
  IF p_feed_type = 'following' AND p_user_id IS NOT NULL THEN
    SELECT ARRAY_AGG(f.following_id)
    INTO v_following_ids
    FROM follows f
    WHERE f.follower_id = p_user_id;
  END IF;

  RETURN QUERY
  SELECT 
    v.id,
    v.user_id,
    v.video_url,
    v.thumbnail_url,
    v.caption,
    v.hashtags,
    COALESCE(v.likes_count, 0)::INT,
    COALESCE(v.comments_count, 0)::INT,
    COALESCE(v.shares_count, 0)::INT,
    COALESCE(v.views_count, 0)::INT,
    v.sound_id,
    v.series_id,
    v.series_order,
    v.duet_source_id,
    v.duet_layout,
    COALESCE(v.allow_duets, true),
    v.created_at,
    v.visibility,
    -- Profile
    p.username,
    p.display_name,
    p.avatar_url,
    -- Sound
    s.title,
    s.artist,
    s.audio_url,
    s.cover_url,
    -- Series
    vs.title,
    vs.description,
    vs.videos_count,
    -- Interaction flags
    CASE WHEN p_user_id IS NOT NULL THEN 
      EXISTS(SELECT 1 FROM likes l WHERE l.user_id = p_user_id AND l.video_id = v.id)
    ELSE FALSE END,
    CASE WHEN p_user_id IS NOT NULL THEN 
      EXISTS(SELECT 1 FROM bookmarks b WHERE b.user_id = p_user_id AND b.video_id = v.id)
    ELSE FALSE END,
    CASE WHEN p_user_id IS NOT NULL THEN 
      EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = p_user_id AND f.following_id = v.user_id)
    ELSE FALSE END
  FROM videos v
  LEFT JOIN profiles p ON p.user_id = v.user_id
  LEFT JOIN sounds s ON s.id = v.sound_id
  LEFT JOIN video_series vs ON vs.id = v.series_id
  WHERE 
    v.visibility = 'public'
    -- Exclude blocked users
    AND NOT (v.user_id = ANY(p_blocked_user_ids))
    -- Filter for following feed
    AND (
      p_feed_type != 'following' 
      OR v_following_ids IS NULL 
      OR v.user_id = ANY(v_following_ids)
    )
  ORDER BY v.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- PHASE 3: Trending Cache Refresh Function
-- =====================================================

CREATE OR REPLACE FUNCTION public.refresh_trending_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_ago TIMESTAMPTZ := NOW() - INTERVAL '7 days';
  v_day_ago TIMESTAMPTZ := NOW() - INTERVAL '1 day';
BEGIN
  -- Clear old cache entries for the periods we're refreshing
  DELETE FROM trending_cache WHERE period IN ('daily', 'weekly');

  -- Insert trending videos (weekly)
  INSERT INTO trending_cache (entity_type, entity_id, period, score, updated_at)
  SELECT 
    'video',
    v.id::TEXT,
    'weekly',
    (COALESCE(v.likes_count, 0) * 2 + COALESCE(v.comments_count, 0) * 3 + COALESCE(v.views_count, 0) * 0.1)::NUMERIC,
    NOW()
  FROM videos v
  WHERE v.created_at >= v_week_ago AND v.visibility = 'public'
  ORDER BY (COALESCE(v.likes_count, 0) * 2 + COALESCE(v.comments_count, 0) * 3 + COALESCE(v.views_count, 0) * 0.1) DESC
  LIMIT 100;

  -- Insert trending hashtags (weekly)
  INSERT INTO trending_cache (entity_type, entity_id, period, score, updated_at)
  SELECT 
    'hashtag',
    tag,
    'weekly',
    COUNT(*)::NUMERIC,
    NOW()
  FROM videos v, UNNEST(v.hashtags) AS tag
  WHERE v.created_at >= v_week_ago AND v.visibility = 'public' AND tag IS NOT NULL
  GROUP BY tag
  ORDER BY COUNT(*) DESC
  LIMIT 50;

  -- Insert trending sounds (weekly)
  INSERT INTO trending_cache (entity_type, entity_id, period, score, updated_at)
  SELECT 
    'sound',
    v.sound_id::TEXT,
    'weekly',
    COUNT(*)::NUMERIC,
    NOW()
  FROM videos v
  WHERE v.created_at >= v_week_ago AND v.visibility = 'public' AND v.sound_id IS NOT NULL
  GROUP BY v.sound_id
  ORDER BY COUNT(*) DESC
  LIMIT 50;

  -- Insert trending creators (weekly) based on engagement
  INSERT INTO trending_cache (entity_type, entity_id, period, score, updated_at)
  SELECT 
    'creator',
    v.user_id::TEXT,
    'weekly',
    SUM(COALESCE(v.likes_count, 0) + COALESCE(v.comments_count, 0))::NUMERIC,
    NOW()
  FROM videos v
  WHERE v.created_at >= v_week_ago AND v.visibility = 'public'
  GROUP BY v.user_id
  ORDER BY SUM(COALESCE(v.likes_count, 0) + COALESCE(v.comments_count, 0)) DESC
  LIMIT 50;

  -- Insert daily trending videos
  INSERT INTO trending_cache (entity_type, entity_id, period, score, updated_at)
  SELECT 
    'video',
    v.id::TEXT,
    'daily',
    (COALESCE(v.likes_count, 0) * 2 + COALESCE(v.comments_count, 0) * 3 + COALESCE(v.views_count, 0) * 0.1)::NUMERIC,
    NOW()
  FROM videos v
  WHERE v.created_at >= v_day_ago AND v.visibility = 'public'
  ORDER BY (COALESCE(v.likes_count, 0) * 2 + COALESCE(v.comments_count, 0) * 3 + COALESCE(v.views_count, 0) * 0.1) DESC
  LIMIT 50;

  -- Insert trending series (weekly)
  INSERT INTO trending_cache (entity_type, entity_id, period, score, updated_at)
  SELECT 
    'series',
    vs.id::TEXT,
    'weekly',
    (vs.total_views + vs.videos_count * 10)::NUMERIC,
    NOW()
  FROM video_series vs
  WHERE vs.updated_at >= v_week_ago
  ORDER BY (vs.total_views + vs.videos_count * 10) DESC
  LIMIT 30;
END;
$$;

-- =====================================================
-- PHASE 4: User Recommendations Cache Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_ids UUID[] NOT NULL DEFAULT '{}',
  affinity_hashtags TEXT[] DEFAULT '{}',
  affinity_creators UUID[] DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
  CONSTRAINT user_recommendations_user_id_key UNIQUE (user_id)
);

-- Index for quick lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_user_recommendations_user 
ON public.user_recommendations(user_id);

CREATE INDEX IF NOT EXISTS idx_user_recommendations_expires 
ON public.user_recommendations(expires_at);

-- Enable RLS
ALTER TABLE public.user_recommendations ENABLE ROW LEVEL SECURITY;

-- Users can only view their own recommendations
CREATE POLICY "Users can view their own recommendations"
ON public.user_recommendations FOR SELECT
USING (auth.uid() = user_id);

-- Service role can manage all (for edge functions)
CREATE POLICY "Service role can manage recommendations"
ON public.user_recommendations FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');