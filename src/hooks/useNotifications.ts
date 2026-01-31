import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Notification } from "@/types/video";

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      // Fetch actor profiles
      const actorIds = [...new Set(data.map((n) => n.actor_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", actorIds);

      const profileMap = new Map<string, { user_id: string; username: string | null; display_name: string | null; avatar_url: string | null }>();
      profiles?.forEach((p) => profileMap.set(p.user_id, p));

      // Fetch video thumbnails and series info
      const videoIds = [...new Set(data.filter((n) => n.video_id).map((n) => n.video_id!))];
      let videoMap = new Map<string, { id: string; thumbnail_url: string | null; series_id?: string | null; series?: { id: string; title: string } | null }>();
      if (videoIds.length > 0) {
        const { data: videos } = await supabase
          .from("videos")
          .select("id, thumbnail_url, series_id")
          .in("id", videoIds);
        
        // Fetch series info for videos that belong to series
        const seriesIds = [...new Set(videos?.filter((v) => v.series_id).map((v) => v.series_id!) || [])];
        let seriesMap = new Map<string, { id: string; title: string }>();
        if (seriesIds.length > 0) {
          const { data: seriesData } = await supabase
            .from("video_series")
            .select("id, title")
            .in("id", seriesIds);
          seriesData?.forEach((s) => seriesMap.set(s.id, s));
        }
        
        videos?.forEach((v) => videoMap.set(v.id, {
          ...v,
          series: v.series_id ? seriesMap.get(v.series_id) || null : null,
        }));
      }

      // Fetch comment content for comment-related notifications
      const commentIds = [...new Set(data.filter((n) => n.comment_id).map((n) => n.comment_id!))];
      let commentMap = new Map<string, { id: string; content: string }>();
      if (commentIds.length > 0) {
        const { data: comments } = await supabase
          .from("comments")
          .select("id, content")
          .in("id", commentIds);
        comments?.forEach((c) => commentMap.set(c.id, c));
      }

      const notificationsWithDetails: Notification[] = data.map((notification) => ({
        id: notification.id,
        user_id: notification.user_id,
        actor_id: notification.actor_id,
        type: notification.type as Notification["type"],
        video_id: notification.video_id,
        comment_id: notification.comment_id,
        is_read: notification.is_read,
        created_at: notification.created_at,
        actor: profileMap.get(notification.actor_id),
        video: notification.video_id ? videoMap.get(notification.video_id) : undefined,
        comment: notification.comment_id ? commentMap.get(notification.comment_id) : undefined,
      }));

      setNotifications(notificationsWithDetails);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    }

    setLoading(false);
  }, [user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
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

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

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
