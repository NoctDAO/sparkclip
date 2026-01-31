-- Create user_privacy_settings table
CREATE TABLE public.user_privacy_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  is_private_account BOOLEAN NOT NULL DEFAULT false,
  comment_permission TEXT NOT NULL DEFAULT 'everyone' CHECK (comment_permission IN ('everyone', 'followers', 'no_one')),
  message_permission TEXT NOT NULL DEFAULT 'everyone' CHECK (message_permission IN ('everyone', 'followers', 'no_one')),
  show_liked_videos BOOLEAN NOT NULL DEFAULT true,
  show_following_list BOOLEAN NOT NULL DEFAULT true,
  show_followers_list BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own privacy settings
CREATE POLICY "Users can view their own privacy settings"
ON public.user_privacy_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own privacy settings
CREATE POLICY "Users can insert their own privacy settings"
ON public.user_privacy_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own privacy settings
CREATE POLICY "Users can update their own privacy settings"
ON public.user_privacy_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_privacy_settings_updated_at
BEFORE UPDATE ON public.user_privacy_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();