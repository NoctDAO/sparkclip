import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

type PreferenceType = "not_interested_video" | "not_interested_creator" | "not_interested_hashtag";

interface ContentPreference {
  id: string;
  preference_type: PreferenceType;
  target_id: string;
  created_at: string;
}

export function useContentPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<ContentPreference[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all preferences
  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setPreferences([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("content_preferences")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPreferences((data as ContentPreference[]) || []);
    } catch (error) {
      console.error("Error fetching content preferences:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Mark content as not interested
  const markNotInterested = useCallback(
    async (type: PreferenceType, targetId: string): Promise<boolean> => {
      if (!user) {
        toast({ title: "Please sign in", variant: "destructive" });
        return false;
      }

      try {
        const { error } = await supabase.from("content_preferences").insert({
          user_id: user.id,
          preference_type: type,
          target_id: targetId,
        });

        if (error) {
          if (error.code === "23505") {
            // Already exists
            return true;
          }
          throw error;
        }

        // Optimistic update
        setPreferences((prev) => [
          {
            id: crypto.randomUUID(),
            preference_type: type,
            target_id: targetId,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);

        return true;
      } catch (error) {
        console.error("Error marking not interested:", error);
        toast({ title: "Failed to update preference", variant: "destructive" });
        return false;
      }
    },
    [user, toast]
  );

  // Undo not interested
  const undoNotInterested = useCallback(
    async (type: PreferenceType, targetId: string): Promise<boolean> => {
      if (!user) return false;

      try {
        const { error } = await supabase
          .from("content_preferences")
          .delete()
          .eq("user_id", user.id)
          .eq("preference_type", type)
          .eq("target_id", targetId);

        if (error) throw error;

        // Optimistic update
        setPreferences((prev) =>
          prev.filter(
            (p) => !(p.preference_type === type && p.target_id === targetId)
          )
        );

        return true;
      } catch (error) {
        console.error("Error undoing not interested:", error);
        return false;
      }
    },
    [user]
  );

  // Clear all preferences
  const clearAllPreferences = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("content_preferences")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setPreferences([]);
      return true;
    } catch (error) {
      console.error("Error clearing preferences:", error);
      return false;
    }
  }, [user]);

  // Get IDs of not interested items by type
  const getNotInterestedIds = useCallback(
    (type: PreferenceType): string[] => {
      return preferences
        .filter((p) => p.preference_type === type)
        .map((p) => p.target_id);
    },
    [preferences]
  );

  // Check if specific item is marked not interested
  const isNotInterested = useCallback(
    (type: PreferenceType, targetId: string): boolean => {
      return preferences.some(
        (p) => p.preference_type === type && p.target_id === targetId
      );
    },
    [preferences]
  );

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    loading,
    markNotInterested,
    undoNotInterested,
    clearAllPreferences,
    getNotInterestedIds,
    isNotInterested,
    refetch: fetchPreferences,
  };
}
