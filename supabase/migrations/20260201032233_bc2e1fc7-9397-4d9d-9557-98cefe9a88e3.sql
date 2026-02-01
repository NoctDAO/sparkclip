-- Create ads table for custom advertisement campaigns
CREATE TABLE public.ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  image_url TEXT,
  click_url TEXT NOT NULL,
  advertiser_name TEXT NOT NULL,
  advertiser_logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'scheduled', 'ended')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  priority INTEGER NOT NULL DEFAULT 0,
  impressions_count INTEGER NOT NULL DEFAULT 0,
  clicks_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT ads_media_check CHECK (video_url IS NOT NULL OR image_url IS NOT NULL)
);

-- Create ad_settings table for global configuration
CREATE TABLE public.ad_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_frequency INTEGER NOT NULL DEFAULT 5,
  adsense_enabled BOOLEAN NOT NULL DEFAULT false,
  adsense_client_id TEXT,
  adsense_slot_id TEXT,
  custom_ads_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create ad_analytics table for tracking interactions
CREATE TABLE public.ad_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click', 'skip', 'view_complete')),
  view_duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ads table
-- Public can read active ads
CREATE POLICY "Anyone can view active ads"
ON public.ads FOR SELECT
USING (status = 'active' AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date > now()));

-- Admins can do everything
CREATE POLICY "Admins can manage all ads"
ON public.ads FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for ad_settings
-- Authenticated users can read settings
CREATE POLICY "Authenticated users can read ad settings"
ON public.ad_settings FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can manage ad settings"
ON public.ad_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for ad_analytics
-- Anyone can insert analytics (for anonymous tracking)
CREATE POLICY "Anyone can insert ad analytics"
ON public.ad_analytics FOR INSERT
WITH CHECK (true);

-- Only admins can read analytics
CREATE POLICY "Admins can read ad analytics"
ON public.ad_analytics FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_ads_status ON public.ads(status);
CREATE INDEX idx_ads_priority ON public.ads(priority DESC);
CREATE INDEX idx_ads_dates ON public.ads(start_date, end_date);
CREATE INDEX idx_ad_analytics_ad_id ON public.ad_analytics(ad_id);
CREATE INDEX idx_ad_analytics_event_type ON public.ad_analytics(event_type);
CREATE INDEX idx_ad_analytics_created_at ON public.ad_analytics(created_at);

-- Create trigger for updated_at
CREATE TRIGGER update_ads_updated_at
BEFORE UPDATE ON public.ads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ad_settings_updated_at
BEFORE UPDATE ON public.ad_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default ad settings
INSERT INTO public.ad_settings (ad_frequency, adsense_enabled, custom_ads_enabled)
VALUES (5, false, true);