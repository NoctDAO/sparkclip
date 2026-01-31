import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Video, Profile, Sound } from "@/types/video";
import { useAuth } from "@/hooks/useAuth";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";

export interface HashtagResult {
  tag: string;
  videoCount: number;
}

export interface SearchResults {
  videos: Video[];
  users: Profile[];
  sounds: Sound[];
  hashtags: HashtagResult[];
}

export function useSearch(query: string, debounceMs = 300) {
  const { user } = useAuth();
  const { blockedUsers } = useBlockedUsers();
  const [results, setResults] = useState<SearchResults>({
    videos: [],
    users: [],
    sounds: [],
    hashtags: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  // Get blocked user IDs for filtering
  const blockedUserIds = new Set(blockedUsers.map(b => b.blocked_user_id));

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ videos: [], users: [], sounds: [], hashtags: [] });
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query.trim());
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Load search history
  useEffect(() => {
    if (user) {
      loadSearchHistory();
    }
  }, [user]);

  const loadSearchHistory = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("search_history")
      .select("query")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      setSearchHistory([...new Set(data.map(d => d.query))]);
    }
  };

  const saveSearchQuery = async (searchQuery: string) => {
    if (!user || !searchQuery.trim()) return;

    await supabase
      .from("search_history")
      .insert({ user_id: user.id, query: searchQuery.trim() });
  };

  const clearSearchHistory = async () => {
    if (!user) return;

    await supabase
      .from("search_history")
      .delete()
      .eq("user_id", user.id);

    setSearchHistory([]);
  };

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);

    try {
      const [videosRes, usersRes, soundsRes] = await Promise.all([
        // Search videos by caption and hashtags
        supabase
          .from("videos")
          .select("*")
          .or(`caption.ilike.%${searchQuery}%`)
          .order("likes_count", { ascending: false })
          .limit(20),
        
        // Search users by username and display_name
        supabase
          .from("profiles")
          .select("*")
          .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
          .order("followers_count", { ascending: false })
          .limit(20),
        
        // Search sounds by title and artist
        supabase
          .from("sounds")
          .select("*")
          .or(`title.ilike.%${searchQuery}%,artist.ilike.%${searchQuery}%`)
          .order("uses_count", { ascending: false })
          .limit(20),
      ]);

      // Also search for hashtag matches
      const { data: hashtagVideos } = await supabase
        .from("videos")
        .select("hashtags")
        .not("hashtags", "is", null);

      // Extract unique hashtags that match the query
      const hashtagCounts: Record<string, number> = {};
      hashtagVideos?.forEach(video => {
        video.hashtags?.forEach((tag: string) => {
          if (tag.toLowerCase().includes(searchQuery.toLowerCase())) {
            hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
          }
        });
      });

      const hashtags: HashtagResult[] = Object.entries(hashtagCounts)
        .map(([tag, videoCount]) => ({ tag, videoCount }))
        .sort((a, b) => b.videoCount - a.videoCount)
        .slice(0, 20);

      // Filter out blocked users from results
      const filteredVideos = ((videosRes.data || []) as Video[])
        .filter(v => !blockedUserIds.has(v.user_id));
      const filteredUsers = ((usersRes.data || []) as Profile[])
        .filter(u => !blockedUserIds.has(u.user_id));

      setResults({
        videos: filteredVideos,
        users: filteredUsers,
        sounds: (soundsRes.data || []) as Sound[],
        hashtags,
      });
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    results,
    isLoading,
    searchHistory,
    saveSearchQuery,
    clearSearchHistory,
    loadSearchHistory,
  };
}
