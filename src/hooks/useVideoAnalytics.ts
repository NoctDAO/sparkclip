import { useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface UseVideoAnalyticsProps {
  videoId?: string;
  isActive: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export function useVideoAnalytics({ videoId, isActive, videoRef }: UseVideoAnalyticsProps) {
  const { user } = useAuth();
  const viewLoggedRef = useRef(false);
  const watchTimeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const sessionStartRef = useRef<number | null>(null);

  const logViewEvent = useCallback(async () => {
    if (!videoId || viewLoggedRef.current) return;
    
    const video = videoRef.current;
    if (!video) return;

    const watchDuration = watchTimeRef.current;
    const videoDuration = video.duration || 0;
    const completionPercentage = videoDuration > 0 
      ? Math.min((watchDuration / videoDuration) * 100, 100) 
      : 0;

    // Only log if watched for at least 3 seconds
    if (watchDuration < 3) return;

    viewLoggedRef.current = true;

    try {
      // Increment the simple view count
      await supabase.rpc('increment_view_count', { video_id: videoId });

      // Log detailed view analytics
      await supabase.from('video_views').insert({
        video_id: videoId,
        viewer_id: user?.id || null,
        watch_duration_seconds: watchDuration,
        video_duration_seconds: videoDuration,
        completion_percentage: completionPercentage,
      });
    } catch {
      // Silent fail - analytics are not critical
    }
  }, [videoId, user?.id, videoRef]);

  // Track watch time
  useEffect(() => {
    if (!isActive || !videoId) {
      // Log view when leaving if we have watch time
      if (watchTimeRef.current >= 3 && !viewLoggedRef.current) {
        logViewEvent();
      }
      watchTimeRef.current = 0;
      lastTimeRef.current = 0;
      sessionStartRef.current = null;
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    sessionStartRef.current = Date.now();

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      
      // Only count forward progress, not seeks or loops
      if (currentTime > lastTimeRef.current && currentTime - lastTimeRef.current < 1) {
        watchTimeRef.current += currentTime - lastTimeRef.current;
      }
      lastTimeRef.current = currentTime;
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      // Log view when component unmounts or video changes
      if (watchTimeRef.current >= 3 && !viewLoggedRef.current) {
        logViewEvent();
      }
    };
  }, [isActive, videoId, logViewEvent, videoRef]);

  // Reset when video changes
  useEffect(() => {
    viewLoggedRef.current = false;
    watchTimeRef.current = 0;
    lastTimeRef.current = 0;
  }, [videoId]);

  // Log view on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (watchTimeRef.current >= 3 && !viewLoggedRef.current && videoId) {
        // Use sendBeacon for reliable delivery on page unload
        const data = {
          video_id: videoId,
          viewer_id: user?.id || null,
          watch_duration_seconds: watchTimeRef.current,
          video_duration_seconds: videoRef.current?.duration || 0,
          completion_percentage: videoRef.current?.duration 
            ? Math.min((watchTimeRef.current / videoRef.current.duration) * 100, 100)
            : 0,
        };
        
        navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/video_views`,
          JSON.stringify(data)
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [videoId, user?.id, videoRef]);

  return { logViewEvent };
}
