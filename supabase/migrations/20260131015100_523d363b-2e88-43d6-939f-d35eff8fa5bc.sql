-- Create user_interactions table for tracking engagement signals
CREATE TABLE public.user_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'like', 'share', 'complete')),
  watch_percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_user_interactions_user_id ON public.user_interactions(user_id);
CREATE INDEX idx_user_interactions_video_id ON public.user_interactions(video_id);
CREATE INDEX idx_user_interactions_type ON public.user_interactions(interaction_type);
CREATE INDEX idx_user_interactions_created_at ON public.user_interactions(created_at DESC);

-- Enable RLS
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

-- Policies for user_interactions
CREATE POLICY "Users can insert their own interactions"
ON public.user_interactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own interactions"
ON public.user_interactions
FOR SELECT
USING (auth.uid() = user_id);

-- Create trending_cache table
CREATE TABLE public.trending_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('hashtag', 'sound', 'video', 'creator')),
  entity_id TEXT NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  period TEXT NOT NULL CHECK (period IN ('hourly', 'daily', 'weekly')),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id, period)
);

-- Index for trending queries
CREATE INDEX idx_trending_cache_lookup ON public.trending_cache(entity_type, period, score DESC);

-- Enable RLS (public read access)
ALTER TABLE public.trending_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trending cache is viewable by everyone"
ON public.trending_cache
FOR SELECT
USING (true);

-- Create search_history table
CREATE TABLE public.search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for user's search history
CREATE INDEX idx_search_history_user ON public.search_history(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own search history"
ON public.search_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own search history"
ON public.search_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own search history"
ON public.search_history
FOR DELETE
USING (auth.uid() = user_id);

-- Add full-text search indexes
CREATE INDEX idx_videos_caption_search ON public.videos USING GIN (to_tsvector('english', COALESCE(caption, '')));
CREATE INDEX idx_profiles_username_search ON public.profiles USING GIN (to_tsvector('english', COALESCE(username, '') || ' ' || COALESCE(display_name, '')));
CREATE INDEX idx_sounds_title_search ON public.sounds USING GIN (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(artist, '')));

-- Add GIN index for hashtags array
CREATE INDEX idx_videos_hashtags ON public.videos USING GIN (hashtags);