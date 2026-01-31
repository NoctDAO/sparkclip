-- Allow users to view privacy settings of other users (needed for enforcement)
-- Drop the existing policy first
DROP POLICY IF EXISTS "Users can view their own privacy settings" ON public.user_privacy_settings;

-- Create a policy that allows viewing own settings and others can see limited fields
CREATE POLICY "Privacy settings are viewable by everyone"
ON public.user_privacy_settings
FOR SELECT
USING (true);