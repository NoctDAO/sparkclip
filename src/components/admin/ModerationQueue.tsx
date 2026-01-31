import { useState, useEffect } from "react";
import { AlertTriangle, Eye, EyeOff, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

interface QueueItem {
  content_id: string;
  content_type: string;
  report_count: number;
  reasons: string[];
  report_ids: string[];
  first_reported: string;
  last_reported: string;
  priority_score: number;
  content?: {
    caption?: string;
    content?: string;
    user?: {
      username: string | null;
      avatar_url: string | null;
      user_id: string;
    };
  };
}

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment",
  hate_speech: "Hate speech",
  violence: "Violence",
  nudity: "Nudity",
  minor_safety: "Minor safety",
  copyright: "Copyright",
  other: "Other",
};

const getPriorityLevel = (score: number) => {
  if (score >= 60) return { label: "Critical", variant: "destructive" as const };
  if (score >= 40) return { label: "High", variant: "default" as const };
  if (score >= 20) return { label: "Medium", variant: "secondary" as const };
  return { label: "Low", variant: "outline" as const };
};

export function ModerationQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: "hide" | "delete" | "dismiss" | null;
  }>({ open: false, action: null });
  const [moderationNote, setModerationNote] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("moderation_queue")
      .select("*");

    if (error) {
      console.error("Error fetching queue:", error);
      setLoading(false);
      return;
    }

    // Fetch content details for each queue item
    const enrichedQueue = await Promise.all(
      (data || []).map(async (item) => {
        let content;
        
        if (item.content_type === "video") {
          const { data: videoData } = await supabase
            .from("videos")
            .select("caption, user_id")
            .eq("id", item.content_id)
            .maybeSingle();

          if (videoData) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("user_id, username, avatar_url")
              .eq("user_id", videoData.user_id)
              .maybeSingle();

            content = {
              caption: videoData.caption || "No caption",
              user: profile || undefined,
            };
          }
        } else if (item.content_type === "comment") {
          const { data: commentData } = await supabase
            .from("comments")
            .select("content, user_id")
            .eq("id", item.content_id)
            .maybeSingle();

          if (commentData) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("user_id, username, avatar_url")
              .eq("user_id", commentData.user_id)
              .maybeSingle();

            content = {
              content: commentData.content,
              user: profile || undefined,
            };
          }
        }

        return { ...item, content };
      })
    );

    setQueue(enrichedQueue);
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
    if (!selectedItem || !actionDialog.action || !user) return;

    setProcessing(true);

    try {
      const { action } = actionDialog;
      const { content_type, content_id, report_ids } = selectedItem;

      if (action === "dismiss") {
        // Mark all reports as dismissed
        const { error } = await supabase
          .from("reports")
          .update({
            status: "dismissed",
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
          })
          .in("id", report_ids);
        if (error) throw error;

        await logAdminAction("dismiss_reports", content_type, content_id, {
          report_count: report_ids.length,
        });

        toast({
          title: "Reports dismissed",
          description: `${report_ids.length} report(s) have been dismissed`,
        });
      } else if (action === "hide" && content_type === "video") {
        // Hide video
        const { error: updateError } = await supabase
          .from("videos")
          .update({
            visibility: "hidden",
            moderation_note: moderationNote || null,
            moderated_by: user.id,
            moderated_at: new Date().toISOString(),
          })
          .eq("id", content_id);
        if (updateError) throw updateError;

        // Mark reports as actioned
        const { error: reportError } = await supabase
          .from("reports")
          .update({
            status: "actioned",
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
          })
          .in("id", report_ids);
        if (reportError) throw reportError;

        await logAdminAction("hide_video", "video", content_id, {
          reason: moderationNote,
          report_count: report_ids.length,
        });

        toast({
          title: "Video hidden",
          description: "The video has been hidden from public feeds",
        });
      } else if (action === "delete") {
        // Delete content
        if (content_type === "video") {
          const { error } = await supabase
            .from("videos")
            .delete()
            .eq("id", content_id);
          if (error) throw error;
        } else if (content_type === "comment") {
          const { error } = await supabase
            .from("comments")
            .delete()
            .eq("id", content_id);
          if (error) throw error;
        }

        // Mark reports as actioned
        await supabase
          .from("reports")
          .update({
            status: "actioned",
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
          })
          .in("id", report_ids);

        await logAdminAction(`delete_${content_type}`, content_type, content_id, {
          reason: moderationNote,
          report_count: report_ids.length,
        });

        toast({
          title: `${content_type === "video" ? "Video" : "Comment"} deleted`,
          description: "The content has been permanently removed",
        });
      }

      await fetchQueue();
      setSelectedItem(null);
      setActionDialog({ open: false, action: null });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <Check className="w-12 h-12 mx-auto mb-2 text-green-500" />
          <p>All caught up! No pending reports.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {queue.map((item) => {
        const priority = getPriorityLevel(item.priority_score);
        
        return (
          <Card
            key={`${item.content_type}-${item.content_id}`}
            className={`cursor-pointer transition-colors hover:bg-secondary/50 ${
              selectedItem?.content_id === item.content_id ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setSelectedItem(item)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{item.content_type}</Badge>
                    <Badge variant={priority.variant}>
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {priority.label} ({item.priority_score})
                    </Badge>
                    <Badge variant="secondary">
                      {item.report_count} report{item.report_count > 1 ? "s" : ""}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {item.reasons.map((reason) => (
                      <Badge key={reason} variant="outline" className="text-xs">
                        {REASON_LABELS[reason] || reason}
                      </Badge>
                    ))}
                  </div>

                  {item.content && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      @{item.content.user?.username || "unknown"}: {" "}
                      {item.content.caption || item.content.content}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    First reported {formatDistanceToNow(new Date(item.first_reported), { addSuffix: true })}
                  </p>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {item.content_type === "video" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/video/${item.content_id}`);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Action Dialog */}
      <Dialog
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Review Reports
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.report_count} report(s) for this {selectedItem?.content_type}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {selectedItem.reasons.map((reason) => (
                  <Badge key={reason} variant="secondary">
                    {REASON_LABELS[reason] || reason}
                  </Badge>
                ))}
              </div>

              {selectedItem.content && (
                <div className="bg-secondary/50 p-3 rounded-md">
                  <p className="text-sm font-medium mb-1">
                    @{selectedItem.content.user?.username || "unknown"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedItem.content.caption || selectedItem.content.content}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setActionDialog({ open: true, action: "dismiss" })}
                >
                  <X className="w-4 h-4 mr-1" />
                  Dismiss All
                </Button>
                {selectedItem.content_type === "video" && (
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setActionDialog({ open: true, action: "hide" })}
                  >
                    <EyeOff className="w-4 h-4 mr-1" />
                    Hide
                  </Button>
                )}
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setActionDialog({ open: true, action: "delete" })}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => !open && setActionDialog({ open: false, action: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "dismiss" && "Dismiss Reports?"}
              {actionDialog.action === "hide" && "Hide Content?"}
              {actionDialog.action === "delete" && "Delete Content?"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === "dismiss" && "This will mark all reports as reviewed with no action taken."}
              {actionDialog.action === "hide" && "This will hide the content from public view."}
              {actionDialog.action === "delete" && "This will permanently delete the content. This cannot be undone."}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.action !== "dismiss" && (
            <div className="space-y-2">
              <Label htmlFor="mod-note">Moderation note (optional)</Label>
              <Textarea
                id="mod-note"
                placeholder="Add a reason..."
                value={moderationNote}
                onChange={(e) => setModerationNote(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, action: null })}
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog.action === "delete" ? "destructive" : "default"}
              onClick={handleAction}
              disabled={processing}
            >
              {processing ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
