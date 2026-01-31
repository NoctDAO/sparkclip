-- Restrict comments and sounds tables to authenticated users only

-- Comments: Require authentication to view
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by authenticated users"
ON public.comments FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Sounds: Require authentication to view
DROP POLICY IF EXISTS "Sounds are viewable by everyone" ON public.sounds;
CREATE POLICY "Sounds are viewable by authenticated users"
ON public.sounds FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Video series: Also restrict for consistency
DROP POLICY IF EXISTS "Series are viewable by everyone" ON public.video_series;
CREATE POLICY "Series are viewable by authenticated users"
ON public.video_series FOR SELECT
USING (auth.uid() IS NOT NULL);