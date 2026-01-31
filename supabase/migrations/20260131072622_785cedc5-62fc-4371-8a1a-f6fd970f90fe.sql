-- Add duet-related columns to videos table
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS duet_source_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS duet_layout TEXT CHECK (duet_layout IN ('side-by-side', 'top-bottom', 'picture-in-picture')),
ADD COLUMN IF NOT EXISTS allow_duets BOOLEAN DEFAULT true;

-- Create index for efficient duet queries
CREATE INDEX IF NOT EXISTS idx_videos_duet_source_id ON public.videos(duet_source_id) WHERE duet_source_id IS NOT NULL;

-- Create index for finding videos that allow duets
CREATE INDEX IF NOT EXISTS idx_videos_allow_duets ON public.videos(allow_duets) WHERE allow_duets = true;