-- =============================================
-- PART 1: Update Videos Table
-- =============================================

-- Add visibility column for content moderation (public, hidden, private)
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

-- Add moderation tracking fields
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS moderation_note text,
ADD COLUMN IF NOT EXISTS moderated_by uuid,
ADD COLUMN IF NOT EXISTS moderated_at timestamptz;

-- =============================================
-- PART 2: Create New Tables
-- =============================================

-- Banned users table (supports temporary and permanent bans)
CREATE TABLE IF NOT EXISTS public.banned_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  banned_by uuid,
  reason text,
  banned_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz, -- NULL = permanent ban
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

-- Admin action logs for accountability
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- User appeals for moderation decisions
CREATE TABLE IF NOT EXISTS public.appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;

-- AI-detected content flags
CREATE TABLE IF NOT EXISTS public.content_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  flag_type text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0,
  detected_issues jsonb,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_flags ENABLE ROW LEVEL SECURITY;

-- Manual keyword blocklist for moderation
CREATE TABLE IF NOT EXISTS public.moderation_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL UNIQUE,
  category text NOT NULL,
  action text NOT NULL DEFAULT 'flag',
  is_regex boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.moderation_keywords ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PART 3: Create Moderation Queue View
-- =============================================

CREATE OR REPLACE VIEW public.moderation_queue AS
SELECT 
  r.content_id,
  r.content_type,
  COUNT(*) as report_count,
  array_agg(DISTINCT r.reason) as reasons,
  array_agg(r.id) as report_ids,
  MIN(r.created_at) as first_reported,
  MAX(r.created_at) as last_reported,
  -- Priority score calculation
  (
    COUNT(*) * 10 + 
    MAX(
      CASE r.reason 
        WHEN 'minor_safety' THEN 50 
        WHEN 'violence' THEN 40
        WHEN 'hate_speech' THEN 35
        WHEN 'harassment' THEN 30
        WHEN 'nudity' THEN 25
        WHEN 'copyright' THEN 20
        WHEN 'spam' THEN 10
        ELSE 5
      END
    ) +
    -- Age penalty: older reports get higher priority (up to 20 points for reports older than 24 hours)
    LEAST(EXTRACT(EPOCH FROM (now() - MIN(r.created_at))) / 3600, 20)
  )::integer as priority_score
FROM public.reports r
WHERE r.status = 'pending'
GROUP BY r.content_id, r.content_type
ORDER BY priority_score DESC;

-- =============================================
-- PART 4: RLS Policies for Videos (Admin Override)
-- =============================================

-- Drop existing select policy to replace with visibility-aware version
DROP POLICY IF EXISTS "Videos are viewable by everyone" ON public.videos;

-- New select policy: hide 'hidden' videos from non-admins
CREATE POLICY "Videos are viewable with visibility rules"
ON public.videos
FOR SELECT
USING (
  visibility = 'public' 
  OR user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
);

-- Allow admins/moderators to delete any video
CREATE POLICY "Admins can delete any video"
ON public.videos
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- Allow admins/moderators to update any video (for hiding/moderation)
CREATE POLICY "Admins can update any video"
ON public.videos
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- =============================================
-- PART 5: RLS Policies for Comments (Admin Override)
-- =============================================

-- Allow admins/moderators to delete any comment
CREATE POLICY "Admins can delete any comment"
ON public.comments
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- =============================================
-- PART 6: RLS Policies for New Tables
-- =============================================

-- Banned Users policies
CREATE POLICY "Admins can manage bans"
ON public.banned_users
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can see their own ban"
ON public.banned_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admin Logs policies
CREATE POLICY "Admins can view logs"
ON public.admin_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

CREATE POLICY "Admins can insert logs"
ON public.admin_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- Appeals policies
CREATE POLICY "Users can create appeals for their content"
ON public.appeals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own appeals"
ON public.appeals
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all appeals"
ON public.appeals
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

CREATE POLICY "Admins can update appeals"
ON public.appeals
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- Content Flags policies (admins only)
CREATE POLICY "Admins can manage content flags"
ON public.content_flags
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- Service role can insert flags (for edge function)
CREATE POLICY "Service can insert content flags"
ON public.content_flags
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Moderation Keywords policies (admins only)
CREATE POLICY "Admins can manage keywords"
ON public.moderation_keywords
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read keywords"
ON public.moderation_keywords
FOR SELECT
TO authenticated
USING (true);