-- Creator Revenue Sharing System

-- Track creator earnings from ads shown on their videos
CREATE TABLE public.creator_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  ad_id UUID REFERENCES public.ads(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click')),
  gross_revenue NUMERIC(10,4) NOT NULL DEFAULT 0,
  creator_share NUMERIC(10,4) NOT NULL DEFAULT 0,
  share_percentage NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX idx_creator_earnings_creator_id ON public.creator_earnings(creator_id);
CREATE INDEX idx_creator_earnings_video_id ON public.creator_earnings(video_id);
CREATE INDEX idx_creator_earnings_created_at ON public.creator_earnings(created_at);

-- Enable RLS
ALTER TABLE public.creator_earnings ENABLE ROW LEVEL SECURITY;

-- Creators can view their own earnings
CREATE POLICY "Creators can view their own earnings"
ON public.creator_earnings FOR SELECT
USING (auth.uid() = creator_id);

-- System can insert earnings (via functions)
CREATE POLICY "System can insert creator earnings"
ON public.creator_earnings FOR INSERT
WITH CHECK (true);

-- Track aggregated creator payouts
CREATE TABLE public.creator_payout_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL UNIQUE,
  total_impressions INTEGER NOT NULL DEFAULT 0,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
  pending_payout NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_payout_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_payout_summary ENABLE ROW LEVEL SECURITY;

-- Creators can view their own payout summary
CREATE POLICY "Creators can view their own payout summary"
ON public.creator_payout_summary FOR SELECT
USING (auth.uid() = creator_id);

-- Admins can manage all payout summaries
CREATE POLICY "Admins can manage payout summaries"
ON public.creator_payout_summary FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Function to record creator earnings when ad events occur
CREATE OR REPLACE FUNCTION public.record_creator_earning(
  p_video_id UUID,
  p_ad_id UUID,
  p_event_type TEXT,
  p_revenue NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id UUID;
  v_share_pct NUMERIC := 50.00;
  v_creator_share NUMERIC;
BEGIN
  SELECT user_id INTO v_creator_id FROM videos WHERE id = p_video_id;
  IF v_creator_id IS NULL THEN RETURN; END IF;
  
  v_creator_share := p_revenue * (v_share_pct / 100);
  
  INSERT INTO creator_earnings (creator_id, video_id, ad_id, event_type, gross_revenue, creator_share, share_percentage)
  VALUES (v_creator_id, p_video_id, p_ad_id, p_event_type, p_revenue, v_creator_share, v_share_pct);
  
  INSERT INTO creator_payout_summary (creator_id, total_impressions, total_clicks, total_earnings, pending_payout)
  VALUES (
    v_creator_id,
    CASE WHEN p_event_type = 'impression' THEN 1 ELSE 0 END,
    CASE WHEN p_event_type = 'click' THEN 1 ELSE 0 END,
    v_creator_share,
    v_creator_share
  )
  ON CONFLICT (creator_id) DO UPDATE SET
    total_impressions = creator_payout_summary.total_impressions + CASE WHEN p_event_type = 'impression' THEN 1 ELSE 0 END,
    total_clicks = creator_payout_summary.total_clicks + CASE WHEN p_event_type = 'click' THEN 1 ELSE 0 END,
    total_earnings = creator_payout_summary.total_earnings + v_creator_share,
    pending_payout = creator_payout_summary.pending_payout + v_creator_share,
    updated_at = now();
END;
$$;