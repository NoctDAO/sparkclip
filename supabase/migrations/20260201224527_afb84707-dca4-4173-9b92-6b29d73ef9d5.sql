-- Enhanced Ad Targeting Options

-- Add new targeting columns to ads table
ALTER TABLE public.ads 
  ADD COLUMN IF NOT EXISTS target_locations TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_age_range JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_device_types TEXT[] DEFAULT NULL;

-- Create user_interests table for tracking user content preferences
CREATE TABLE IF NOT EXISTS public.user_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  entertainment_weight NUMERIC(5,2) DEFAULT 0,
  music_weight NUMERIC(5,2) DEFAULT 0,
  sports_weight NUMERIC(5,2) DEFAULT 0,
  gaming_weight NUMERIC(5,2) DEFAULT 0,
  fashion_weight NUMERIC(5,2) DEFAULT 0,
  food_weight NUMERIC(5,2) DEFAULT 0,
  travel_weight NUMERIC(5,2) DEFAULT 0,
  tech_weight NUMERIC(5,2) DEFAULT 0,
  education_weight NUMERIC(5,2) DEFAULT 0,
  lifestyle_weight NUMERIC(5,2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_interests
CREATE POLICY "Users can view their own interests"
ON public.user_interests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage user interests"
ON public.user_interests FOR ALL
USING (auth.role() = 'service_role');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON public.user_interests(user_id);

-- Update trigger for user_interests
CREATE TRIGGER update_user_interests_updated_at
BEFORE UPDATE ON public.user_interests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();