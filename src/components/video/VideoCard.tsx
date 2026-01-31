import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ChevronLeft } from "lucide-react";
import { VideoPlayer } from "./VideoPlayer";
import { VideoActions } from "./VideoActions";
import { VideoInfo } from "./VideoInfo";
import { CommentsSheet } from "./CommentsSheet";
import { Video } from "@/types/video";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface VideoCardProps {
  video: Video;
  isActive: boolean;
  isLiked?: boolean;
  isBookmarked?: boolean;
  isFollowing?: boolean;
}

export function VideoCard({ 
  video, 
  isActive, 
  isLiked = false, 
  isBookmarked = false,
  isFollowing = false,
}: VideoCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(isLiked);
  const [likesCount, setLikesCount] = useState(video.likes_count);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [heartPosition, setHeartPosition] = useState({ x: 0, y: 0 });
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  
  const lastTapRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isSwipingRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    isSwipingRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const deltaX = e.touches[0].clientX - touchStartRef.current.x;
    const deltaY = Math.abs(e.touches[0].clientY - touchStartRef.current.y);

    // Only track horizontal swipes (ignore vertical scrolling)
    if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 10) {
      isSwipingRef.current = true;
      
      // Only allow swiping left (negative deltaX)
      if (deltaX < 0) {
        setSwipeOffset(deltaX);
        setShowSwipeHint(deltaX < -50);
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaTime = Date.now() - touchStartRef.current.time;
    
    // Swipe left threshold: moved more than 100px or fast swipe
    const isSwipeLeft = deltaX < -100 || (deltaX < -50 && deltaTime < 300);

    if (isSwipeLeft && isSwipingRef.current) {
      // Navigate to creator's profile
      navigate(`/profile/${video.user_id}`);
    } else if (!isSwipingRef.current) {
      // Handle double tap for like
      handleDoubleTapLogic(e);
    }

    // Reset
    setSwipeOffset(0);
    setShowSwipeHint(false);
    touchStartRef.current = null;
    isSwipingRef.current = false;
  }, [navigate, video.user_id]);

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
        <VideoPlayer src={video.video_url} isActive={isActive} videoId={video.id} />
      </div>

      {/* Swipe hint indicator */}
      {showSwipeHint && (
        <div className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-gradient-to-l from-primary/30 to-transparent pointer-events-none z-30">
          <div className="flex flex-col items-center gap-1 text-foreground">
            <ChevronLeft className="w-8 h-8 animate-pulse" />
            <span className="text-xs font-semibold">Profile</span>
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

      {/* Video Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-background/60" />

      {/* Actions (right side) */}
      <div className="absolute right-2 bottom-20 pointer-events-auto z-10">
        <VideoActions
          videoId={video.id}
          initialLikes={likesCount}
          initialComments={video.comments_count}
          initialShares={video.shares_count}
          initialViews={video.views_count}
          isLiked={liked}
          isBookmarked={isBookmarked}
          onCommentClick={() => setShowComments(true)}
          onLikeChange={handleLikeChange}
        />
      </div>

      {/* Info (bottom) */}
      <div className="absolute left-3 bottom-20 right-16 pointer-events-auto z-10">
        <VideoInfo
          userId={video.user_id}
          username={video.profiles?.username || null}
          displayName={video.profiles?.display_name || null}
          avatarUrl={video.profiles?.avatar_url || null}
          caption={video.caption}
          hashtags={video.hashtags}
          isFollowing={isFollowing}
          sound={video.sound}
        />
      </div>

      {/* Comments Sheet */}
      <CommentsSheet
        videoId={video.id}
        open={showComments}
        onOpenChange={setShowComments}
      />
    </div>
  );
}