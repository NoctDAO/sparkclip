-- Add RLS policies for advertisers to manage their own ads

-- Advertisers can view their own ads (in addition to active ads policy)
CREATE POLICY "Advertisers can view their own ads"
ON public.ads
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Advertisers can insert their own ads
CREATE POLICY "Advertisers can create ads"
ON public.ads
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid() 
  AND (public.has_role(auth.uid(), 'advertiser') OR public.has_role(auth.uid(), 'admin'))
);

-- Advertisers can update their own ads
CREATE POLICY "Advertisers can update their own ads"
ON public.ads
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Advertisers can view analytics for their own ads
CREATE POLICY "Advertisers can view their own ad analytics"
ON public.ad_analytics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ads 
    WHERE ads.id = ad_analytics.ad_id 
    AND ads.created_by = auth.uid()
  )
);