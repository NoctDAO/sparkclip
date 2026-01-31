import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, ChevronDown, ChevronUp, Flag } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Comment } from "@/types/video";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useRateLimit } from "@/hooks/useRateLimit";
import { ReportDialog } from "@/components/ReportDialog";

interface CommentItemProps {
  comment: Comment;
  onReply: (comment: Comment) => void;
  onLikeChange: (commentId: string, isLiked: boolean, newCount: number) => void;
  isReply?: boolean;
  createNotification?: (params: {
    userId: string;
    type: "mention" | "comment_like" | "reply" | "like" | "follow";
    videoId?: string;
    commentId?: string;
  }) => Promise<void>;
}

// Parse @mentions in content and render as links
function renderContentWithMentions(content: string) {
  const mentionRegex = /@(\w+)/g;
  const parts = content.split(mentionRegex);

  return parts.map((part, i) => {
    // Odd indices are the captured username groups
    if (i % 2 === 1) {
      return (
        <Link
          key={i}
          to={`/profile/${part}`}
          className="text-primary font-semibold hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          @{part}
        </Link>
      );
    }
    return part;
  });
}

export function CommentItem({
  comment,
  onReply,
  onLikeChange,
  isReply = false,
  createNotification,
}: CommentItemProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { handleRateLimitError } = useRateLimit("like");
  const [showReplies, setShowReplies] = useState(false);
  const [liking, setLiking] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const handleLike = async () => {
    if (!user) {
      toast({ title: "Please sign in to like comments", variant: "destructive" });
      return;
    }

    if (liking) return;
    setLiking(true);

    const isCurrentlyLiked = comment.isLiked;
    const newCount = isCurrentlyLiked ? comment.likes_count - 1 : comment.likes_count + 1;

    // Optimistic update
    onLikeChange(comment.id, !isCurrentlyLiked, newCount);

    try {
      if (isCurrentlyLiked) {
        const { error } = await supabase
          .from("comment_likes")
          .delete()
          .eq("user_id", user.id)
          .eq("comment_id", comment.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase.from("comment_likes").insert({
          user_id: user.id,
          comment_id: comment.id,
        });

        if (error) throw error;

        // Create notification for comment author
        if (createNotification && comment.user_id !== user.id) {
          await createNotification({
            userId: comment.user_id,
            type: "comment_like",
            videoId: comment.video_id,
            commentId: comment.id,
          });
        }
      }
    } catch (error) {
      // Revert on error
      onLikeChange(comment.id, isCurrentlyLiked!, comment.likes_count);
      // Check if it's a rate limit error and show friendly message
      if (!handleRateLimitError(error, "like")) {
        toast({ title: "Failed to update like", variant: "destructive" });
      }
    }

    setLiking(false);
  };

  const replies = comment.replies || [];
  const hasReplies = replies.length > 0;

  return (
    <div className={cn("flex gap-3", isReply && "ml-12")}>
      <Link to={`/profile/${comment.profiles?.user_id || comment.user_id}`}>
        <Avatar className={cn("shrink-0", isReply ? "w-7 h-7" : "w-9 h-9")}>
          <AvatarImage src={comment.profiles?.avatar_url || undefined} />
          <AvatarFallback className="bg-secondary text-foreground text-xs">
            {(comment.profiles?.display_name || comment.profiles?.username || "U")[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            to={`/profile/${comment.profiles?.user_id || comment.user_id}`}
            className="text-sm font-semibold text-foreground hover:underline"
          >
            {comment.profiles?.username || "user"}
          </Link>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>

        <p className="text-sm text-foreground mt-1 break-words">
          {renderContentWithMentions(comment.content)}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={handleLike}
            disabled={liking}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Heart
              className={cn(
                "w-4 h-4",
                comment.isLiked && "fill-primary text-primary"
              )}
            />
            {comment.likes_count > 0 && (
              <span className="text-xs">{comment.likes_count}</span>
            )}
          </button>

          {!isReply && (
            <button
              onClick={() => onReply(comment)}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs">Reply</span>
            </button>
          )}

          <button
            onClick={() => setShowReportDialog(true)}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Flag className="w-4 h-4" />
            <span className="text-xs">Report</span>
          </button>
        </div>

        <ReportDialog
          open={showReportDialog}
          onOpenChange={setShowReportDialog}
          contentId={comment.id}
          contentType="comment"
        />

        {/* Show/Hide Replies */}
        {hasReplies && !isReply && (
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground mt-2 text-sm"
          >
            {showReplies ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Hide replies
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                View {replies.length} {replies.length === 1 ? "reply" : "replies"}
              </>
            )}
          </button>
        )}

        {/* Replies */}
        {showReplies && hasReplies && (
          <div className="mt-3 space-y-3">
            {replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                onReply={onReply}
                onLikeChange={onLikeChange}
                isReply
                createNotification={createNotification}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
