-- Create video_views table to track detailed view analytics
CREATE TABLE public.video_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  viewer_id UUID,  -- nullable for anonymous viewers
  watch_duration_seconds NUMERIC(10,2) NOT NULL DEFAULT 0,
  video_duration_seconds NUMERIC(10,2),
  completion_percentage NUMERIC(5,2) DEFAULT 0,
  watched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_video_views_video_id ON public.video_views(video_id);
CREATE INDEX idx_video_views_viewer_id ON public.video_views(viewer_id);
CREATE INDEX idx_video_views_watched_at ON public.video_views(watched_at);
CREATE INDEX idx_video_views_video_date ON public.video_views(video_id, watched_at);

-- Enable RLS
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a view (including anonymous)
CREATE POLICY "Anyone can log a view"
ON public.video_views
FOR INSERT
WITH CHECK (true);

-- Video owners can view analytics for their videos
CREATE POLICY "Video owners can view their video analytics"
ON public.video_views
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = video_views.video_id 
    AND videos.user_id = auth.uid()
  )
);

-- Users can view their own watch history
CREATE POLICY "Users can view their own watch history"
ON public.video_views
FOR SELECT
USING (viewer_id = auth.uid());

-- Enable realtime for video_views
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_views;