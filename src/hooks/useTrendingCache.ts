import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TrendingItem {
  entity_id: string;
  entity_type: string;
  score: number;
  period: string;
}

interface TrendingCacheResult {
  videos: string[];
  hashtags: string[];
  sounds: string[];
  creators: string[];
  series: string[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

// In-memory cache with TTL
const memoryCache: {
  data: TrendingCacheResult | null;
  timestamp: number;
  ttl: number;
} = {
  data: null,
  timestamp: 0,
  ttl: 5 * 60 * 1000, // 5 minutes in milliseconds
};

export function useTrendingCache(period: "daily" | "weekly" = "weekly"): TrendingCacheResult {
  const [videos, setVideos] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [sounds, setSounds] = useState<string[]>([]);
  const [creators, setCreators] = useState<string[]>([]);
  const [series, setSeries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchTrendingCache = useCallback(async (forceRefresh = false) => {
    // Check memory cache first (unless forcing refresh)
    const now = Date.now();
    if (!forceRefresh && memoryCache.data && (now - memoryCache.timestamp) < memoryCache.ttl) {
      setVideos(memoryCache.data.videos);
      setHashtags(memoryCache.data.hashtags);
      setSounds(memoryCache.data.sounds);
      setCreators(memoryCache.data.creators);
      setSeries(memoryCache.data.series);
      setLastUpdated(memoryCache.data.lastUpdated);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("trending_cache")
        .select("entity_id, entity_type, score, period, updated_at")
        .eq("period", period)
        .order("score", { ascending: false });

      if (fetchError) throw fetchError;

      const items = data as (TrendingItem & { updated_at: string })[];

      // Group by entity type
      const grouped = {
        videos: items.filter(i => i.entity_type === "video").map(i => i.entity_id),
        hashtags: items.filter(i => i.entity_type === "hashtag").map(i => i.entity_id),
        sounds: items.filter(i => i.entity_type === "sound").map(i => i.entity_id),
        creators: items.filter(i => i.entity_type === "creator").map(i => i.entity_id),
        series: items.filter(i => i.entity_type === "series").map(i => i.entity_id),
      };

      const updatedAt = items.length > 0 ? new Date(items[0].updated_at) : new Date();

      setVideos(grouped.videos);
      setHashtags(grouped.hashtags);
      setSounds(grouped.sounds);
      setCreators(grouped.creators);
      setSeries(grouped.series);
      setLastUpdated(updatedAt);

      // Update memory cache
      memoryCache.data = {
        videos: grouped.videos,
        hashtags: grouped.hashtags,
        sounds: grouped.sounds,
        creators: grouped.creators,
        series: grouped.series,
        isLoading: false,
        error: null,
        refresh: async () => {},
        lastUpdated: updatedAt,
      };
      memoryCache.timestamp = now;

    } catch (err) {
      console.error("Error fetching trending cache:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  const refresh = useCallback(async () => {
    await fetchTrendingCache(true);
  }, [fetchTrendingCache]);

  useEffect(() => {
    fetchTrendingCache();
  }, [fetchTrendingCache]);

  return {
    videos,
    hashtags,
    sounds,
    creators,
    series,
    isLoading,
    error,
    refresh,
    lastUpdated,
  };
}

// Hook to get trending videos with full data
export function useTrendingVideos(limit = 20) {
  const { videos: videoIds, isLoading: cacheLoading } = useTrendingCache("weekly");
  const [videos, setVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (cacheLoading || videoIds.length === 0) {
      setIsLoading(cacheLoading);
      return;
    }

    const fetchVideos = async () => {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from("videos")
        .select(`
          *,
          profiles!videos_user_id_fkey(username, display_name, avatar_url)
        `)
        .in("id", videoIds.slice(0, limit))
        .eq("visibility", "public");

      if (!error && data) {
        // Sort by the order in videoIds (trending score order)
        const sortedData = data.sort((a, b) => {
          return videoIds.indexOf(a.id) - videoIds.indexOf(b.id);
        });
        setVideos(sortedData);
      }
      
      setIsLoading(false);
    };

    fetchVideos();
  }, [videoIds, cacheLoading, limit]);

  return { videos, isLoading };
}

// Hook to get trending hashtags with counts
export function useTrendingHashtags(limit = 20) {
  const { hashtags, isLoading } = useTrendingCache("weekly");
  
  return {
    hashtags: hashtags.slice(0, limit),
    isLoading,
  };
}

// Hook to get trending creators with profile data
export function useTrendingCreators(limit = 20) {
  const { creators: creatorIds, isLoading: cacheLoading } = useTrendingCache("weekly");
  const [creators, setCreators] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (cacheLoading || creatorIds.length === 0) {
      setIsLoading(cacheLoading);
      return;
    }

    const fetchCreators = async () => {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", creatorIds.slice(0, limit));

      if (!error && data) {
        // Sort by the order in creatorIds (trending score order)
        const sortedData = data.sort((a, b) => {
          return creatorIds.indexOf(a.user_id) - creatorIds.indexOf(b.user_id);
        });
        setCreators(sortedData);
      }
      
      setIsLoading(false);
    };

    fetchCreators();
  }, [creatorIds, cacheLoading, limit]);

  return { creators, isLoading };
}
