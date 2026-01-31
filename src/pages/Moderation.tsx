import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Check, X, Eye, AlertTriangle, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Report {
  id: string;
  reporter_id: string;
  content_id: string;
  content_type: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reporter?: {
    username: string | null;
    avatar_url: string | null;
  };
}

interface ContentDetails {
  type: "video" | "comment";
  caption?: string;
  content?: string;
  user?: {
    username: string | null;
    avatar_url: string | null;
    user_id: string;
  };
}

const REASON_LABELS: Record<string, string> = {
  spam: "Spam or misleading",
  harassment: "Harassment or bullying",
  hate_speech: "Hate speech or symbols",
  violence: "Violence or dangerous acts",
  nudity: "Nudity or sexual content",
  minor_safety: "Minor safety concern",
  copyright: "Copyright infringement",
  other: "Other",
};

export default function Moderation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isModerator, loading: rolesLoading } = useUserRoles(user?.id);
  const { toast } = useToast();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [contentDetails, setContentDetails] = useState<ContentDetails | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: "hide" | "delete" | "dismiss" | null;
  }>({ open: false, action: null });
  const [actionNote, setActionNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const hasAccess = isAdmin || isModerator;

  useEffect(() => {
    if (!rolesLoading && !hasAccess) {
      toast({
        title: "Access denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [rolesLoading, hasAccess, navigate, toast]);

  useEffect(() => {
    if (hasAccess) {
      fetchReports();
    }
  }, [hasAccess]);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const reporterIds = [...new Set(data.map((r) => r.reporter_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", reporterIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      setReports(
        data.map((r) => ({
          ...r,
          reporter: profileMap.get(r.reporter_id),
        }))
      );
    }
    setLoading(false);
  };

  const fetchContentDetails = async (report: Report) => {
    setContentDetails(null);

    if (report.content_type === "video") {
      const { data } = await supabase
        .from("videos")
        .select("caption, user_id")
        .eq("id", report.content_id)
        .maybeSingle();

      if (data) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url")
          .eq("user_id", data.user_id)
          .maybeSingle();

        setContentDetails({
          type: "video",
          caption: data.caption || "No caption",
          user: profile || undefined,
        });
      }
    } else if (report.content_type === "comment") {
      const { data } = await supabase
        .from("comments")
        .select("content, user_id")
        .eq("id", report.content_id)
        .maybeSingle();

      if (data) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url")
          .eq("user_id", data.user_id)
          .maybeSingle();

        setContentDetails({
          type: "comment",
          content: data.content,
          user: profile || undefined,
        });
      }
    }
  };

  const handleSelectReport = async (report: Report) => {
    setSelectedReport(report);
    await fetchContentDetails(report);
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

  const handleAction = async (action: "hide" | "delete" | "dismiss") => {
    if (!selectedReport || !user) return;

    setProcessing(true);
    try {
      if (action === "dismiss") {
        // Dismiss report - no action on content
        const { error: updateError } = await supabase
          .from("reports")
          .update({
            status: "dismissed",
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
          })
          .eq("id", selectedReport.id);

        if (updateError) throw updateError;

        await logAdminAction("dismiss_report", "report", selectedReport.id, {
          content_type: selectedReport.content_type,
          content_id: selectedReport.content_id,
          note: actionNote,
        });

        toast({
          title: "Report dismissed",
          description: "The report has been marked as dismissed",
        });
      } else if (action === "hide" && selectedReport.content_type === "video") {
        // Hide video from feed
        const { error: videoError } = await supabase
          .from("videos")
          .update({
            visibility: "hidden",
            moderation_note: actionNote || null,
            moderated_by: user.id,
            moderated_at: new Date().toISOString(),
          })
          .eq("id", selectedReport.content_id);

        if (videoError) throw videoError;

        // Update report status
        await supabase
          .from("reports")
          .update({
            status: "actioned",
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
          })
          .eq("id", selectedReport.id);

        await logAdminAction("hide_video", "video", selectedReport.content_id, {
          report_id: selectedReport.id,
          reason: selectedReport.reason,
          note: actionNote,
        });

        toast({
          title: "Video hidden",
          description: "The video has been hidden from public feeds",
        });
      } else if (action === "delete") {
        // Delete content
        if (selectedReport.content_type === "video") {
          await supabase
            .from("videos")
            .delete()
            .eq("id", selectedReport.content_id);
        } else if (selectedReport.content_type === "comment") {
          await supabase
            .from("comments")
            .delete()
            .eq("id", selectedReport.content_id);
        }

        // Update report status
        await supabase
          .from("reports")
          .update({
            status: "actioned",
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
          })
          .eq("id", selectedReport.id);

        await logAdminAction(`delete_${selectedReport.content_type}`, selectedReport.content_type, selectedReport.content_id, {
          report_id: selectedReport.id,
          reason: selectedReport.reason,
          note: actionNote,
        });

        toast({
          title: "Content removed",
          description: "The reported content has been deleted",
        });
      }

      await fetchReports();
      setSelectedReport(null);
      setContentDetails(null);
      setActionDialog({ open: false, action: null });
      setActionNote("");
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

  const pendingReports = reports.filter((r) => r.status === "pending");
  const reviewedReports = reports.filter((r) => r.status !== "pending");

  if (rolesLoading || loading) {
    return (
      <div className="min-h-[var(--app-height)] bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-[var(--app-height)] bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center p-4 border-b border-border sticky top-0 bg-background z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <Shield className="w-5 h-5 ml-2 text-primary" />
        <h1 className="font-bold text-lg ml-2">Moderation Dashboard</h1>
        <Badge variant="secondary" className="ml-auto">
          {isAdmin ? "Admin" : "Moderator"}
        </Badge>
      </header>

      <div className="p-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Reports</CardDescription>
              <CardTitle className="text-2xl text-destructive">
                {pendingReports.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Reviewed</CardDescription>
              <CardTitle className="text-2xl">{reviewedReports.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1">
              Pending ({pendingReports.length})
            </TabsTrigger>
            <TabsTrigger value="reviewed" className="flex-1">
              Reviewed ({reviewedReports.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-3">
            {pendingReports.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <Check className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>All caught up! No pending reports.</p>
                </CardContent>
              </Card>
            ) : (
              pendingReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onSelect={() => handleSelectReport(report)}
                  isSelected={selectedReport?.id === report.id}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="reviewed" className="mt-4 space-y-3">
            {reviewedReports.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <p>No reviewed reports yet.</p>
                </CardContent>
              </Card>
            ) : (
              reviewedReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onSelect={() => handleSelectReport(report)}
                  isSelected={selectedReport?.id === report.id}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Report Detail Dialog */}
      <Dialog
        open={!!selectedReport}
        onOpenChange={(open) => !open && setSelectedReport(null)}
      >
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Report Details
            </DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              {/* Report Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <Badge variant="outline">{selectedReport.content_type}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Reason</span>
                  <Badge variant="secondary">
                    {REASON_LABELS[selectedReport.reason] || selectedReport.reason}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Reported</span>
                  <span className="text-sm">
                    {formatDistanceToNow(new Date(selectedReport.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge
                    variant={
                      selectedReport.status === "pending"
                        ? "destructive"
                        : selectedReport.status === "actioned"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {selectedReport.status}
                  </Badge>
                </div>
              </div>

              {/* Reporter */}
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">Reported by</p>
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={selectedReport.reporter?.avatar_url || undefined} />
                    <AvatarFallback>
                      {(selectedReport.reporter?.username || "U")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">
                    @{selectedReport.reporter?.username || "unknown"}
                  </span>
                </div>
              </div>

              {/* Details */}
              {selectedReport.details && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Additional details
                  </p>
                  <p className="text-sm bg-secondary/50 p-3 rounded-md">
                    {selectedReport.details}
                  </p>
                </div>
              )}

              {/* Reported Content */}
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Reported content
                </p>
                {contentDetails ? (
                  <div className="bg-secondary/50 p-3 rounded-md space-y-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={contentDetails.user?.avatar_url || undefined} />
                        <AvatarFallback>
                          {(contentDetails.user?.username || "U")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        @{contentDetails.user?.username || "unknown"}
                      </span>
                    </div>
                    <p className="text-sm">
                      {contentDetails.type === "video"
                        ? contentDetails.caption
                        : contentDetails.content}
                    </p>
                    {contentDetails.type === "video" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(`/video/${selectedReport.content_id}`)
                        }
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Video
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Content not found or already removed
                  </p>
                )}
              </div>

              {/* Actions */}
              {selectedReport.status === "pending" && (
                <DialogFooter className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setActionDialog({ open: true, action: "dismiss" })
                    }
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Dismiss
                  </Button>
                  {selectedReport.content_type === "video" && (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setActionDialog({ open: true, action: "hide" })
                      }
                      className="flex-1"
                    >
                      <EyeOff className="w-4 h-4 mr-1" />
                      Hide
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={() =>
                      setActionDialog({ open: true, action: "delete" })
                    }
                    className="flex-1"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) =>
          !open && setActionDialog({ open: false, action: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "dismiss" && "Dismiss Report?"}
              {actionDialog.action === "hide" && "Hide Video?"}
              {actionDialog.action === "delete" && "Delete Content?"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === "dismiss" && "This will mark the report as reviewed and take no action on the content."}
              {actionDialog.action === "hide" && "This will hide the video from public feeds. It can be restored later."}
              {actionDialog.action === "delete" && "This will permanently delete the reported content. This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="action-note">Add a note (optional)</Label>
            <Textarea
              id="action-note"
              placeholder="Add a note..."
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, action: null })}
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog.action === "delete" ? "destructive" : "default"}
              onClick={() => handleAction(actionDialog.action!)}
              disabled={processing}
            >
              {processing
                ? "Processing..."
                : actionDialog.action === "dismiss"
                ? "Dismiss Report"
                : actionDialog.action === "hide"
                ? "Hide Video"
                : "Delete Content"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Report Card Component
function ReportCard({
  report,
  onSelect,
  isSelected,
}: {
  report: Report;
  onSelect: () => void;
  isSelected: boolean;
}) {
  return (
    <Card
      className={`cursor-pointer transition-colors hover:bg-secondary/50 ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{report.content_type}</Badge>
              <Badge variant="secondary">
                {REASON_LABELS[report.reason] || report.reason}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Reported{" "}
              {formatDistanceToNow(new Date(report.created_at), {
                addSuffix: true,
              })}
            </p>
          </div>
          <Badge
            variant={
              report.status === "pending"
                ? "destructive"
                : report.status === "actioned"
                ? "default"
                : "secondary"
            }
          >
            {report.status}
          </Badge>
        </div>
        {report.details && (
          <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">
            {report.details}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
