-- Create a function to increment view count
CREATE OR REPLACE FUNCTION public.increment_view_count(video_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.videos 
  SET views_count = COALESCE(views_count, 0) + 1 
  WHERE id = video_id;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.increment_view_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_view_count(UUID) TO anon;