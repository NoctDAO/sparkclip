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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, limit = 10, offset = 0 }: RecommendationRequest = await req.json();

    let recommendations: any[] = [];

    if (userId) {
      // Get user's likes for affinity signals
      const { data: likes } = await supabase
        .from("likes")
        .select("video_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      const likedVideoIds = likes?.map(l => l.video_id) || [];

      // Get followed creators
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);

      const followedUserIds = follows?.map(f => f.following_id) || [];

      // Get hashtags from liked videos
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

      // Priority 1: Videos from followed creators
      if (followedUserIds.length > 0) {
        const { data: followedVideos } = await supabase
          .from("videos")
          .select("*, profiles!videos_user_id_fkey(username, display_name, avatar_url)")
          .in("user_id", followedUserIds)
          .order("created_at", { ascending: false })
          .range(offset, offset + Math.floor(limit / 2) - 1);

        if (followedVideos) {
          recommendations.push(...followedVideos);
        }
      }

      // Priority 2: Videos with preferred hashtags
      if (preferredHashtags.length > 0 && recommendations.length < limit) {
        const existingIds = recommendations.map(v => v.id);
        
        for (const hashtag of preferredHashtags) {
          if (recommendations.length >= limit) break;
          
          const { data: hashtagVideos } = await supabase
            .from("videos")
            .select("*, profiles!videos_user_id_fkey(username, display_name, avatar_url)")
            .contains("hashtags", [hashtag])
            .order("likes_count", { ascending: false })
            .limit(5);

          if (hashtagVideos) {
            const newVideos = hashtagVideos.filter(v => !existingIds.includes(v.id));
            recommendations.push(...newVideos);
            existingIds.push(...newVideos.map(v => v.id));
          }
        }
      }

      // Priority 3: Fill with trending videos
      if (recommendations.length < limit) {
        const existingIds = recommendations.map(v => v.id);
        const remaining = limit - recommendations.length;

        const { data: trendingVideos } = await supabase
          .from("videos")
          .select("*, profiles!videos_user_id_fkey(username, display_name, avatar_url)")
          .order("likes_count", { ascending: false })
          .limit(remaining + existingIds.length);

        if (trendingVideos) {
          const newVideos = trendingVideos.filter(v => !existingIds.includes(v.id));
          recommendations.push(...newVideos.slice(0, remaining));
        }
      }
    } else {
      // Anonymous user: return trending videos
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data } = await supabase
        .from("videos")
        .select("*, profiles!videos_user_id_fkey(username, display_name, avatar_url)")
        .gte("created_at", weekAgo.toISOString())
        .order("likes_count", { ascending: false })
        .range(offset, offset + limit - 1);

      if (!data || data.length < limit) {
        // Fallback to all-time
        const { data: allTime } = await supabase
          .from("videos")
          .select("*, profiles!videos_user_id_fkey(username, display_name, avatar_url)")
          .order("likes_count", { ascending: false })
          .range(offset, offset + limit - 1);

        recommendations = allTime || [];
      } else {
        recommendations = data;
      }
    }

    // Shuffle slightly to add variety (but keep order mostly based on score)
    const shuffled = recommendations.slice(0, limit).sort(() => Math.random() - 0.5);

    return new Response(JSON.stringify({ recommendations: shuffled }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Recommendation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
