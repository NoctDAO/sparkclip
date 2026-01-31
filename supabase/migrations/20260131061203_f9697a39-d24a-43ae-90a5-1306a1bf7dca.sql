-- Add cover_image_url column to video_series table
ALTER TABLE public.video_series 
ADD COLUMN cover_image_url TEXT DEFAULT NULL;

-- Create storage policy for series covers if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('series-covers', 'series-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload series covers
CREATE POLICY "Users can upload their own series covers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'series-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to update their own series covers
CREATE POLICY "Users can update their own series covers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'series-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own series covers
CREATE POLICY "Users can delete their own series covers"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'series-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to series covers
CREATE POLICY "Series covers are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'series-covers');