import { useState } from "react";
import { VideoPlayer } from "./VideoPlayer";
import { VideoActions } from "./VideoActions";
import { VideoInfo } from "./VideoInfo";
import { CommentsSheet } from "./CommentsSheet";
import { Video } from "@/types/video";

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
  const [showComments, setShowComments] = useState(false);

  return (
    <div className="relative w-full h-full snap-start snap-always">
      {/* Video Player */}
      <VideoPlayer src={video.video_url} isActive={isActive} />

      {/* Video Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-background/60" />

      {/* Actions (right side) */}
      <div className="absolute right-3 bottom-24 pointer-events-auto">
        <VideoActions
          videoId={video.id}
          initialLikes={video.likes_count}
          initialComments={video.comments_count}
          initialShares={video.shares_count}
          isLiked={isLiked}
          isBookmarked={isBookmarked}
          onCommentClick={() => setShowComments(true)}
        />
      </div>

      {/* Info (bottom) */}
      <div className="absolute left-3 bottom-24 right-20 pointer-events-auto">
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