import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Video } from "@/types/video";
import { useAuth } from "@/hooks/useAuth";

// In-memory cache for recommendations
const recommendationsCache: {
  data: Video[];
  timestamp: number;
  userId: string | null;
} = {
  data: [],
  timestamp: 0,
  userId: null,
};

const CACHE_TTL = 30 * 1000; // 30 seconds for client-side cache

export function useRecommendations(pageSize = 10) {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchRecommendations = useCallback(async (reset = false) => {
    if (!reset && !hasMore) return;
    
    const currentPage = reset ? 0 : page;
    const cacheKey = user?.id || "anonymous";
    
    // Check client-side cache for first page
    if (reset && currentPage === 0) {
      const now = Date.now();
      if (
        recommendationsCache.data.length > 0 &&
        recommendationsCache.userId === cacheKey &&
        (now - recommendationsCache.timestamp) < CACHE_TTL
      ) {
        setVideos(recommendationsCache.data);
        setIsLoading(false);
        setHasMore(recommendationsCache.data.length >= pageSize);
        setPage(1);
        return;
      }
    }

    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    
    try {
      // Try edge function first for personalized recommendations
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-recommendations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            userId: user?.id,
            limit: pageSize,
            offset: currentPage * pageSize,
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        throw new Error("Edge function failed");
      }

      const { recommendations } = await response.json();

      const formattedVideos: Video[] = recommendations.map((v: any) => ({
        ...v,
        profiles: v.profiles || null,
      }));

      if (reset) {
        setVideos(formattedVideos);
        // Update cache
        recommendationsCache.data = formattedVideos;
        recommendationsCache.timestamp = Date.now();
        recommendationsCache.userId = cacheKey;
      } else {
        setVideos(prev => [...prev, ...formattedVideos]);
      }
      
      setHasMore(formattedVideos.length === pageSize);
      setPage(reset ? 1 : currentPage + 1);
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === "AbortError") return;
      
      console.error("Error fetching recommendations, falling back to direct query:", error);
      
      // Fallback to direct database query
      await fetchFallbackRecommendations(reset, currentPage);
    } finally {
      setIsLoading(false);
    }
  }, [user, page, hasMore, pageSize]);

  const fetchFallbackRecommendations = async (reset: boolean, currentPage: number) => {
    try {
      // Use the optimized database function
      const { data, error } = await supabase.rpc("get_feed_videos", {
        p_user_id: user?.id || null,
        p_feed_type: "foryou",
        p_limit: pageSize,
        p_offset: currentPage * pageSize,
        p_blocked_user_ids: [],
      });

      if (error) throw error;

      // Transform the flat result into Video objects
      const formattedVideos: Video[] = (data || []).map((v: any) => ({
        id: v.id,
        user_id: v.user_id,
        video_url: v.video_url,
        thumbnail_url: v.thumbnail_url,
        caption: v.caption,
        hashtags: v.hashtags,
        likes_count: v.likes_count,
        comments_count: v.comments_count,
        shares_count: v.shares_count,
        views_count: v.views_count,
        sound_id: v.sound_id,
        series_id: v.series_id,
        series_order: v.series_order,
        duet_source_id: v.duet_source_id,
        duet_layout: v.duet_layout,
        allow_duets: v.allow_duets,
        created_at: v.created_at,
        profiles: v.profile_username ? {
          username: v.profile_username,
          display_name: v.profile_display_name,
          avatar_url: v.profile_avatar_url,
        } : null,
        sound: v.sound_title ? {
          id: v.sound_id,
          title: v.sound_title,
          artist: v.sound_artist,
          audio_url: v.sound_audio_url,
          cover_url: v.sound_cover_url,
          duration_seconds: null,
          uses_count: 0,
          is_original: false,
          original_video_id: null,
          created_by: null,
          created_at: v.created_at,
        } : null,
        series: v.series_title ? {
          id: v.series_id,
          user_id: v.user_id,
          title: v.series_title,
          description: v.series_description,
          cover_video_id: null,
          cover_image_url: null,
          videos_count: v.series_videos_count,
          total_views: 0,
          created_at: v.created_at,
          updated_at: v.created_at,
        } : null,
      }));

      if (reset) {
        setVideos(formattedVideos);
      } else {
        setVideos(prev => [...prev, ...formattedVideos]);
      }
      
      setHasMore(formattedVideos.length === pageSize);
      setPage(reset ? 1 : currentPage + 1);
    } catch (fallbackError) {
      console.error("Fallback query also failed:", fallbackError);
    }
  };

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchRecommendations(false);
    }
  }, [fetchRecommendations, isLoading, hasMore]);

  const refresh = useCallback(() => {
    // Clear cache on manual refresh
    recommendationsCache.data = [];
    recommendationsCache.timestamp = 0;
    
    setPage(0);
    setHasMore(true);
    fetchRecommendations(true);
  }, [fetchRecommendations]);

  useEffect(() => {
    fetchRecommendations(true);
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user?.id]); // Only refetch when user changes

  return {
    videos,
    isLoading,
    hasMore,
    loadMore,
    refresh,
  };
}
