import { useState, useEffect } from "react";
import { Heart, MessageCircle, Share2, Bookmark, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useRateLimit } from "@/hooks/useRateLimit";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VideoActionsProps {
  videoId: string;
  initialLikes: number;
  initialComments: number;
  initialShares: number;
  initialViews?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  onCommentClick: () => void;
  onLikeChange?: (liked: boolean, count: number) => void;
}

export function VideoActions({
  videoId,
  initialLikes,
  initialComments,
  initialShares,
  initialViews = 0,
  isLiked = false,
  isBookmarked = false,
  onCommentClick,
  onLikeChange,
}: VideoActionsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { checkRateLimit: checkLikeLimit } = useRateLimit("like");
  const [liked, setLiked] = useState(isLiked);
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [likesCount, setLikesCount] = useState(initialLikes);

  // Sync with parent state
  useEffect(() => {
    setLiked(isLiked);
  }, [isLiked]);

  useEffect(() => {
    setLikesCount(initialLikes);
  }, [initialLikes]);

  const handleLike = async () => {
    if (!user) {
      toast({ title: "Please sign in to like videos", variant: "destructive" });
      return;
    }

    if (!checkLikeLimit()) return;

    if (liked) {
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("user_id", user.id)
        .eq("video_id", videoId);

      if (!error) {
        const newCount = likesCount - 1;
        setLiked(false);
        setLikesCount(newCount);
        onLikeChange?.(false, newCount);
      }
    } else {
      const { error } = await supabase
        .from("likes")
        .insert({ user_id: user.id, video_id: videoId });

      if (!error) {
        const newCount = likesCount + 1;
        setLiked(true);
        setLikesCount(newCount);
        onLikeChange?.(true, newCount);
      }
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      toast({ title: "Please sign in to save videos", variant: "destructive" });
      return;
    }

    if (bookmarked) {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("video_id", videoId);

      if (!error) {
        setBookmarked(false);
        toast({ title: "Video removed from saved" });
      }
    } else {
      const { error } = await supabase
        .from("bookmarks")
        .insert({ user_id: user.id, video_id: videoId });

      if (!error) {
        setBookmarked(true);
        toast({ title: "Video saved" });
      }
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/video/${videoId}`;
    try {
      await navigator.share({
        title: "Check out this video!",
        url: shareUrl,
      });
    } catch {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied to clipboard" });
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Views */}
      <div className="flex flex-col items-center gap-0.5">
        <div className="p-2 rounded-full backdrop-blur-sm bg-background/20">
          <Eye className="w-6 h-6 text-foreground drop-shadow-md" />
        </div>
        <span className="text-[11px] font-medium text-foreground/90 drop-shadow-sm">
          {formatCount(initialViews)}
        </span>
      </div>

      {/* Like */}
      <button
        onClick={handleLike}
        className="flex flex-col items-center gap-0.5"
      >
        <div className={cn(
          "p-2 rounded-full backdrop-blur-sm bg-background/20 transition-all",
          liked && "animate-heart"
        )}>
          <Heart
            className={cn(
              "w-6 h-6 transition-colors drop-shadow-md",
              liked ? "text-heart fill-heart" : "text-foreground"
            )}
          />
        </div>
        <span className="text-[11px] font-medium text-foreground/90 drop-shadow-sm">
          {formatCount(likesCount)}
        </span>
      </button>

      {/* Comment */}
      <button
        onClick={onCommentClick}
        className="flex flex-col items-center gap-0.5"
      >
        <div className="p-2 rounded-full backdrop-blur-sm bg-background/20">
          <MessageCircle className="w-6 h-6 text-foreground drop-shadow-md" />
        </div>
        <span className="text-[11px] font-medium text-foreground/90 drop-shadow-sm">
          {formatCount(initialComments)}
        </span>
      </button>

      {/* Bookmark */}
      <button
        onClick={handleBookmark}
        className="flex flex-col items-center gap-0.5"
      >
        <div className="p-2 rounded-full backdrop-blur-sm bg-background/20">
          <Bookmark
            className={cn(
              "w-6 h-6 transition-colors drop-shadow-md",
              bookmarked ? "text-bookmark fill-bookmark" : "text-foreground"
            )}
          />
        </div>
        <span className="text-[11px] font-medium text-foreground/90 drop-shadow-sm">Save</span>
      </button>

      {/* Share */}
      <button
        onClick={handleShare}
        className="flex flex-col items-center gap-0.5"
      >
        <div className="p-2 rounded-full backdrop-blur-sm bg-background/20">
          <Share2 className="w-6 h-6 text-foreground drop-shadow-md" />
        </div>
        <span className="text-[11px] font-medium text-foreground/90 drop-shadow-sm">
          {formatCount(initialShares)}
        </span>
      </button>
    </div>
  );
}