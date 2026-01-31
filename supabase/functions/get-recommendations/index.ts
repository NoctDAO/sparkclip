import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecommendationRequest {
  userId?: string;
  limit?: number;
  offset?: number;
  skipCache?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, limit = 10, offset = 0, skipCache = false }: RecommendationRequest = await req.json();

    let recommendations: any[] = [];
    let cacheHit = false;

    // Try to get cached recommendations first (for logged-in users)
    if (userId && !skipCache) {
      const { data: cachedRecs } = await supabase
        .from("user_recommendations")
        .select("video_ids, expires_at")
        .eq("user_id", userId)
        .single();

      if (cachedRecs && new Date(cachedRecs.expires_at) > new Date()) {
        // Cache is valid, fetch the videos
        const videoIds = cachedRecs.video_ids.slice(offset, offset + limit);
        
        if (videoIds.length > 0) {
          const { data: videos } = await supabase
            .from("videos")
            .select("*, profiles!videos_user_id_fkey(username, display_name, avatar_url)")
            .in("id", videoIds)
            .eq("visibility", "public");

          if (videos && videos.length > 0) {
            // Sort by the order in videoIds
            recommendations = videoIds
              .map((id: string) => videos.find(v => v.id === id))
              .filter(Boolean);
            cacheHit = true;
          }
        }
      }
    }

    // If no cache hit, compute recommendations
    if (!cacheHit) {
      if (userId) {
        // Parallel fetch of user preferences using Promise.all
        const [likesRes, followsRes] = await Promise.all([
          supabase
            .from("likes")
            .select("video_id")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", userId),
        ]);

        const likedVideoIds = likesRes.data?.map(l => l.video_id) || [];
        const followedUserIds = followsRes.data?.map(f => f.following_id) || [];

        // Get hashtags from liked videos (only if we have likes)
        let preferredHashtags: string[] = [];
        if (likedVideoIds.length > 0) {
          const { data: likedVideos } = await supabase
            .from("videos")
            .select("hashtags")
            .in("id", likedVideoIds.slice(0, 20));

          const hashtagCounts: Record<string, number> = {};
          likedVideos?.forEach(v => {
            v.hashtags?.forEach((tag: string) => {
              hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
            });
          });

          preferredHashtags = Object.entries(hashtagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([tag]) => tag);
        }

        // Priority 1: Videos from followed creators (50% of limit)
        if (followedUserIds.length > 0) {
          const { data: followedVideos } = await supabase
            .from("videos")
            .select("*, profiles!videos_user_id_fkey(username, display_name, avatar_url)")
            .in("user_id", followedUserIds)
            .eq("visibility", "public")
            .order("created_at", { ascending: false })
            .range(offset, offset + Math.floor(limit / 2) - 1);

          if (followedVideos) {
            recommendations.push(...followedVideos);
          }
        }

        // Priority 2: Videos with preferred hashtags
        if (preferredHashtags.length > 0 && recommendations.length < limit) {
          const existingIds = new Set(recommendations.map(v => v.id));
          
          // Fetch videos with any of the preferred hashtags
          const { data: hashtagVideos } = await supabase
            .from("videos")
            .select("*, profiles!videos_user_id_fkey(username, display_name, avatar_url)")
            .eq("visibility", "public")
            .overlaps("hashtags", preferredHashtags)
            .order("likes_count", { ascending: false })
            .limit(limit);

          if (hashtagVideos) {
            const newVideos = hashtagVideos.filter(v => !existingIds.has(v.id));
            recommendations.push(...newVideos.slice(0, limit - recommendations.length));
          }
        }

        // Priority 3: Fill with trending videos from cache
        if (recommendations.length < limit) {
          const existingIds = new Set(recommendations.map(v => v.id));
          const remaining = limit - recommendations.length;

          // Get trending video IDs from cache
          const { data: trendingCache } = await supabase
            .from("trending_cache")
            .select("entity_id")
            .eq("entity_type", "video")
            .eq("period", "weekly")
            .order("score", { ascending: false })
            .limit(remaining + existingIds.size);

          if (trendingCache && trendingCache.length > 0) {
            const trendingIds = trendingCache
              .map(t => t.entity_id)
              .filter(id => !existingIds.has(id))
              .slice(0, remaining);

            if (trendingIds.length > 0) {
              const { data: trendingVideos } = await supabase
                .from("videos")
                .select("*, profiles!videos_user_id_fkey(username, display_name, avatar_url)")
                .in("id", trendingIds)
                .eq("visibility", "public");

              if (trendingVideos) {
                recommendations.push(...trendingVideos);
              }
            }
          }
        }

        // Cache the computed recommendations for this user
        if (recommendations.length > 0 && offset === 0) {
          const videoIdsToCache = recommendations.map(v => v.id);
          
          await supabase
            .from("user_recommendations")
            .upsert({
              user_id: userId,
              video_ids: videoIdsToCache,
              affinity_hashtags: preferredHashtags,
              affinity_creators: followedUserIds.slice(0, 20),
              computed_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min TTL
            }, {
              onConflict: "user_id",
            });
        }
      } else {
        // Anonymous user: return from trending cache
        const { data: trendingCache } = await supabase
          .from("trending_cache")
          .select("entity_id")
          .eq("entity_type", "video")
          .eq("period", "weekly")
          .order("score", { ascending: false })
          .range(offset, offset + limit - 1);

        if (trendingCache && trendingCache.length > 0) {
          const videoIds = trendingCache.map(t => t.entity_id);
          
          const { data: videos } = await supabase
            .from("videos")
            .select("*, profiles!videos_user_id_fkey(username, display_name, avatar_url)")
            .in("id", videoIds)
            .eq("visibility", "public");

          if (videos) {
            // Sort by trending order
            recommendations = videoIds
              .map(id => videos.find(v => v.id === id))
              .filter(Boolean);
          }
        }

        // Fallback to recent videos if cache is empty
        if (recommendations.length === 0) {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);

          const { data } = await supabase
            .from("videos")
            .select("*, profiles!videos_user_id_fkey(username, display_name, avatar_url)")
            .eq("visibility", "public")
            .gte("created_at", weekAgo.toISOString())
            .order("likes_count", { ascending: false })
            .range(offset, offset + limit - 1);

          if (data) {
            recommendations = data;
          }
        }
      }
    }

    // Shuffle slightly to add variety (but keep order mostly based on score)
    const shuffled = recommendations.slice(0, limit).sort(() => Math.random() - 0.5);

    return new Response(
      JSON.stringify({ 
        recommendations: shuffled,
        cacheHit,
        count: shuffled.length,
      }), 
      {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          // Cache for 1 minute for personalized, 5 minutes for anonymous
          "Cache-Control": userId ? "private, max-age=60" : "public, max-age=300",
        },
      }
    );
  } catch (error) {
    console.error("Recommendation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
