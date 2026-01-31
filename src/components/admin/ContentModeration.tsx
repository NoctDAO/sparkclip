import { useState, useEffect } from "react";
import { Trash2, Eye, Play, MessageSquare, MoreHorizontal, EyeOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface VideoItem {
  id: string;
  user_id: string;
  caption: string | null;
  thumbnail_url: string | null;
  views_count: number;
  likes_count: number;
  visibility: string;
  moderation_note: string | null;
  created_at: string;
  profile?: {
    username: string | null;
    avatar_url: string | null;
  };
}

interface CommentItem {
  id: string;
  user_id: string;
  video_id: string;
  content: string;
  created_at: string;
  profile?: {
    username: string | null;
    avatar_url: string | null;
  };
}

type ActionType = "delete" | "hide" | "restore";

export function ContentModeration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [hiddenVideos, setHiddenVideos] = useState<VideoItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: "video" | "comment" | null;
    action: ActionType | null;
    item: VideoItem | CommentItem | null;
  }>({ open: false, type: null, action: null, item: null });
  const [moderationNote, setModerationNote] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setLoading(true);

    // Fetch public videos
    const { data: publicVideos } = await supabase
      .from("videos")
      .select("*")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch hidden videos (for admins)
    const { data: hiddenData } = await supabase
      .from("videos")
      .select("*")
      .eq("visibility", "hidden")
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch recent comments
    const { data: commentsData } = await supabase
      .from("comments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    // Get unique user IDs
    const userIds = new Set<string>();
    publicVideos?.forEach((v) => userIds.add(v.user_id));
    hiddenData?.forEach((v) => userIds.add(v.user_id));
    commentsData?.forEach((c) => userIds.add(c.user_id));

    // Fetch profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, avatar_url")
      .in("user_id", Array.from(userIds));

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    setVideos(
      (publicVideos || []).map((v) => ({
        ...v,
        profile: profileMap.get(v.user_id),
      }))
    );

    setHiddenVideos(
      (hiddenData || []).map((v) => ({
        ...v,
        profile: profileMap.get(v.user_id),
      }))
    );

    setComments(
      (commentsData || []).map((c) => ({
        ...c,
        profile: profileMap.get(c.user_id),
      }))
    );

    setLoading(false);
  };

  const logAdminAction = async (
    actionType: string,
    targetType: string,
    targetId: string,
    details?: Record<string, unknown>
  ) => {
    if (!user) return;
    
    await supabase.from("admin_logs").insert([{
      admin_id: user.id,
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      details: details || null,
    }] as any);
  };

  const handleAction = async () => {
    if (!actionDialog.item || !actionDialog.type || !actionDialog.action || !user) return;

    setProcessing(true);

    try {
      const { action, type, item } = actionDialog;

      if (type === "video") {
        if (action === "delete") {
          const { error } = await supabase
            .from("videos")
            .delete()
            .eq("id", item.id);
          if (error) throw error;
          
          await logAdminAction("delete_video", "video", item.id, {
            caption: (item as VideoItem).caption,
            reason: moderationNote,
          });
        } else if (action === "hide") {
          const { error } = await supabase
            .from("videos")
            .update({
              visibility: "hidden",
              moderation_note: moderationNote || null,
              moderated_by: user.id,
              moderated_at: new Date().toISOString(),
            })
            .eq("id", item.id);
          if (error) throw error;
          
          await logAdminAction("hide_video", "video", item.id, {
            reason: moderationNote,
          });
        } else if (action === "restore") {
          const { error } = await supabase
            .from("videos")
            .update({
              visibility: "public",
              moderation_note: null,
              moderated_by: null,
              moderated_at: null,
            })
            .eq("id", item.id);
          if (error) throw error;
          
          await logAdminAction("restore_video", "video", item.id);
        }
      } else if (type === "comment") {
        if (action === "delete") {
          const { error } = await supabase
            .from("comments")
            .delete()
            .eq("id", item.id);
          if (error) throw error;
          
          await logAdminAction("delete_comment", "comment", item.id, {
            content: (item as CommentItem).content,
            reason: moderationNote,
          });
        }
      }

      const actionLabels = {
        delete: "deleted",
        hide: "hidden from feed",
        restore: "restored",
      };

      toast({
        title: `${type === "video" ? "Video" : "Comment"} ${actionLabels[action]}`,
        description: action === "hide" 
          ? "The content is now hidden from public view"
          : action === "restore"
          ? "The content is now visible again"
          : "The content has been removed",
      });

      await fetchContent();
      setActionDialog({ open: false, type: null, action: null, item: null });
      setModerationNote("");
    } catch (error) {
      console.error("Action error:", error);
      toast({
        title: "Action failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getDialogContent = () => {
    const { action, type } = actionDialog;
    if (!action || !type) return { title: "", description: "" };

    const labels: Record<ActionType, { title: string; description: string }> = {
      delete: {
        title: `Delete ${type}`,
        description: `Are you sure you want to permanently delete this ${type}? This action cannot be undone.`,
      },
      hide: {
        title: `Hide ${type} from feed`,
        description: `This will hide the ${type} from public view. Users won't see it in their feeds, but it won't be deleted.`,
      },
      restore: {
        title: `Restore ${type}`,
        description: `This will make the ${type} visible again in public feeds.`,
      },
    };

    return labels[action];
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="videos">
        <TabsList className="w-full">
          <TabsTrigger value="videos" className="flex-1">
            <Play className="w-4 h-4 mr-2" />
            Videos ({videos.length})
          </TabsTrigger>
          <TabsTrigger value="hidden" className="flex-1">
            <EyeOff className="w-4 h-4 mr-2" />
            Hidden ({hiddenVideos.length})
          </TabsTrigger>
          <TabsTrigger value="comments" className="flex-1">
            <MessageSquare className="w-4 h-4 mr-2" />
            Comments ({comments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="mt-4 space-y-2">
          {videos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No videos found
            </div>
          ) : (
            videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onView={() => navigate(`/video/${video.id}`)}
                onHide={() => setActionDialog({ open: true, type: "video", action: "hide", item: video })}
                onDelete={() => setActionDialog({ open: true, type: "video", action: "delete", item: video })}
                formatCount={formatCount}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="hidden" className="mt-4 space-y-2">
          {hiddenVideos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hidden videos
            </div>
          ) : (
            hiddenVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                isHidden
                onView={() => navigate(`/video/${video.id}`)}
                onRestore={() => setActionDialog({ open: true, type: "video", action: "restore", item: video })}
                onDelete={() => setActionDialog({ open: true, type: "video", action: "delete", item: video })}
                formatCount={formatCount}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="comments" className="mt-4 space-y-2">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No comments found
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border"
              >
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={comment.profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    {(comment.profile?.username || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      @{comment.profile?.username || "unknown"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-sm">{comment.content}</p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => navigate(`/video/${comment.video_id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Video
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setActionDialog({ open: true, type: "comment", action: "delete", item: comment })
                      }
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Comment
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) =>
          !open && setActionDialog({ open: false, type: null, action: null, item: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getDialogContent().title}</DialogTitle>
            <DialogDescription>{getDialogContent().description}</DialogDescription>
          </DialogHeader>

          {actionDialog.action !== "restore" && (
            <div className="space-y-2">
              <Label htmlFor="moderation-note">Moderation note (optional)</Label>
              <Textarea
                id="moderation-note"
                placeholder="Add a reason for this action..."
                value={moderationNote}
                onChange={(e) => setModerationNote(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, type: null, action: null, item: null })}
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog.action === "delete" ? "destructive" : "default"}
              onClick={handleAction}
              disabled={processing}
            >
              {processing ? "Processing..." : getDialogContent().title}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Video Card Sub-component
function VideoCard({
  video,
  isHidden = false,
  onView,
  onHide,
  onRestore,
  onDelete,
  formatCount,
}: {
  video: VideoItem;
  isHidden?: boolean;
  onView: () => void;
  onHide?: () => void;
  onRestore?: () => void;
  onDelete: () => void;
  formatCount: (count: number) => string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
      <div
        className="w-16 h-24 bg-secondary rounded overflow-hidden flex-shrink-0 cursor-pointer relative"
        onClick={onView}
      >
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        {isHidden && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <EyeOff className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Avatar className="w-6 h-6">
            <AvatarImage src={video.profile?.avatar_url || undefined} />
            <AvatarFallback>
              {(video.profile?.username || "U")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate">
            @{video.profile?.username || "unknown"}
          </span>
          {isHidden && (
            <Badge variant="secondary" className="text-xs">Hidden</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {video.caption || "No caption"}
        </p>
        {video.moderation_note && (
          <p className="text-xs text-destructive mt-1 line-clamp-1">
            Note: {video.moderation_note}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span>{formatCount(video.views_count || 0)} views</span>
          <span>{formatCount(video.likes_count || 0)} likes</span>
          <span>
            {formatDistanceToNow(new Date(video.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onView}>
            <Eye className="w-4 h-4 mr-2" />
            View Video
          </DropdownMenuItem>
          {isHidden && onRestore ? (
            <DropdownMenuItem onClick={onRestore}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restore Video
            </DropdownMenuItem>
          ) : onHide ? (
            <DropdownMenuItem onClick={onHide}>
              <EyeOff className="w-4 h-4 mr-2" />
              Hide from Feed
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Permanently
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
