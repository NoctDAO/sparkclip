-- Create storage bucket for ad creatives
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-creatives', 'ad-creatives', true);

-- Allow anyone to view ad creatives (public bucket)
CREATE POLICY "Ad creatives are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad-creatives');

-- Only admins can upload ad creatives
CREATE POLICY "Admins can upload ad creatives"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ad-creatives' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Only admins can update ad creatives
CREATE POLICY "Admins can update ad creatives"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'ad-creatives' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Only admins can delete ad creatives
CREATE POLICY "Admins can delete ad creatives"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ad-creatives' 
  AND public.has_role(auth.uid(), 'admin')
);