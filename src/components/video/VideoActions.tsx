import { useState, useEffect } from "react";
import { Heart, MessageCircle, Share2, Bookmark, Eye, Flag, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useRateLimit } from "@/hooks/useRateLimit";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ReportDialog } from "@/components/ReportDialog";
import { AddToSeriesSheet } from "@/components/video/AddToSeriesSheet";
import { DuetButton } from "@/components/video/DuetButton";

interface VideoActionsProps {
  videoId: string;
  videoUserId?: string;
  initialLikes: number;
  initialComments: number;
  initialShares: number;
  initialViews?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  allowDuets?: boolean;
  onCommentClick: () => void;
  onLikeChange?: (liked: boolean, count: number) => void;
}

export function VideoActions({
  videoId,
  videoUserId,
  initialLikes,
  initialComments,
  initialShares,
  initialViews = 0,
  isLiked = false,
  isBookmarked = false,
  allowDuets = true,
  onCommentClick,
  onLikeChange,
}: VideoActionsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { checkRateLimit: checkLikeLimit, handleRateLimitError } = useRateLimit("like");
  const [liked, setLiked] = useState(isLiked);
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showSeriesSheet, setShowSeriesSheet] = useState(false);

  const isOwnVideo = user?.id === videoUserId;

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

      if (error) {
        // Check if it's a rate limit error and show friendly message
        if (!handleRateLimitError(error, "like")) {
          toast({ title: "Failed to like video", variant: "destructive" });
        }
      } else {
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
        className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform duration-100"
      >
        <div className={cn(
          "p-2 rounded-full backdrop-blur-sm bg-background/20 transition-all duration-150",
          liked && "animate-heart bg-heart/20"
        )}>
          <Heart
            className={cn(
              "w-6 h-6 transition-all duration-150 drop-shadow-md",
              liked ? "text-heart fill-heart scale-110" : "text-foreground"
            )}
          />
        </div>
        <span className={cn(
          "text-[11px] font-medium drop-shadow-sm transition-colors duration-150",
          liked ? "text-heart" : "text-foreground/90"
        )}>
          {formatCount(likesCount)}
        </span>
      </button>

      {/* Comment */}
      <button
        onClick={onCommentClick}
        className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform duration-100"
      >
        <div className="p-2 rounded-full backdrop-blur-sm bg-background/20 hover:bg-background/30 transition-colors duration-150">
          <MessageCircle className="w-6 h-6 text-foreground drop-shadow-md" />
        </div>
        <span className="text-[11px] font-medium text-foreground/90 drop-shadow-sm">
          {formatCount(initialComments)}
        </span>
      </button>

      {/* Bookmark */}
      <button
        onClick={handleBookmark}
        className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform duration-100"
      >
        <div className={cn(
          "p-2 rounded-full backdrop-blur-sm bg-background/20 transition-all duration-150",
          bookmarked && "bg-bookmark/20"
        )}>
          <Bookmark
            className={cn(
              "w-6 h-6 transition-all duration-150 drop-shadow-md",
              bookmarked ? "text-bookmark fill-bookmark scale-110" : "text-foreground"
            )}
          />
        </div>
        <span className={cn(
          "text-[11px] font-medium drop-shadow-sm transition-colors duration-150",
          bookmarked ? "text-bookmark" : "text-foreground/90"
        )}>Save</span>
      </button>

      {/* Share */}
      <button
        onClick={handleShare}
        className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform duration-100"
      >
        <div className="p-2 rounded-full backdrop-blur-sm bg-background/20 hover:bg-background/30 transition-colors duration-150">
          <Share2 className="w-6 h-6 text-foreground drop-shadow-md" />
        </div>
        <span className="text-[11px] font-medium text-foreground/90 drop-shadow-sm">
          {formatCount(initialShares)}
        </span>
      </button>

      {/* Duet - for other users' videos that allow duets */}
      {!isOwnVideo && (
        <DuetButton videoId={videoId} allowDuets={allowDuets} isOwnVideo={isOwnVideo} />
      )}

      {/* Add to Series - only for own videos */}
      {isOwnVideo && (
        <button
          onClick={() => setShowSeriesSheet(true)}
          className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform duration-100"
        >
          <div className="p-2 rounded-full backdrop-blur-sm bg-background/20 hover:bg-background/30 transition-colors duration-150">
            <Layers className="w-6 h-6 text-foreground drop-shadow-md" />
          </div>
          <span className="text-[11px] font-medium text-foreground/90 drop-shadow-sm">Series</span>
        </button>
      )}

      {/* Report */}
      <button
        onClick={() => setShowReportDialog(true)}
        className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform duration-100"
      >
        <div className="p-2 rounded-full backdrop-blur-sm bg-background/20 hover:bg-background/30 transition-colors duration-150">
          <Flag className="w-6 h-6 text-foreground drop-shadow-md" />
        </div>
        <span className="text-[11px] font-medium text-foreground/90 drop-shadow-sm">Report</span>
      </button>

      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        contentId={videoId}
        contentType="video"
      />

      {/* Add to Series Sheet */}
      <AddToSeriesSheet
        videoId={videoId}
        open={showSeriesSheet}
        onOpenChange={setShowSeriesSheet}
      />
    </div>
  );
}