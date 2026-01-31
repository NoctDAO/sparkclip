-- =============================================
-- PRIORITY 1: SECURITY FIXES
-- =============================================

-- 1.1 Fix Privacy-Exposing RLS Policies
-- Drop existing overly permissive SELECT policies

-- Likes table: restrict to own likes only
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;
CREATE POLICY "Users can view own likes"
ON public.likes FOR SELECT
USING (auth.uid() = user_id);

-- Follows table: users can see their own follows and who follows them
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
CREATE POLICY "Users can view own follow relationships"
ON public.follows FOR SELECT
USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Comment likes table: restrict to own likes only
DROP POLICY IF EXISTS "Comment likes are viewable by everyone" ON public.comment_likes;
CREATE POLICY "Users can view own comment likes"
ON public.comment_likes FOR SELECT
USING (auth.uid() = user_id);

-- 1.2 Add DELETE policy to user_interactions for GDPR compliance
CREATE POLICY "Users can delete their own interactions"
ON public.user_interactions FOR DELETE
USING (auth.uid() = user_id);

-- 1.3 Create User Roles System (for verification badges, admin, moderator)
-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'verified');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Everyone can see who is verified (for badge display)
CREATE POLICY "User roles are viewable by everyone"
ON public.user_roles FOR SELECT
USING (true);

-- Only admins can manage roles (using security definer function)
-- First create the has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Only admins can insert roles
CREATE POLICY "Admins can grant roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete roles
CREATE POLICY "Admins can revoke roles"
ON public.user_roles FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- 1.4 Create Reports table for content moderation
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('video', 'comment', 'user')),
    content_id UUID NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports"
ON public.reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
ON public.reports FOR SELECT
USING (auth.uid() = reporter_id);

-- Admins and moderators can view all reports
CREATE POLICY "Moderators can view all reports"
ON public.reports FOR SELECT
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'moderator')
);

-- Admins and moderators can update reports
CREATE POLICY "Moderators can update reports"
ON public.reports FOR UPDATE
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'moderator')
);