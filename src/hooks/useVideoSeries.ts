import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { VideoSeries, Video } from "@/types/video";

export function useVideoSeries() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const createSeries = useCallback(async (title: string, description?: string): Promise<VideoSeries | null> => {
    if (!user) {
      toast({ title: "Please sign in to create a series", variant: "destructive" });
      return null;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("video_series")
      .insert({
        user_id: user.id,
        title,
        description: description || null,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast({ title: "Failed to create series", variant: "destructive" });
      return null;
    }

    return data as VideoSeries;
  }, [user, toast]);

  const getUserSeries = useCallback(async (userId: string): Promise<VideoSeries[]> => {
    const { data, error } = await supabase
      .from("video_series")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return [];
    }

    return data as VideoSeries[];
  }, []);

  const getSeriesById = useCallback(async (seriesId: string): Promise<VideoSeries | null> => {
    const { data, error } = await supabase
      .from("video_series")
      .select("*")
      .eq("id", seriesId)
      .single();

    if (error) {
      return null;
    }

    return data as VideoSeries;
  }, []);

  const getSeriesVideos = useCallback(async (seriesId: string): Promise<Video[]> => {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("series_id", seriesId)
      .order("series_order", { ascending: true });

    if (error) {
      return [];
    }

    // Fetch profiles for videos
    const userIds = [...new Set(data.map(v => v.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    return data.map(video => ({
      ...video,
      profiles: profileMap.get(video.user_id) || null,
    })) as Video[];
  }, []);

  const addToSeries = useCallback(async (videoId: string, seriesId: string): Promise<boolean> => {
    if (!user) return false;

    // Get current max order in series
    const { data: existingVideos } = await supabase
      .from("videos")
      .select("series_order")
      .eq("series_id", seriesId)
      .order("series_order", { ascending: false })
      .limit(1);

    const nextOrder = (existingVideos?.[0]?.series_order || 0) + 1;

    const { error } = await supabase
      .from("videos")
      .update({ series_id: seriesId, series_order: nextOrder })
      .eq("id", videoId)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Failed to add video to series", variant: "destructive" });
      return false;
    }

    return true;
  }, [user, toast]);

  const removeFromSeries = useCallback(async (videoId: string): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from("videos")
      .update({ series_id: null, series_order: null })
      .eq("id", videoId)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Failed to remove video from series", variant: "destructive" });
      return false;
    }

    return true;
  }, [user, toast]);

  const reorderSeries = useCallback(async (seriesId: string, videoIds: string[]): Promise<boolean> => {
    if (!user) return false;

    // Update each video's series_order
    const updates = videoIds.map((videoId, index) => 
      supabase
        .from("videos")
        .update({ series_order: index + 1 })
        .eq("id", videoId)
        .eq("series_id", seriesId)
        .eq("user_id", user.id)
    );

    const results = await Promise.all(updates);
    const hasError = results.some(r => r.error);

    if (hasError) {
      toast({ title: "Failed to reorder series", variant: "destructive" });
      return false;
    }

    return true;
  }, [user, toast]);

  const updateSeries = useCallback(async (
    seriesId: string, 
    updates: { title?: string; description?: string; cover_video_id?: string }
  ): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from("video_series")
      .update(updates)
      .eq("id", seriesId)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Failed to update series", variant: "destructive" });
      return false;
    }

    return true;
  }, [user, toast]);

  const deleteSeries = useCallback(async (seriesId: string): Promise<boolean> => {
    if (!user) return false;

    // First, unlink all videos from the series
    await supabase
      .from("videos")
      .update({ series_id: null, series_order: null })
      .eq("series_id", seriesId);

    const { error } = await supabase
      .from("video_series")
      .delete()
      .eq("id", seriesId)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Failed to delete series", variant: "destructive" });
      return false;
    }

    return true;
  }, [user, toast]);

  const getNextPartNumber = useCallback(async (seriesId: string): Promise<number> => {
    const { data } = await supabase
      .from("videos")
      .select("series_order")
      .eq("series_id", seriesId)
      .order("series_order", { ascending: false })
      .limit(1);

    return (data?.[0]?.series_order || 0) + 1;
  }, []);

  const getNextVideoInSeries = useCallback(async (seriesId: string, currentOrder: number): Promise<Video | null> => {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("series_id", seriesId)
      .gt("series_order", currentOrder)
      .order("series_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as Video;
  }, []);

  return {
    loading,
    createSeries,
    getUserSeries,
    getSeriesById,
    getSeriesVideos,
    addToSeries,
    removeFromSeries,
    reorderSeries,
    updateSeries,
    deleteSeries,
    getNextPartNumber,
    getNextVideoInSeries,
  };
}
