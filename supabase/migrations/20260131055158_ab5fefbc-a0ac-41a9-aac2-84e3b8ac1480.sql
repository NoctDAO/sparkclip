-- Create video_series table
CREATE TABLE public.video_series (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_video_id UUID,
  videos_count INTEGER NOT NULL DEFAULT 0,
  total_views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add series columns to videos table
ALTER TABLE public.videos 
ADD COLUMN series_id UUID REFERENCES public.video_series(id) ON DELETE SET NULL,
ADD COLUMN series_order INTEGER;

-- Add foreign key for cover_video_id after videos table has series_id
ALTER TABLE public.video_series 
ADD CONSTRAINT video_series_cover_video_id_fkey 
FOREIGN KEY (cover_video_id) REFERENCES public.videos(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.video_series ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_series
CREATE POLICY "Series are viewable by everyone"
ON public.video_series
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own series"
ON public.video_series
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own series"
ON public.video_series
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own series"
ON public.video_series
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to update series videos_count
CREATE OR REPLACE FUNCTION public.update_series_videos_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.series_id IS NOT NULL THEN
    UPDATE public.video_series SET videos_count = videos_count + 1, updated_at = now() WHERE id = NEW.series_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.series_id IS DISTINCT FROM NEW.series_id THEN
      IF OLD.series_id IS NOT NULL THEN
        UPDATE public.video_series SET videos_count = videos_count - 1, updated_at = now() WHERE id = OLD.series_id;
      END IF;
      IF NEW.series_id IS NOT NULL THEN
        UPDATE public.video_series SET videos_count = videos_count + 1, updated_at = now() WHERE id = NEW.series_id;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.series_id IS NOT NULL THEN
    UPDATE public.video_series SET videos_count = videos_count - 1, updated_at = now() WHERE id = OLD.series_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for videos_count
CREATE TRIGGER update_series_videos_count_trigger
AFTER INSERT OR UPDATE OF series_id OR DELETE ON public.videos
FOR EACH ROW
EXECUTE FUNCTION public.update_series_videos_count();

-- Create function to update series total_views
CREATE OR REPLACE FUNCTION public.update_series_total_views()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.series_id IS NOT NULL THEN
    UPDATE public.video_series 
    SET total_views = (
      SELECT COALESCE(SUM(views_count), 0) 
      FROM public.videos 
      WHERE series_id = NEW.series_id
    )
    WHERE id = NEW.series_id;
  END IF;
  IF OLD.series_id IS NOT NULL AND OLD.series_id IS DISTINCT FROM NEW.series_id THEN
    UPDATE public.video_series 
    SET total_views = (
      SELECT COALESCE(SUM(views_count), 0) 
      FROM public.videos 
      WHERE series_id = OLD.series_id
    )
    WHERE id = OLD.series_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for total_views
CREATE TRIGGER update_series_total_views_trigger
AFTER UPDATE OF views_count, series_id ON public.videos
FOR EACH ROW
EXECUTE FUNCTION public.update_series_total_views();

-- Create index for faster series lookups
CREATE INDEX idx_videos_series_id ON public.videos(series_id) WHERE series_id IS NOT NULL;
CREATE INDEX idx_videos_series_order ON public.videos(series_id, series_order) WHERE series_id IS NOT NULL;

-- Trigger to update updated_at on video_series
CREATE TRIGGER update_video_series_updated_at
BEFORE UPDATE ON public.video_series
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();