import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type CommentPermission = "everyone" | "followers" | "no_one";
export type MessagePermission = "everyone" | "followers" | "no_one";

export interface UserPrivacySettings {
  is_private_account: boolean;
  comment_permission: CommentPermission;
  message_permission: MessagePermission;
  show_liked_videos: boolean;
  show_following_list: boolean;
  show_followers_list: boolean;
}

const defaultSettings: UserPrivacySettings = {
  is_private_account: false,
  comment_permission: "everyone",
  message_permission: "everyone",
  show_liked_videos: true,
  show_following_list: true,
  show_followers_list: true,
};

export function useUserPrivacy(targetUserId: string | undefined) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserPrivacySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  const isOwnProfile = user?.id === targetUserId;

  const fetchSettings = useCallback(async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    // Fetch privacy settings
    const { data, error } = await supabase
      .from("user_privacy_settings")
      .select("*")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!error && data) {
      setSettings({
        is_private_account: data.is_private_account,
        comment_permission: data.comment_permission as CommentPermission,
        message_permission: data.message_permission as MessagePermission,
        show_liked_videos: data.show_liked_videos,
        show_following_list: data.show_following_list,
        show_followers_list: data.show_followers_list,
      });
    } else {
      // Use defaults if no settings exist
      setSettings(defaultSettings);
    }

    // Check if current user follows target user
    if (user && user.id !== targetUserId) {
      const { data: followData } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle();

      setIsFollowing(!!followData);
    }

    setLoading(false);
  }, [targetUserId, user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Helper functions to check permissions
  const canViewLikedVideos = (): boolean => {
    if (isOwnProfile) return true;
    return settings.show_liked_videos;
  };

  const canViewFollowingList = (): boolean => {
    if (isOwnProfile) return true;
    return settings.show_following_list;
  };

  const canViewFollowersList = (): boolean => {
    if (isOwnProfile) return true;
    return settings.show_followers_list;
  };

  const canComment = (): boolean => {
    if (isOwnProfile) return true;
    if (settings.comment_permission === "everyone") return true;
    if (settings.comment_permission === "followers") return isFollowing;
    return false; // no_one
  };

  const canMessage = (): boolean => {
    if (isOwnProfile) return true;
    if (settings.message_permission === "everyone") return true;
    if (settings.message_permission === "followers") return isFollowing;
    return false; // no_one
  };

  const canViewProfile = (): boolean => {
    if (isOwnProfile) return true;
    if (!settings.is_private_account) return true;
    return isFollowing;
  };

  return {
    settings,
    loading,
    isOwnProfile,
    isFollowing,
    canViewLikedVideos,
    canViewFollowingList,
    canViewFollowersList,
    canComment,
    canMessage,
    canViewProfile,
    refetch: fetchSettings,
  };
}
