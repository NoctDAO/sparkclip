-- Create series_follows table
CREATE TABLE public.series_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  series_id UUID NOT NULL REFERENCES public.video_series(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, series_id)
);

-- Enable RLS
ALTER TABLE public.series_follows ENABLE ROW LEVEL SECURITY;

-- Users can view their own follows
CREATE POLICY "Users can view their own series follows"
ON public.series_follows
FOR SELECT
USING (auth.uid() = user_id);

-- Users can follow series
CREATE POLICY "Users can follow series"
ON public.series_follows
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can unfollow series
CREATE POLICY "Users can unfollow series"
ON public.series_follows
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_series_follows_series_id ON public.series_follows(series_id);
CREATE INDEX idx_series_follows_user_id ON public.series_follows(user_id);

-- Function to notify series followers when a new video is added
CREATE OR REPLACE FUNCTION public.notify_series_followers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower_record RECORD;
  series_owner_id UUID;
BEGIN
  -- Only trigger when a video is added to a series (series_id changes from NULL to a value)
  IF NEW.series_id IS NOT NULL AND (OLD.series_id IS NULL OR OLD.series_id IS DISTINCT FROM NEW.series_id) THEN
    -- Get series owner to avoid notifying them
    SELECT user_id INTO series_owner_id FROM video_series WHERE id = NEW.series_id;
    
    -- Notify all followers of this series (except the video uploader)
    FOR follower_record IN 
      SELECT user_id FROM series_follows 
      WHERE series_id = NEW.series_id 
      AND user_id != NEW.user_id
    LOOP
      INSERT INTO notifications (user_id, actor_id, type, video_id)
      VALUES (follower_record.user_id, NEW.user_id, 'new_series_part', NEW.id);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for notifying followers
CREATE TRIGGER notify_series_followers_trigger
AFTER UPDATE ON public.videos
FOR EACH ROW
EXECUTE FUNCTION public.notify_series_followers();

-- Also trigger on insert if video is created with a series_id
CREATE OR REPLACE FUNCTION public.notify_series_followers_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower_record RECORD;
BEGIN
  IF NEW.series_id IS NOT NULL THEN
    FOR follower_record IN 
      SELECT user_id FROM series_follows 
      WHERE series_id = NEW.series_id 
      AND user_id != NEW.user_id
    LOOP
      INSERT INTO notifications (user_id, actor_id, type, video_id)
      VALUES (follower_record.user_id, NEW.user_id, 'new_series_part', NEW.id);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_series_followers_on_insert_trigger
AFTER INSERT ON public.videos
FOR EACH ROW
EXECUTE FUNCTION public.notify_series_followers_on_insert();