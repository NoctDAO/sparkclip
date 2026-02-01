-- Protect moderator identities by removing direct access to banned_by field

-- Drop the policy that allows users to see their own ban directly
DROP POLICY IF EXISTS "Users can see their own ban" ON public.banned_users;

-- Create a secure function that returns ban info without exposing banned_by
CREATE OR REPLACE FUNCTION public.get_my_ban_status()
RETURNS TABLE (
  reason text,
  expires_at timestamptz,
  banned_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT reason, expires_at, banned_at
  FROM public.banned_users
  WHERE user_id = auth.uid()
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
$$;