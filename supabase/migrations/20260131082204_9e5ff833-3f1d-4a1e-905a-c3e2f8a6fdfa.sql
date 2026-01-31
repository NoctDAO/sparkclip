-- Update the entity_type check constraint to include 'series'
ALTER TABLE public.trending_cache DROP CONSTRAINT IF EXISTS trending_cache_entity_type_check;
ALTER TABLE public.trending_cache ADD CONSTRAINT trending_cache_entity_type_check 
CHECK (entity_type = ANY (ARRAY['hashtag'::text, 'sound'::text, 'video'::text, 'creator'::text, 'series'::text]));