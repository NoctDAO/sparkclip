-- Clean up redundant trending cache policy
-- Keep only the "viewable by everyone" policy since it already covers authenticated users
DROP POLICY IF EXISTS "Authenticated users can read trending cache" ON public.trending_cache;