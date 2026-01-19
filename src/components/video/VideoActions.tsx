import { useState } from "react";
import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VideoActionsProps {
  videoId: string;
  initialLikes: number;
  initialComments: number;
  initialShares: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  onCommentClick: () => void;
}

export function VideoActions({
  videoId,
  initialLikes,
  initialComments,
  initialShares,
  isLiked = false,
  isBookmarked = false,
  onCommentClick,
}: VideoActionsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [liked, setLiked] = useState(isLiked);
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [likesCount, setLikesCount] = useState(initialLikes);

  const handleLike = async () => {
    if (!user) {
      toast({ title: "Please sign in to like videos", variant: "destructive" });
      return;
    }

    if (liked) {
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("user_id", user.id)
        .eq("video_id", videoId);

      if (!error) {
        setLiked(false);
        setLikesCount((prev) => prev - 1);
      }
    } else {
      const { error } = await supabase
        .from("likes")
        .insert({ user_id: user.id, video_id: videoId });

      if (!error) {
        setLiked(true);
        setLikesCount((prev) => prev + 1);
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
    try {
      await navigator.share({
        title: "Check out this video!",
        url: window.location.href,
      });
    } catch {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied to clipboard" });
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Like */}
      <button
        onClick={handleLike}
        className="flex flex-col items-center gap-1"
      >
        <div className={cn(
          "p-3 rounded-full bg-secondary/80 transition-all",
          liked && "animate-heart"
        )}>
          <Heart
            className={cn(
              "w-7 h-7 transition-colors",
              liked ? "text-heart fill-heart" : "text-foreground"
            )}
          />
        </div>
        <span className="text-xs font-semibold text-foreground">
          {formatCount(likesCount)}
        </span>
      </button>

      {/* Comment */}
      <button
        onClick={onCommentClick}
        className="flex flex-col items-center gap-1"
      >
        <div className="p-3 rounded-full bg-secondary/80">
          <MessageCircle className="w-7 h-7 text-foreground" />
        </div>
        <span className="text-xs font-semibold text-foreground">
          {formatCount(initialComments)}
        </span>
      </button>

      {/* Bookmark */}
      <button
        onClick={handleBookmark}
        className="flex flex-col items-center gap-1"
      >
        <div className="p-3 rounded-full bg-secondary/80">
          <Bookmark
            className={cn(
              "w-7 h-7 transition-colors",
              bookmarked ? "text-bookmark fill-bookmark" : "text-foreground"
            )}
          />
        </div>
        <span className="text-xs font-semibold text-foreground">Save</span>
      </button>

      {/* Share */}
      <button
        onClick={handleShare}
        className="flex flex-col items-center gap-1"
      >
        <div className="p-3 rounded-full bg-secondary/80">
          <Share2 className="w-7 h-7 text-foreground" />
        </div>
        <span className="text-xs font-semibold text-foreground">
          {formatCount(initialShares)}
        </span>
      </button>
    </div>
  );
}