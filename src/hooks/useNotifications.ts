import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Notification } from "@/types/video";

// Debounce realtime updates to prevent rapid re-fetches
const DEBOUNCE_MS = 1000;

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // Prevent fetching more than once per second
    const now = Date.now();
    if (now - lastFetchRef.current < 1000) {
      return;
    }
    lastFetchRef.current = now;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!data || data.length === 0) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      // Batch fetch related data
      const actorIds = [...new Set(data.map((n) => n.actor_id))];
      const videoIds = [...new Set(data.filter((n) => n.video_id).map((n) => n.video_id!))];
      const commentIds = [...new Set(data.filter((n) => n.comment_id).map((n) => n.comment_id!))];

      // Parallel fetch all related data
      const [profilesRes, videosRes, commentsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", actorIds),
        videoIds.length > 0
          ? supabase
              .from("videos")
              .select("id, thumbnail_url, series_id")
              .in("id", videoIds)
          : Promise.resolve({ data: [] }),
        commentIds.length > 0
          ? supabase
              .from("comments")
              .select("id, content")
              .in("id", commentIds)
          : Promise.resolve({ data: [] }),
      ]);

      // Build lookup maps
      const profileMap = new Map(
        profilesRes.data?.map((p) => [p.user_id, p]) || []
      );
      const videoMap = new Map(
        (videosRes.data || []).map((v) => [v.id, v])
      );
      const commentMap = new Map(
        (commentsRes.data || []).map((c) => [c.id, c])
      );

      // Fetch series info for videos that have series_id
      const seriesIds = [...new Set(
        (videosRes.data || [])
          .filter((v) => v.series_id)
          .map((v) => v.series_id!)
      )];
      
      let seriesMap = new Map<string, { id: string; title: string }>();
      if (seriesIds.length > 0) {
        const { data: seriesData } = await supabase
          .from("video_series")
          .select("id, title")
          .in("id", seriesIds);
        seriesData?.forEach((s) => seriesMap.set(s.id, s));
      }

      // Build final notifications with all related data
      const notificationsWithDetails: Notification[] = data.map((notification) => {
        const video = notification.video_id ? videoMap.get(notification.video_id) : undefined;
        
        return {
          id: notification.id,
          user_id: notification.user_id,
          actor_id: notification.actor_id,
          type: notification.type as Notification["type"],
          video_id: notification.video_id,
          comment_id: notification.comment_id,
          is_read: notification.is_read,
          created_at: notification.created_at,
          actor: profileMap.get(notification.actor_id),
          video: video ? {
            ...video,
            series: video.series_id ? seriesMap.get(video.series_id) || null : null,
          } : undefined,
          comment: notification.comment_id ? commentMap.get(notification.comment_id) : undefined,
        };
      });

      setNotifications(notificationsWithDetails);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const debouncedFetch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchNotifications();
    }, DEBOUNCE_MS);
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
  }, [user]);

  const createNotification = useCallback(
    async (params: {
      userId: string;
      type: Notification["type"];
      videoId?: string;
      commentId?: string;
    }) => {
      if (!user || params.userId === user.id) return; // Don't notify yourself

      await supabase.from("notifications").insert({
        user_id: params.userId,
        actor_id: user.id,
        type: params.type,
        video_id: params.videoId || null,
        comment_id: params.commentId || null,
      });
    },
    [user]
  );

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription with debouncing
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Debounce realtime updates to prevent rapid re-fetches
          debouncedFetch();
        }
      )
      .subscribe();

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [user, debouncedFetch]);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    createNotification,
  };
}
