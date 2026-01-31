import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Video } from "@/types/video";
import { useAuth } from "@/hooks/useAuth";

export function useRecommendations(pageSize = 10) {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchRecommendations();
  }, [user]);

  const fetchRecommendations = useCallback(async (reset = false) => {
    if (!reset && !hasMore) return;
    
    setIsLoading(true);
    const currentPage = reset ? 0 : page;
    
    try {
      if (user) {
        // For logged-in users, try personalized recommendations
        const recommendations = await getPersonalizedRecommendations(
          user.id, 
          currentPage * pageSize, 
          pageSize
        );
        
        if (reset) {
          setVideos(recommendations);
        } else {
          setVideos(prev => [...prev, ...recommendations]);
        }
        setHasMore(recommendations.length === pageSize);
      } else {
        // For anonymous users, show trending
        const trending = await getTrendingVideos(currentPage * pageSize, pageSize);
        
        if (reset) {
          setVideos(trending);
        } else {
          setVideos(prev => [...prev, ...trending]);
        }
        setHasMore(trending.length === pageSize);
      }
      
      setPage(reset ? 1 : currentPage + 1);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, page, hasMore, pageSize]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchRecommendations(false);
    }
  }, [fetchRecommendations, isLoading, hasMore]);

  const refresh = useCallback(() => {
    setPage(0);
    setHasMore(true);
    fetchRecommendations(true);
  }, [fetchRecommendations]);

  return {
    videos,
    isLoading,
    hasMore,
    loadMore,
    refresh,
  };
}

async function getPersonalizedRecommendations(
  userId: string,
  offset: number,
  limit: number
): Promise<Video[]> {
  // Get user's liked videos for affinity signals
  const { data: likedVideos } = await supabase
    .from("likes")
    .select("video_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const likedVideoIds = likedVideos?.map(l => l.video_id) || [];

  // Get followed creators
  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  const followedUserIds = follows?.map(f => f.following_id) || [];

  // Get hashtags from liked videos for affinity
  let preferredHashtags: string[] = [];
  if (likedVideoIds.length > 0) {
    const { data: likedVideoData } = await supabase
      .from("videos")
      .select("hashtags")
      .in("id", likedVideoIds.slice(0, 20))
      .not("hashtags", "is", null);

    const hashtagCounts: Record<string, number> = {};
    likedVideoData?.forEach(v => {
      v.hashtags?.forEach((tag: string) => {
        hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
      });
    });

    preferredHashtags = Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
  }

  // Build recommendation query
  // Priority: followed creators > hashtag affinity > trending
  let recommendations: Video[] = [];

  // 1. Videos from followed creators (not already seen)
  if (followedUserIds.length > 0 && recommendations.length < limit) {
    const { data: followedVideos } = await supabase
      .from("videos")
      .select("*")
      .in("user_id", followedUserIds)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (followedVideos) {
      recommendations.push(...(followedVideos as Video[]));
    }
  }

  // 2. Fill with trending/popular videos
  if (recommendations.length < limit) {
    const remaining = limit - recommendations.length;
    const existingIds = recommendations.map(v => v.id);
    
    let query = supabase
      .from("videos")
      .select("*")
      .order("likes_count", { ascending: false })
      .limit(remaining + offset);

    if (existingIds.length > 0) {
      // Can't use .not('id', 'in', existingIds) easily, so we'll filter after
    }

    const { data: trendingVideos } = await query;
    
    if (trendingVideos) {
      const filtered = trendingVideos.filter(v => !existingIds.includes(v.id));
      recommendations.push(...(filtered.slice(0, remaining) as Video[]));
    }
  }

  return recommendations.slice(0, limit);
}

async function getTrendingVideos(offset: number, limit: number): Promise<Video[]> {
  // Get trending videos based on recent engagement
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data } = await supabase
    .from("videos")
    .select("*")
    .gte("created_at", weekAgo.toISOString())
    .order("likes_count", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!data || data.length < limit) {
    // Fallback to all-time trending if not enough recent videos
    const { data: allTimeData } = await supabase
      .from("videos")
      .select("*")
      .order("likes_count", { ascending: false })
      .range(offset, offset + limit - 1);

    return (allTimeData || []) as Video[];
  }

  return data as Video[];
}
