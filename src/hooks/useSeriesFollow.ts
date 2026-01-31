import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export function useSeriesFollow(seriesId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (seriesId && user) {
      checkFollowStatus();
    } else {
      setLoading(false);
      setIsFollowing(false);
    }
  }, [seriesId, user]);

  const checkFollowStatus = useCallback(async () => {
    if (!seriesId || !user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("series_follows")
      .select("id")
      .eq("series_id", seriesId)
      .eq("user_id", user.id)
      .maybeSingle();

    setLoading(false);
    
    if (!error) {
      setIsFollowing(!!data);
    }
  }, [seriesId, user]);

  const toggleFollow = useCallback(async () => {
    if (!seriesId || !user) {
      toast({ title: "Please sign in to follow series", variant: "destructive" });
      return;
    }

    setToggling(true);

    if (isFollowing) {
      // Unfollow
      const { error } = await supabase
        .from("series_follows")
        .delete()
        .eq("series_id", seriesId)
        .eq("user_id", user.id);

      setToggling(false);

      if (error) {
        toast({ title: "Failed to unfollow series", variant: "destructive" });
        return;
      }

      setIsFollowing(false);
      toast({ title: "Unfollowed series" });
    } else {
      // Follow
      const { error } = await supabase
        .from("series_follows")
        .insert({
          series_id: seriesId,
          user_id: user.id,
        });

      setToggling(false);

      if (error) {
        toast({ title: "Failed to follow series", variant: "destructive" });
        return;
      }

      setIsFollowing(true);
      toast({ title: "Following series - you'll be notified of new parts" });
    }
  }, [seriesId, user, isFollowing, toast]);

  return {
    isFollowing,
    loading,
    toggling,
    toggleFollow,
  };
}
