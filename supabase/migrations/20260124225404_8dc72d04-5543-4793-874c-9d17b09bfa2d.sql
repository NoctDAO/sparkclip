-- Create sounds table
CREATE TABLE public.sounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text,
  audio_url text NOT NULL,
  cover_url text,
  duration_seconds integer,
  uses_count integer NOT NULL DEFAULT 0,
  is_original boolean NOT NULL DEFAULT false,
  original_video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_sounds_uses_count ON public.sounds(uses_count DESC);
CREATE INDEX idx_sounds_created_at ON public.sounds(created_at DESC);

-- Add sound_id to videos table
ALTER TABLE public.videos ADD COLUMN sound_id uuid REFERENCES public.sounds(id) ON DELETE SET NULL;
CREATE INDEX idx_videos_sound_id ON public.videos(sound_id);

-- Create sound_favorites table
CREATE TABLE public.sound_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sound_id uuid NOT NULL REFERENCES public.sounds(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, sound_id)
);

-- Enable RLS on sounds
ALTER TABLE public.sounds ENABLE ROW LEVEL SECURITY;

-- Sounds viewable by everyone
CREATE POLICY "Sounds are viewable by everyone"
ON public.sounds
FOR SELECT
USING (true);

-- Authenticated users can create sounds
CREATE POLICY "Authenticated users can create sounds"
ON public.sounds
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own sounds
CREATE POLICY "Users can update their own sounds"
ON public.sounds
FOR UPDATE
USING (auth.uid() = created_by);

-- Users can delete their own sounds
CREATE POLICY "Users can delete their own sounds"
ON public.sounds
FOR DELETE
USING (auth.uid() = created_by);

-- Enable RLS on sound_favorites
ALTER TABLE public.sound_favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view their own sound favorites"
ON public.sound_favorites
FOR SELECT
USING (auth.uid() = user_id);

-- Users can add their own favorites
CREATE POLICY "Users can add sound favorites"
ON public.sound_favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can remove their own favorites
CREATE POLICY "Users can remove sound favorites"
ON public.sound_favorites
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger function to update uses_count
CREATE OR REPLACE FUNCTION public.update_sound_uses_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.sound_id IS NOT NULL THEN
    UPDATE public.sounds SET uses_count = uses_count + 1 WHERE id = NEW.sound_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.sound_id IS DISTINCT FROM NEW.sound_id THEN
      IF OLD.sound_id IS NOT NULL THEN
        UPDATE public.sounds SET uses_count = uses_count - 1 WHERE id = OLD.sound_id;
      END IF;
      IF NEW.sound_id IS NOT NULL THEN
        UPDATE public.sounds SET uses_count = uses_count + 1 WHERE id = NEW.sound_id;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.sound_id IS NOT NULL THEN
    UPDATE public.sounds SET uses_count = uses_count - 1 WHERE id = OLD.sound_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on videos table
CREATE TRIGGER trigger_update_sound_uses_count
AFTER INSERT OR UPDATE OR DELETE ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.update_sound_uses_count();

-- Create audio storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio', 'audio', true);

-- Storage policies for audio bucket
CREATE POLICY "Audio files are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'audio');

CREATE POLICY "Authenticated users can upload audio"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'audio' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own audio files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);