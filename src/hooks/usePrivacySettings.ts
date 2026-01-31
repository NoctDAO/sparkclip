import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type CommentPermission = "everyone" | "followers" | "no_one";
export type MessagePermission = "everyone" | "followers" | "no_one";

export interface PrivacySettings {
  is_private_account: boolean;
  comment_permission: CommentPermission;
  message_permission: MessagePermission;
  show_liked_videos: boolean;
  show_following_list: boolean;
  show_followers_list: boolean;
}

const defaultSettings: PrivacySettings = {
  is_private_account: false,
  comment_permission: "everyone",
  message_permission: "everyone",
  show_liked_videos: true,
  show_following_list: true,
  show_followers_list: true,
};

export function usePrivacySettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PrivacySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("user_privacy_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching privacy settings:", error);
    }

    if (data) {
      setSettings({
        is_private_account: data.is_private_account,
        comment_permission: data.comment_permission as CommentPermission,
        message_permission: data.message_permission as MessagePermission,
        show_liked_videos: data.show_liked_videos,
        show_following_list: data.show_following_list,
        show_followers_list: data.show_followers_list,
      });
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = async <K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K]
  ): Promise<boolean> => {
    if (!user?.id) return false;

    setSaving(true);

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    // Check if record exists
    const { data: existing } = await supabase
      .from("user_privacy_settings")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    let error;

    if (existing) {
      // Update existing record
      const result = await supabase
        .from("user_privacy_settings")
        .update({ [key]: value })
        .eq("user_id", user.id);
      error = result.error;
    } else {
      // Insert new record with all defaults plus the changed value
      const result = await supabase
        .from("user_privacy_settings")
        .insert({
          user_id: user.id,
          ...defaultSettings,
          [key]: value,
        });
      error = result.error;
    }

    setSaving(false);

    if (error) {
      console.error("Error saving privacy setting:", error);
      // Revert on error
      setSettings(settings);
      return false;
    }

    return true;
  };

  return {
    settings,
    loading,
    saving,
    updateSetting,
  };
}
