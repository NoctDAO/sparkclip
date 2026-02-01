-- Budget Alert System Tables

-- Notification preferences table for advertiser settings
CREATE TABLE public.advertiser_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  budget_alert_email BOOLEAN NOT NULL DEFAULT true,
  budget_alert_in_app BOOLEAN NOT NULL DEFAULT true,
  alert_threshold_80 BOOLEAN NOT NULL DEFAULT true,
  alert_threshold_95 BOOLEAN NOT NULL DEFAULT true,
  alert_threshold_100 BOOLEAN NOT NULL DEFAULT true,
  custom_threshold_percent INTEGER DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.advertiser_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own notification preferences"
ON public.advertiser_notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
ON public.advertiser_notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
ON public.advertiser_notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- Budget alerts log table
CREATE TABLE public.budget_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('80_percent', '95_percent', '100_percent', 'daily_exhausted')),
  budget_type TEXT NOT NULL CHECK (budget_type IN ('total', 'daily')),
  threshold_value NUMERIC(10,2) NOT NULL,
  current_value NUMERIC(10,2) NOT NULL,
  notified_via TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS  
ALTER TABLE public.budget_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own budget alerts"
ON public.budget_alerts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert budget alerts"
ON public.budget_alerts FOR INSERT
WITH CHECK (true);

-- Add columns to ads table for tracking alert state
ALTER TABLE public.ads 
  ADD COLUMN IF NOT EXISTS last_80_alert_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_95_alert_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_100_alert_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_daily_alert_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX idx_budget_alerts_ad_id ON public.budget_alerts(ad_id);
CREATE INDEX idx_budget_alerts_user_id ON public.budget_alerts(user_id);
CREATE INDEX idx_budget_alerts_created_at ON public.budget_alerts(created_at DESC);

-- Update trigger for notification preferences
CREATE TRIGGER update_advertiser_notification_preferences_updated_at
BEFORE UPDATE ON public.advertiser_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();