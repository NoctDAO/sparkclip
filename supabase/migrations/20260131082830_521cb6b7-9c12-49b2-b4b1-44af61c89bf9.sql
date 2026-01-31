-- =====================================================
-- SECURITY FIX: Restrict access to sensitive tables
-- =====================================================

-- 1. Fix user_roles: Only admins can view all roles, users can see their own
DROP POLICY IF EXISTS "Anyone can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Fix user_privacy_settings: Users can only view their own settings
DROP POLICY IF EXISTS "Anyone can view privacy settings" ON public.user_privacy_settings;
DROP POLICY IF EXISTS "Users can view all privacy settings for DM checks" ON public.user_privacy_settings;

CREATE POLICY "Users can view their own privacy settings"
ON public.user_privacy_settings FOR SELECT
USING (auth.uid() = user_id);

-- Create a security definer function for checking message permissions
CREATE OR REPLACE FUNCTION public.can_message_user(target_user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_permission TEXT;
  v_is_following BOOLEAN;
BEGIN
  -- Get the target user's message permission
  SELECT message_permission INTO v_permission
  FROM user_privacy_settings
  WHERE user_id = target_user_id;
  
  -- Default to 'everyone' if no settings exist
  IF v_permission IS NULL THEN
    RETURN TRUE;
  END IF;
  
  IF v_permission = 'everyone' THEN
    RETURN TRUE;
  ELSIF v_permission = 'nobody' THEN
    RETURN FALSE;
  ELSIF v_permission = 'followers' THEN
    -- Check if current user follows target
    SELECT EXISTS(
      SELECT 1 FROM follows
      WHERE follower_id = auth.uid()
      AND following_id = target_user_id
    ) INTO v_is_following;
    RETURN v_is_following;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- 3. Fix moderation_keywords: Only admins/moderators can view
DROP POLICY IF EXISTS "Authenticated users can read keywords for moderation" ON public.moderation_keywords;
DROP POLICY IF EXISTS "Admins can read moderation keywords" ON public.moderation_keywords;
DROP POLICY IF EXISTS "Moderators can read moderation keywords" ON public.moderation_keywords;

CREATE POLICY "Admins can read moderation keywords"
ON public.moderation_keywords FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can read moderation keywords"
ON public.moderation_keywords FOR SELECT
USING (public.has_role(auth.uid(), 'moderator'));

-- 4. Fix video_views: Only authenticated users can insert views
DROP POLICY IF EXISTS "Anyone can log a view" ON public.video_views;
DROP POLICY IF EXISTS "Authenticated users can log views" ON public.video_views;

CREATE POLICY "Authenticated users can log views"
ON public.video_views FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Fix trending_cache: Only authenticated users can read
DROP POLICY IF EXISTS "Anyone can read trending cache" ON public.trending_cache;
DROP POLICY IF EXISTS "Authenticated users can read trending cache" ON public.trending_cache;

CREATE POLICY "Authenticated users can read trending cache"
ON public.trending_cache FOR SELECT
USING (auth.uid() IS NOT NULL);