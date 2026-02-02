-- Create watch_history table for tracking video viewing progress
CREATE TABLE public.watch_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  watch_progress NUMERIC(5,4) NOT NULL DEFAULT 0 CHECK (watch_progress >= 0 AND watch_progress <= 1),
  watch_duration INTEGER NOT NULL DEFAULT 0,
  watched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Create content_preferences table for "not interested" signals
CREATE TABLE public.content_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  preference_type TEXT NOT NULL CHECK (preference_type IN ('not_interested_video', 'not_interested_creator', 'not_interested_hashtag')),
  target_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, preference_type, target_id)
);

-- Create indexes for performance
CREATE INDEX idx_watch_history_user_id ON public.watch_history(user_id);
CREATE INDEX idx_watch_history_video_id ON public.watch_history(video_id);
CREATE INDEX idx_watch_history_watched_at ON public.watch_history(watched_at DESC);
CREATE INDEX idx_watch_history_progress ON public.watch_history(user_id, watch_progress) WHERE watch_progress > 0.1 AND watch_progress < 0.9;
CREATE INDEX idx_content_preferences_user_id ON public.content_preferences(user_id);
CREATE INDEX idx_content_preferences_type ON public.content_preferences(user_id, preference_type);

-- Enable Row Level Security
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for watch_history
CREATE POLICY "Users can view their own watch history"
  ON public.watch_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watch history"
  ON public.watch_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watch history"
  ON public.watch_history
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watch history"
  ON public.watch_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for content_preferences
CREATE POLICY "Users can view their own content preferences"
  ON public.content_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own content preferences"
  ON public.content_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content preferences"
  ON public.content_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for watch_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_history;