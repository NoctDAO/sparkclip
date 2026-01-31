import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ChevronLeft, ChevronRight, SkipForward, Loader2 } from "lucide-react";
import { VideoPlayer } from "./VideoPlayer";
import { VideoActions } from "./VideoActions";
import { VideoInfo } from "./VideoInfo";
import { CommentsSheet } from "./CommentsSheet";
import { SeriesViewer } from "./SeriesViewer";
import { DuetIndicator } from "./DuetIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import { Video } from "@/types/video";
import { useAuth } from "@/hooks/useAuth";
import { useVideoSeries } from "@/hooks/useVideoSeries";
import { useSeriesAutoPlay } from "@/hooks/useSeriesAutoPlay";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface VideoCardProps {
  video: Video;
  isActive: boolean;
  isLiked?: boolean;
  isBookmarked?: boolean;
  isFollowing?: boolean;
  bottomNavVisible?: boolean;
  onSeriesNavigate?: (video: Video) => void;
}

export function VideoCard({ 
  video, 
  isActive, 
  isLiked = false, 
  isBookmarked = false,
  isFollowing = false,
  bottomNavVisible = true,
  onSeriesNavigate,
}: VideoCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { getNextVideoInSeries, getPreviousVideoInSeries } = useVideoSeries();
  const { autoPlayEnabled } = useSeriesAutoPlay();
  const [showComments, setShowComments] = useState(false);
  const [showSeriesViewer, setShowSeriesViewer] = useState(false);
  const [liked, setLiked] = useState(isLiked);
  const [likesCount, setLikesCount] = useState(video.likes_count);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [heartPosition, setHeartPosition] = useState({ x: 0, y: 0 });
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState<"left" | "right" | null>(null);
  const [showNextPartHint, setShowNextPartHint] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoadingNextPart, setIsLoadingNextPart] = useState(false);

  // Keep overlays safely above the fixed bottom nav (and device safe-area)
  // Uses --ui-safe-margin which can be changed via Settings > Display
  const navOffset = bottomNavVisible ? "var(--bottom-nav-height)" : "0px";
  const bottomUiOffset = `calc(var(--ui-safe-margin) + ${navOffset} + var(--safe-bottom))`;
  
  const lastTapRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isSwipingRef = useRef(false);
  const swipeLockedRef = useRef(false);
  const isInSeries = !!(video.series_id && video.series_order);

  // Helper to enrich video with profile/series data
  const enrichVideo = useCallback(async (rawVideo: Video): Promise<Video> => {
    const [profileRes, seriesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, username, display_name, avatar_url").eq("user_id", rawVideo.user_id).maybeSingle(),
      rawVideo.series_id ? supabase.from("video_series").select("*").eq("id", rawVideo.series_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    return {
      ...rawVideo,
      profiles: profileRes.data || null,
      series: seriesRes.data || null,
    };
  }, []);

  const handleVideoEnd = useCallback(async () => {
    if (!autoPlayEnabled || !video.series_id || !video.series_order) return;

    const nextVideo = await getNextVideoInSeries(video.series_id, video.series_order);
    if (nextVideo) {
      setShowNextPartHint(true);
      toast({
        title: `Up next: Part ${nextVideo.series_order}`,
        description: nextVideo.caption || "Playing next part...",
      });
      
      setTimeout(async () => {
        setShowNextPartHint(false);
        if (onSeriesNavigate) {
          const enriched = await enrichVideo(nextVideo);
          onSeriesNavigate(enriched);
        } else {
          navigate(`/video/${nextVideo.id}`);
        }
      }, 1500);
    }
  }, [autoPlayEnabled, video.series_id, video.series_order, getNextVideoInSeries, navigate, onSeriesNavigate, toast, enrichVideo]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Don't start new swipe if navigation is in progress
    if (isNavigating || swipeLockedRef.current) return;
    
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    isSwipingRef.current = false;
  }, [isNavigating]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || isNavigating || swipeLockedRef.current) return;

    const deltaX = e.touches[0].clientX - touchStartRef.current.x;
    const deltaY = Math.abs(e.touches[0].clientY - touchStartRef.current.y);

    // Only track horizontal swipes (ignore vertical scrolling)
    if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 10) {
      isSwipingRef.current = true;
      
      // Apply damping to swipe offset (max 150px) for smoother feel
      const dampedOffset = Math.sign(deltaX) * Math.min(Math.abs(deltaX) * 0.6, 150);
      setSwipeOffset(dampedOffset);
      
      // Show appropriate hint based on direction and context
      if (isInSeries) {
        // In series: left = next part, right = previous part
        if (deltaX < -50) {
          setShowSwipeHint("left");
        } else if (deltaX > 50) {
          setShowSwipeHint("right");
        } else {
          setShowSwipeHint(null);
        }
      } else {
        // Not in series: only left swipe to profile
        if (deltaX < -50) {
          setShowSwipeHint("left");
        } else {
          setShowSwipeHint(null);
        }
      }
    }
  }, [isInSeries, isNavigating]);

  const handleDoubleTapLogic = useCallback(async (e: React.TouchEvent | React.MouseEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      let clientX: number, clientY: number;

      if ('changedTouches' in e) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      setHeartPosition({
        x: clientX - rect.left,
        y: clientY - rect.top,
      });

      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 1000);

      if (!liked && user) {
        const { error } = await supabase
          .from("likes")
          .insert({ user_id: user.id, video_id: video.id });

        if (!error) {
          setLiked(true);
          setLikesCount((prev) => prev + 1);
        }
      }
    }

    lastTapRef.current = now;
  }, [liked, user, video.id]);

  const handleTouchEnd = useCallback(async (e: React.TouchEvent) => {
    if (!touchStartRef.current || isNavigating || swipeLockedRef.current) {
      // Reset state even if we're blocked
      setSwipeOffset(0);
      setShowSwipeHint(null);
      touchStartRef.current = null;
      return;
    }

    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaTime = Date.now() - touchStartRef.current.time;
    
    // Swipe thresholds
    const isSwipeLeft = deltaX < -100 || (deltaX < -50 && deltaTime < 300);
    const isSwipeRight = deltaX > 100 || (deltaX > 50 && deltaTime < 300);

    // Haptic feedback helper
    const triggerHaptic = (pattern: number | number[] = 50) => {
      if ("vibrate" in navigator) {
        navigator.vibrate(pattern);
      }
    };

    if (isSwipingRef.current) {
      // Lock swipe to prevent multiple triggers
      swipeLockedRef.current = true;
      
      if (isInSeries && video.series_id && video.series_order) {
        // Series navigation
        if (isSwipeLeft) {
          setIsNavigating(true);
          setIsLoadingNextPart(true);
          // Swipe left = next part
          const nextVideo = await getNextVideoInSeries(video.series_id, video.series_order);
          if (nextVideo) {
            triggerHaptic([30, 20, 30]);
            toast({ title: `Part ${nextVideo.series_order}`, duration: 1500 });
            if (onSeriesNavigate) {
              const enriched = await enrichVideo(nextVideo);
              setIsLoadingNextPart(false);
              onSeriesNavigate(enriched);
              setIsNavigating(false);
            } else {
              navigate(`/video/${nextVideo.id}`);
            }
          } else {
            triggerHaptic(100);
            toast({ title: "This is the last part", duration: 1500 });
            setIsNavigating(false);
            setIsLoadingNextPart(false);
          }
        } else if (isSwipeRight) {
          setIsNavigating(true);
          setIsLoadingNextPart(true);
          // Swipe right = previous part
          const prevVideo = await getPreviousVideoInSeries(video.series_id, video.series_order);
          if (prevVideo) {
            triggerHaptic([30, 20, 30]);
            toast({ title: `Part ${prevVideo.series_order}`, duration: 1500 });
            if (onSeriesNavigate) {
              const enriched = await enrichVideo(prevVideo);
              setIsLoadingNextPart(false);
              onSeriesNavigate(enriched);
              setIsNavigating(false);
            } else {
              navigate(`/video/${prevVideo.id}`);
            }
          } else {
            triggerHaptic(100);
            toast({ title: "This is the first part", duration: 1500 });
            setIsNavigating(false);
            setIsLoadingNextPart(false);
          }
        }
      } else if (isSwipeLeft) {
        // Not in series: swipe left goes to profile
        navigate(`/profile/${video.user_id}`);
      }
      
      // Unlock after a short delay to prevent rapid re-triggering
      setTimeout(() => {
        swipeLockedRef.current = false;
      }, 500);
    } else {
      // Handle double tap for like
      handleDoubleTapLogic(e);
    }

    // Reset
    setSwipeOffset(0);
    setShowSwipeHint(null);
    touchStartRef.current = null;
    isSwipingRef.current = false;
  }, [isInSeries, video.series_id, video.series_order, video.user_id, navigate, getNextVideoInSeries, getPreviousVideoInSeries, onSeriesNavigate, enrichVideo, toast, isNavigating, handleDoubleTapLogic]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    handleDoubleTapLogic(e);
  }, [handleDoubleTapLogic]);

  const handleLikeChange = useCallback((newLiked: boolean, newCount: number) => {
    setLiked(newLiked);
    setLikesCount(newCount);
  }, []);

  return (
    <div className="relative w-full h-full snap-start snap-always overflow-hidden">
      {/* Video Player with swipe and double-tap detection */}
      <div 
        className="absolute inset-0 bg-black transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <VideoPlayer 
          src={video.video_url} 
          isActive={isActive} 
          videoId={video.id} 
          bottomNavVisible={bottomNavVisible}
          onVideoEnd={video.series_id ? handleVideoEnd : undefined}
        />
      </div>

      {/* Next part hint overlay */}
      {showNextPartHint && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-40 pointer-events-none">
          <div className="flex flex-col items-center gap-2 animate-pulse">
            <SkipForward className="w-12 h-12 text-primary" />
            <p className="text-lg font-semibold">Playing next part...</p>
          </div>
        </div>
      )}

      {/* Loading skeleton overlay for series navigation */}
      {isLoadingNextPart && (
        <div className="absolute inset-0 z-40 pointer-events-none bg-background/40 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      )}

      {/* Swipe hint indicators */}
      {showSwipeHint === "left" && (
        <div className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-gradient-to-l from-primary/30 to-transparent pointer-events-none z-30">
          <div className="flex flex-col items-center gap-1 text-foreground">
            <ChevronLeft className="w-8 h-8 animate-pulse" />
            <span className="text-xs font-semibold">
              {isInSeries ? "Next" : "Profile"}
            </span>
          </div>
        </div>
      )}
      
      {showSwipeHint === "right" && isInSeries && (
        <div className="absolute left-0 top-0 bottom-0 w-20 flex items-center justify-center bg-gradient-to-r from-primary/30 to-transparent pointer-events-none z-30">
          <div className="flex flex-col items-center gap-1 text-foreground">
            <ChevronRight className="w-8 h-8 animate-pulse" />
            <span className="text-xs font-semibold">Previous</span>
          </div>
        </div>
      )}

      {/* Double-tap heart animation */}
      {showHeartAnimation && (
        <div
          className="absolute pointer-events-none z-50"
          style={{
            left: heartPosition.x,
            top: heartPosition.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <Heart
            className={cn(
              "w-24 h-24 text-heart fill-heart",
              "animate-double-tap-heart"
            )}
          />
        </div>
      )}

      {/* Video Overlay - improved gradient for better text readability */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/20 via-transparent via-40% to-black/70" />

      {/* Actions (right side) */}
      <div
        className="absolute pointer-events-auto z-10 transition-[bottom] duration-300 ease-out"
        style={{
          right: "calc(var(--safe-right) + 0.5rem)",
          bottom: bottomUiOffset,
        }}
      >
        <VideoActions
          videoId={video.id}
          videoUserId={video.user_id}
          initialLikes={likesCount}
          initialComments={video.comments_count}
          initialShares={video.shares_count}
          initialViews={video.views_count}
          isLiked={liked}
          isBookmarked={isBookmarked}
          allowDuets={video.allow_duets ?? true}
          onCommentClick={() => setShowComments(true)}
          onLikeChange={handleLikeChange}
        />
      </div>

      {/* Duet Indicator (if this is a duet) */}
      {video.duet_source_id && (
        <div
          className="absolute z-10 pointer-events-auto"
          style={{
            left: "calc(var(--safe-left) + 0.75rem)",
            top: "calc(var(--safe-top) + 4rem)",
          }}
        >
          <DuetIndicator
            sourceVideoId={video.duet_source_id}
            layout={video.duet_layout}
          />
        </div>
      )}

      {/* Info (bottom) */}
      <div
        className="absolute right-16 pointer-events-auto z-10 transition-[bottom] duration-300 ease-out"
        style={{
          left: "calc(var(--safe-left) + 0.75rem)",
          bottom: bottomUiOffset,
        }}
      >
        <VideoInfo
          userId={video.user_id}
          username={video.profiles?.username || null}
          displayName={video.profiles?.display_name || null}
          avatarUrl={video.profiles?.avatar_url || null}
          caption={video.caption}
          hashtags={video.hashtags}
          isFollowing={isFollowing}
          sound={video.sound}
          series={video.series}
          seriesOrder={video.series_order}
          onSeriesClick={() => setShowSeriesViewer(true)}
        />
      </div>

      {/* Comments Sheet */}
      <CommentsSheet
        videoId={video.id}
        videoOwnerId={video.user_id}
        open={showComments}
        onOpenChange={setShowComments}
      />

      {/* Series Viewer Sheet */}
      {video.series && (
        <SeriesViewer
          series={video.series}
          currentVideoId={video.id}
          open={showSeriesViewer}
          onOpenChange={setShowSeriesViewer}
        />
      )}
    </div>
  );
}