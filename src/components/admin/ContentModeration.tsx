import { useState, useEffect } from "react";
import { Trash2, Eye, Play, MessageSquare, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

export function ContentModeration() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: "video" | "comment" | null;
    item: VideoItem | CommentItem | null;
  }>({ open: false, type: null, item: null });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setLoading(true);

    // Fetch recent videos
    const { data: videosData } = await supabase
      .from("videos")
      .select("*")
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
    videosData?.forEach((v) => userIds.add(v.user_id));
    commentsData?.forEach((c) => userIds.add(c.user_id));

    // Fetch profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, avatar_url")
      .in("user_id", Array.from(userIds));

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    setVideos(
      (videosData || []).map((v) => ({
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

  const handleDelete = async () => {
    if (!deleteDialog.item || !deleteDialog.type) return;

    setProcessing(true);

    try {
      if (deleteDialog.type === "video") {
        const { error } = await supabase
          .from("videos")
          .delete()
          .eq("id", deleteDialog.item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("comments")
          .delete()
          .eq("id", deleteDialog.item.id);
        if (error) throw error;
      }

      toast({
        title: `${deleteDialog.type === "video" ? "Video" : "Comment"} deleted`,
        description: "The content has been removed",
      });

      await fetchContent();
      setDeleteDialog({ open: false, type: null, item: null });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Failed to delete",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
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
              <div
                key={video.id}
                className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border"
              >
                <div
                  className="w-16 h-24 bg-secondary rounded overflow-hidden flex-shrink-0 cursor-pointer"
                  onClick={() => navigate(`/video/${video.id}`)}
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
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {video.caption || "No caption"}
                  </p>
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
                    <DropdownMenuItem
                      onClick={() => navigate(`/video/${video.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Video
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setDeleteDialog({ open: true, type: "video", item: video })
                      }
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Video
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
                        setDeleteDialog({ open: true, type: "comment", item: comment })
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          !open && setDeleteDialog({ open: false, type: null, item: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteDialog.type}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {deleteDialog.type}? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, type: null, item: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={processing}
            >
              {processing ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
