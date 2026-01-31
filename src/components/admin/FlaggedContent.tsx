import { useState, useEffect } from "react";
import { AlertTriangle, Eye, Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface ContentFlag {
  id: string;
  content_type: string;
  content_id: string;
  flag_type: string;
  confidence: number;
  detected_issues: Record<string, unknown> | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  content?: {
    caption?: string;
    content?: string;
    user?: {
      username: string | null;
    };
  };
}

const FLAG_LABELS: Record<string, string> = {
  hate_speech: "Hate Speech",
  harassment: "Harassment",
  spam: "Spam",
  violence: "Violence",
  adult_content: "Adult Content",
  misinformation: "Misinformation",
  other: "Other",
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.9) return "text-destructive";
  if (confidence >= 0.7) return "text-orange-500";
  return "text-yellow-500";
};

export function FlaggedContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [flags, setFlags] = useState<ContentFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlag, setSelectedFlag] = useState<ContentFlag | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: "dismiss" | "delete" | null;
  }>({ open: false, action: null });
  const [moderationNote, setModerationNote] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("content_flags")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching flags:", error);
      setLoading(false);
      return;
    }

    // Enrich with content details
    const enrichedFlags = await Promise.all(
      (data || []).map(async (flag) => {
        let content;
        
        if (flag.content_type === "video") {
          const { data: videoData } = await supabase
            .from("videos")
            .select("caption, user_id")
            .eq("id", flag.content_id)
            .maybeSingle();

          if (videoData) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("username")
              .eq("user_id", videoData.user_id)
              .maybeSingle();

            content = {
              caption: videoData.caption || "No caption",
              user: profile || undefined,
            };
          }
        } else if (flag.content_type === "comment") {
          const { data: commentData } = await supabase
            .from("comments")
            .select("content, user_id")
            .eq("id", flag.content_id)
            .maybeSingle();

          if (commentData) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("username")
              .eq("user_id", commentData.user_id)
              .maybeSingle();

            content = {
              content: commentData.content,
              user: profile || undefined,
            };
          }
        }

        return { 
          ...flag,
          detected_issues: flag.detected_issues as Record<string, unknown> | null,
          content 
        };
      })
    );

    setFlags(enrichedFlags);
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
    if (!selectedFlag || !actionDialog.action || !user) return;

    setProcessing(true);

    try {
      const { action } = actionDialog;

      if (action === "dismiss") {
        const { error } = await supabase
          .from("content_flags")
          .update({
            status: "dismissed",
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", selectedFlag.id);
        if (error) throw error;

        await logAdminAction("dismiss_flag", "content_flag", selectedFlag.id);

        toast({
          title: "Flag dismissed",
          description: "The content has been marked as safe",
        });
      } else if (action === "delete") {
        // Delete the content
        if (selectedFlag.content_type === "video") {
          await supabase
            .from("videos")
            .delete()
            .eq("id", selectedFlag.content_id);
        } else if (selectedFlag.content_type === "comment") {
          await supabase
            .from("comments")
            .delete()
            .eq("id", selectedFlag.content_id);
        }

        // Mark flag as reviewed
        await supabase
          .from("content_flags")
          .update({
            status: "reviewed",
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", selectedFlag.id);

        await logAdminAction(`delete_${selectedFlag.content_type}`, selectedFlag.content_type, selectedFlag.content_id, {
          flag_type: selectedFlag.flag_type,
          reason: moderationNote,
        });

        toast({
          title: "Content deleted",
          description: "The flagged content has been removed",
        });
      }

      await fetchFlags();
      setSelectedFlag(null);
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

  const pendingFlags = flags.filter((f) => f.status === "pending");
  const reviewedFlags = flags.filter((f) => f.status !== "pending");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="pending">
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1">
            Pending ({pendingFlags.length})
          </TabsTrigger>
          <TabsTrigger value="reviewed" className="flex-1">
            Reviewed ({reviewedFlags.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pendingFlags.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Check className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>No pending AI-flagged content</p>
              </CardContent>
            </Card>
          ) : (
            pendingFlags.map((flag) => (
              <FlagCard
                key={flag.id}
                flag={flag}
                onClick={() => setSelectedFlag(flag)}
                isSelected={selectedFlag?.id === flag.id}
                onView={() => {
                  if (flag.content_type === "video") {
                    navigate(`/video/${flag.content_id}`);
                  }
                }}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="reviewed" className="mt-4 space-y-3">
          {reviewedFlags.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <p>No reviewed flags yet</p>
              </CardContent>
            </Card>
          ) : (
            reviewedFlags.map((flag) => (
              <FlagCard
                key={flag.id}
                flag={flag}
                onClick={() => setSelectedFlag(flag)}
                isSelected={selectedFlag?.id === flag.id}
                onView={() => {
                  if (flag.content_type === "video") {
                    navigate(`/video/${flag.content_id}`);
                  }
                }}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Flag Detail Dialog */}
      <Dialog
        open={!!selectedFlag}
        onOpenChange={(open) => !open && setSelectedFlag(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              AI-Flagged Content
            </DialogTitle>
          </DialogHeader>

          {selectedFlag && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{selectedFlag.content_type}</Badge>
                <Badge variant="secondary">
                  {FLAG_LABELS[selectedFlag.flag_type] || selectedFlag.flag_type}
                </Badge>
                <Badge
                  variant={selectedFlag.status === "pending" ? "destructive" : "default"}
                >
                  {selectedFlag.status}
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>AI Confidence</span>
                  <span className={getConfidenceColor(selectedFlag.confidence)}>
                    {(selectedFlag.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <Progress value={selectedFlag.confidence * 100} />
              </div>

              {selectedFlag.content && (
                <div className="bg-secondary/50 p-3 rounded-md">
                  <p className="text-sm font-medium mb-1">
                    @{selectedFlag.content.user?.username || "unknown"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedFlag.content.caption || selectedFlag.content.content}
                  </p>
                </div>
              )}

              {selectedFlag.detected_issues && (
                <div className="bg-muted p-3 rounded-md text-sm">
                  <p className="font-medium mb-1">Detection details</p>
                  <pre className="text-xs text-muted-foreground overflow-auto">
                    {JSON.stringify(selectedFlag.detected_issues, null, 2)}
                  </pre>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Flagged {formatDistanceToNow(new Date(selectedFlag.created_at), { addSuffix: true })}
              </p>

              {selectedFlag.status === "pending" && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setActionDialog({ open: true, action: "dismiss" })}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Dismiss
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setActionDialog({ open: true, action: "delete" })}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              )}
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
              {actionDialog.action === "dismiss" ? "Dismiss Flag?" : "Delete Content?"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === "dismiss"
                ? "This will mark the content as safe and dismiss the AI flag."
                : "This will permanently delete the content. This cannot be undone."}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.action === "delete" && (
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

function FlagCard({
  flag,
  onClick,
  isSelected,
  onView,
}: {
  flag: ContentFlag;
  onClick: () => void;
  isSelected: boolean;
  onView: () => void;
}) {
  return (
    <Card
      className={`cursor-pointer transition-colors hover:bg-secondary/50 ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{flag.content_type}</Badge>
              <Badge variant="secondary">
                {FLAG_LABELS[flag.flag_type] || flag.flag_type}
              </Badge>
              <span className={`text-sm font-medium ${getConfidenceColor(flag.confidence)}`}>
                {(flag.confidence * 100).toFixed(0)}% confidence
              </span>
            </div>

            {flag.content && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                @{flag.content.user?.username || "unknown"}: {" "}
                {flag.content.caption || flag.content.content}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(flag.created_at), { addSuffix: true })}
            </p>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            {flag.content_type === "video" && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
              >
                <Eye className="w-4 h-4" />
              </Button>
            )}
            <Badge
              variant={flag.status === "pending" ? "destructive" : "default"}
            >
              {flag.status}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
