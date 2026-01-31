import { useState, useEffect, useCallback } from "react";
import { X, Lock, Ban } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useRateLimit } from "@/hooks/useRateLimit";
import { useUserPrivacy } from "@/hooks/useUserPrivacy";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Comment } from "@/types/video";
import { CommentItem } from "@/components/comments/CommentItem";
import { MentionInput } from "@/components/comments/MentionInput";
import { useNotifications } from "@/hooks/useNotifications";
import { useContentModeration } from "@/hooks/useContentModeration";
import { useBanStatus } from "@/hooks/useBanStatus";

interface CommentsSheetProps {
  videoId: string;
  videoOwnerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommentsSheet({ videoId, videoOwnerId, open, onOpenChange }: CommentsSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { checkRateLimit: checkCommentLimit } = useRateLimit("comment");
  const { createNotification } = useNotifications();
  const { moderateContent } = useContentModeration();
  const { canComment, settings: ownerPrivacy } = useUserPrivacy(videoOwnerId);
  const { isBanned, banInfo } = useBanStatus(user?.id);
  const { blockedUsers, isUserBlocked } = useBlockedUsers();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  
  // Get blocked user IDs for filtering comments
  const blockedUserIds = new Set(blockedUsers.map(b => b.blocked_user_id));
  
  // Check if the video owner has blocked the current user
  const isBlockedByOwner = user ? isUserBlocked(videoOwnerId) : false;

  const fetchComments = useCallback(async () => {
    // Fetch all comments for this video
    const { data: commentsData, error } = await supabase
      .from("comments")
      .select("*")
      .eq("video_id", videoId)
      .order("created_at", { ascending: false });

    if (error || !commentsData) return;

    // Fetch profiles separately
    const userIds = [...new Set(commentsData.map((c) => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    // Fetch current user's likes
    let likedCommentIds = new Set<string>();
    if (user) {
      const { data: likes } = await supabase
        .from("comment_likes")
        .select("comment_id")
        .eq("user_id", user.id)
        .in(
          "comment_id",
          commentsData.map((c) => c.id)
        );

      likedCommentIds = new Set(likes?.map((l) => l.comment_id) || []);
    }

    // Build comment tree and filter out blocked users
    const commentsWithProfiles = commentsData
      .filter(comment => !blockedUserIds.has(comment.user_id)) // Filter blocked users
      .map((comment) => ({
        ...comment,
        profiles: profileMap.get(comment.user_id) || null,
        isLiked: likedCommentIds.has(comment.id),
        replies: [] as Comment[],
      })) as Comment[];

    // Separate top-level comments and replies
    const topLevelComments: Comment[] = [];
    const repliesMap = new Map<string, Comment[]>();

    commentsWithProfiles.forEach((comment) => {
      if (comment.parent_id) {
        const replies = repliesMap.get(comment.parent_id) || [];
        replies.push(comment);
        repliesMap.set(comment.parent_id, replies);
      } else {
        topLevelComments.push(comment);
      }
    });

    // Attach replies to parent comments (also filtered)
    topLevelComments.forEach((comment) => {
      const replies = (repliesMap.get(comment.id) || [])
        .filter(reply => !blockedUserIds.has(reply.user_id));
      // Sort replies by oldest first
      replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      comment.replies = replies;
    });

    setComments(topLevelComments);
  }, [videoId, user, blockedUserIds.size]);

  useEffect(() => {
    if (open) {
      fetchComments();
    }
  }, [open, fetchComments]);

  const handleLikeChange = (commentId: string, isLiked: boolean, newCount: number) => {
    setComments((prev) =>
      prev.map((comment) => {
        if (comment.id === commentId) {
          return { ...comment, isLiked, likes_count: newCount };
        }
        // Check replies
        if (comment.replies) {
          return {
            ...comment,
            replies: comment.replies.map((reply) =>
              reply.id === commentId ? { ...reply, isLiked, likes_count: newCount } : reply
            ),
          };
        }
        return comment;
      })
    );
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
    // Pre-fill with @mention
    const username = comment.profiles?.username;
    if (username && !newComment.includes(`@${username}`)) {
      setNewComment(`@${username} `);
    }
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment("");
  };

  const extractMentions = (content: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Please sign in to comment", variant: "destructive" });
      return;
    }

    if (!newComment.trim()) return;

    if (!checkCommentLimit()) return;

    setLoading(true);

    // Generate a temporary ID for moderation (will be replaced with real ID after insert)
    const tempId = crypto.randomUUID();

    // Run moderation BEFORE inserting
    const moderationResult = await moderateContent({
      content: newComment.trim(),
      content_type: "comment",
      content_id: tempId,
    });

    if (moderationResult.blocked) {
      toast({
        title: "Comment couldn't be posted",
        description: "Please revise your comment and try again.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { data: newCommentData, error } = await supabase
      .from("comments")
      .insert({
        user_id: user.id,
        video_id: videoId,
        content: newComment.trim(),
        parent_id: replyingTo?.id || null,
      })
      .select()
      .single();

    if (!error && newCommentData) {
      // If content was flagged (not blocked), update the content_flags with real comment ID
      if (!moderationResult.safe && moderationResult.flag_type) {
        await supabase
          .from("content_flags")
          .update({ content_id: newCommentData.id })
          .eq("content_id", tempId);
      }

      // Create notification for reply
      if (replyingTo && replyingTo.user_id !== user.id) {
        await createNotification({
          userId: replyingTo.user_id,
          type: "reply",
          videoId,
          commentId: newCommentData.id,
        });
      }

      // Create notifications for @mentions
      const mentions = extractMentions(newComment);
      if (mentions.length > 0) {
        // Fetch user IDs for mentioned usernames
        const { data: mentionedProfiles } = await supabase
          .from("profiles")
          .select("user_id, username")
          .in("username", mentions);

        if (mentionedProfiles) {
          for (const profile of mentionedProfiles) {
            if (profile.user_id !== user.id && profile.user_id !== replyingTo?.user_id) {
              await createNotification({
                userId: profile.user_id,
                type: "mention",
                videoId,
                commentId: newCommentData.id,
              });
            }
          }
        }
      }

      setNewComment("");
      setReplyingTo(null);
      fetchComments();
    } else {
      toast({ title: "Failed to post comment", variant: "destructive" });
    }

    setLoading(false);
  };

  const totalCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length || 0),
    0
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[70vh] bg-card border-border rounded-t-3xl"
      >
        <SheetHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
          <SheetTitle className="text-foreground">
            {totalCount} {totalCount === 1 ? "comment" : "comments"}
          </SheetTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
          >
            <X className="w-5 h-5" />
          </Button>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(70vh-160px)] py-4">
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No comments yet. Be the first!
              </p>
            ) : (
              comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={handleReply}
                  onLikeChange={handleLikeChange}
                  createNotification={createNotification}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Comment input */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-card border-t border-border">
          {isBanned ? (
            <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground py-2">
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-destructive" />
                <span className="text-sm">Account suspended</span>
              </div>
              {banInfo?.expires_at && (
                <span className="text-xs">
                  Until {new Date(banInfo.expires_at).toLocaleDateString()}
                </span>
              )}
            </div>
          ) : isBlockedByOwner ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground py-2">
              <Ban className="w-4 h-4" />
              <span className="text-sm">You can't comment on this video</span>
            </div>
          ) : !canComment() ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground py-2">
              <Lock className="w-4 h-4" />
              <span className="text-sm">
                {ownerPrivacy.comment_permission === "no_one"
                  ? "Comments are turned off"
                  : "Only followers can comment"}
              </span>
            </div>
          ) : (
            <MentionInput
              value={newComment}
              onChange={setNewComment}
              onSubmit={handleSubmit}
              placeholder={user ? "Add a comment..." : "Sign in to comment"}
              disabled={!user}
              loading={loading}
              replyingTo={
                replyingTo
                  ? {
                      username: replyingTo.profiles?.username || "user",
                      onCancel: cancelReply,
                    }
                  : null
              }
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
