import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Video } from "@/types/video";

interface WatchHistoryEntry {
  id: string;
  video_id: string;
  watch_progress: number;
  watch_duration: number;
  watched_at: string;
  video?: Video & {
    profile?: {
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
    };
  };
}

const DEBOUNCE_MS = 5000; // 5 seconds debounce

export function useWatchHistory() {
  const { user } = useAuth();
  const [continueWatching, setContinueWatching] = useState<WatchHistoryEntry[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Track pending updates to debounce
  const pendingUpdates = useRef<Map<string, { progress: number; duration: number }>>(new Map());
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Record watch progress with debouncing
  const recordWatchProgress = useCallback(
    (videoId: string, progress: number, duration: number) => {
      if (!user) return;

      // Store pending update
      pendingUpdates.current.set(videoId, { progress, duration });

      // Clear existing timer for this video
      const existingTimer = debounceTimers.current.get(videoId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new debounced timer
      const timer = setTimeout(async () => {
        const update = pendingUpdates.current.get(videoId);
        if (!update) return;

        try {
          await supabase.from("watch_history").upsert(
            {
              user_id: user.id,
              video_id: videoId,
              watch_progress: update.progress,
              watch_duration: update.duration,
              watched_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id,video_id",
            }
          );
        } catch (error) {
          console.error("Error recording watch progress:", error);
        }

        pendingUpdates.current.delete(videoId);
        debounceTimers.current.delete(videoId);
      }, DEBOUNCE_MS);

      debounceTimers.current.set(videoId, timer);
    },
    [user]
  );

  // Fetch continue watching (10-90% progress)
  const fetchContinueWatching = useCallback(async () => {
    if (!user) {
      setContinueWatching([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("watch_history")
        .select(`
          id,
          video_id,
          watch_progress,
          watch_duration,
          watched_at
        `)
        .eq("user_id", user.id)
        .gt("watch_progress", 0.1)
        .lt("watch_progress", 0.9)
        .order("watched_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data && data.length > 0) {
        // Fetch video details
        const videoIds = data.map((d) => d.video_id);
        const { data: videos } = await supabase
          .from("videos")
          .select("*")
          .in("id", videoIds)
          .eq("visibility", "public");

        // Fetch profiles separately
        const userIds = [...new Set(videos?.map((v) => v.user_id) || [])];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
        const videoMap = new Map(
          videos?.map((v) => [v.id, { ...v, profile: profileMap.get(v.user_id) }]) || []
        );
        
        const enriched = data
          .map((entry) => ({
            ...entry,
            video: videoMap.get(entry.video_id),
          }))
          .filter((entry) => entry.video);

        setContinueWatching(enriched);
      } else {
        setContinueWatching([]);
      }
    } catch (error) {
      console.error("Error fetching continue watching:", error);
      setContinueWatching([]);
    }
  }, [user]);

  // Fetch full watch history
  const fetchWatchHistory = useCallback(
    async (limit = 50, offset = 0) => {
      if (!user) {
        setWatchHistory([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("watch_history")
          .select(`
            id,
            video_id,
            watch_progress,
            watch_duration,
            watched_at
          `)
          .eq("user_id", user.id)
          .order("watched_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          const videoIds = data.map((d) => d.video_id);
          const { data: videos } = await supabase
            .from("videos")
            .select("*")
            .in("id", videoIds);

          // Fetch profiles separately
          const userIds = [...new Set(videos?.map((v) => v.user_id) || [])];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, username, display_name, avatar_url")
            .in("user_id", userIds);

          const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

          const videoMap = new Map(
            videos?.map((v) => [v.id, { ...v, profile: profileMap.get(v.user_id) }]) || []
          );
          
          const enriched = data
            .map((entry) => ({
              ...entry,
              video: videoMap.get(entry.video_id),
            }))
            .filter((entry) => entry.video);

          setWatchHistory(enriched);
        } else {
          setWatchHistory([]);
        }
      } catch (error) {
        console.error("Error fetching watch history:", error);
        setWatchHistory([]);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // Clear all watch history
  const clearHistory = useCallback(async () => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("watch_history")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setWatchHistory([]);
      setContinueWatching([]);
      return true;
    } catch (error) {
      console.error("Error clearing watch history:", error);
      return false;
    }
  }, [user]);

  // Get stored progress for a specific video
  const getVideoProgress = useCallback(
    async (videoId: string): Promise<number> => {
      if (!user) return 0;

      try {
        const { data } = await supabase
          .from("watch_history")
          .select("watch_progress")
          .eq("user_id", user.id)
          .eq("video_id", videoId)
          .single();

        return data?.watch_progress ?? 0;
      } catch {
        return 0;
      }
    },
    [user]
  );

  // Initial fetch
  useEffect(() => {
    fetchContinueWatching();
    fetchWatchHistory();
  }, [fetchContinueWatching, fetchWatchHistory]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      debounceTimers.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return {
    continueWatching,
    watchHistory,
    loading,
    recordWatchProgress,
    fetchWatchHistory,
    fetchContinueWatching,
    clearHistory,
    getVideoProgress,
  };
}
