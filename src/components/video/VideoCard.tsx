import { useState, useRef, useCallback } from "react";
import { Heart } from "lucide-react";
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
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(isLiked);
  const [likesCount, setLikesCount] = useState(video.likes_count);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [heartPosition, setHeartPosition] = useState({ x: 0, y: 0 });
  const lastTapRef = useRef<number>(0);

  const handleDoubleTap = useCallback(async (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      let clientX: number, clientY: number;

      if ('touches' in e) {
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

      // Like the video if not already liked
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

  const handleLikeChange = useCallback((newLiked: boolean, newCount: number) => {
    setLiked(newLiked);
    setLikesCount(newCount);
  }, []);

  return (
    <div className="relative w-full h-full snap-start snap-always">
      {/* Video Player with double-tap detection */}
      <div 
        className="absolute inset-0"
        onClick={handleDoubleTap}
        onTouchEnd={handleDoubleTap}
      >
        <VideoPlayer src={video.video_url} isActive={isActive} />
      </div>

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
      <div className="absolute right-3 bottom-24 pointer-events-auto z-10">
        <VideoActions
          videoId={video.id}
          initialLikes={likesCount}
          initialComments={video.comments_count}
          initialShares={video.shares_count}
          isLiked={liked}
          isBookmarked={isBookmarked}
          onCommentClick={() => setShowComments(true)}
          onLikeChange={handleLikeChange}
        />
      </div>

      {/* Info (bottom) */}
      <div className="absolute left-3 bottom-24 right-20 pointer-events-auto z-10">
        <VideoInfo
          userId={video.user_id}
          username={video.profiles?.username || null}
          displayName={video.profiles?.display_name || null}
          avatarUrl={video.profiles?.avatar_url || null}
          caption={video.caption}
          hashtags={video.hashtags}
          isFollowing={isFollowing}
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