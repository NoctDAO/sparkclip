import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useAdAnalytics() {
  const { user } = useAuth();
  const trackedImpressions = useRef<Set<string>>(new Set());
  const viewStartTimes = useRef<Map<string, number>>(new Map());

  const trackImpression = useCallback(async (adId: string) => {
    // Avoid duplicate impressions in same session
    if (trackedImpressions.current.has(adId)) return;
    
    trackedImpressions.current.add(adId);
    viewStartTimes.current.set(adId, Date.now());

    try {
      await supabase.from("ad_analytics").insert({
        ad_id: adId,
        user_id: user?.id || null,
        event_type: "impression",
      });

      // Increment impressions count on the ad
      await supabase.rpc("increment_ad_impressions", { p_ad_id: adId });
    } catch (error) {
      console.error("Failed to track ad impression:", error);
    }
  }, [user?.id]);

  const trackClick = useCallback(async (adId: string) => {
    const viewDuration = viewStartTimes.current.get(adId);
    const durationMs = viewDuration ? Date.now() - viewDuration : null;

    try {
      await supabase.from("ad_analytics").insert({
        ad_id: adId,
        user_id: user?.id || null,
        event_type: "click",
        view_duration_ms: durationMs,
      });

      // Increment clicks count on the ad
      await supabase.rpc("increment_ad_clicks", { p_ad_id: adId });
    } catch (error) {
      console.error("Failed to track ad click:", error);
    }
  }, [user?.id]);

  const trackSkip = useCallback(async (adId: string) => {
    const viewDuration = viewStartTimes.current.get(adId);
    const durationMs = viewDuration ? Date.now() - viewDuration : null;

    try {
      await supabase.from("ad_analytics").insert({
        ad_id: adId,
        user_id: user?.id || null,
        event_type: "skip",
        view_duration_ms: durationMs,
      });
    } catch (error) {
      console.error("Failed to track ad skip:", error);
    }
  }, [user?.id]);

  const trackViewComplete = useCallback(async (adId: string) => {
    const viewDuration = viewStartTimes.current.get(adId);
    const durationMs = viewDuration ? Date.now() - viewDuration : null;

    try {
      await supabase.from("ad_analytics").insert({
        ad_id: adId,
        user_id: user?.id || null,
        event_type: "view_complete",
        view_duration_ms: durationMs,
      });
    } catch (error) {
      console.error("Failed to track ad view complete:", error);
    }
  }, [user?.id]);

  return {
    trackImpression,
    trackClick,
    trackSkip,
    trackViewComplete,
  };
}
