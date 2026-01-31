import { useState, useEffect } from "react";
import { Check, X, RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface Appeal {
  id: string;
  user_id: string;
  content_type: string;
  content_id: string;
  reason: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_note: string | null;
  created_at: string;
  user?: {
    username: string | null;
    avatar_url: string | null;
  };
}

export function AppealsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: "approve" | "reject" | null;
  }>({ open: false, action: null });
  const [reviewerNote, setReviewerNote] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchAppeals();
  }, []);

  const fetchAppeals = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("appeals")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching appeals:", error);
      setLoading(false);
      return;
    }

    // Fetch user profiles
    const userIds = [...new Set((data || []).map((a) => a.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    setAppeals(
      (data || []).map((a) => ({
        ...a,
        user: profileMap.get(a.user_id),
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
    if (!selectedAppeal || !actionDialog.action || !user) return;

    setProcessing(true);

    try {
      const { action } = actionDialog;
      const newStatus = action === "approve" ? "approved" : "rejected";

      // Update appeal status
      const { error: appealError } = await supabase
        .from("appeals")
        .update({
          status: newStatus,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          reviewer_note: reviewerNote || null,
        })
        .eq("id", selectedAppeal.id);

      if (appealError) throw appealError;

      // If approved, restore the content
      if (action === "approve") {
        if (selectedAppeal.content_type === "video") {
          const { error } = await supabase
            .from("videos")
            .update({
              visibility: "public",
              moderation_note: null,
              moderated_by: null,
              moderated_at: null,
            })
            .eq("id", selectedAppeal.content_id);
          if (error) throw error;
        }
        // Note: Comments can't be "hidden", only deleted, so we can't restore them

        await logAdminAction("approve_appeal", "appeal", selectedAppeal.id, {
          content_type: selectedAppeal.content_type,
          content_id: selectedAppeal.content_id,
          note: reviewerNote,
        });

        toast({
          title: "Appeal approved",
          description: "The content has been restored",
        });
      } else {
        await logAdminAction("reject_appeal", "appeal", selectedAppeal.id, {
          content_type: selectedAppeal.content_type,
          content_id: selectedAppeal.content_id,
          note: reviewerNote,
        });

        toast({
          title: "Appeal rejected",
          description: "The moderation decision has been upheld",
        });
      }

      await fetchAppeals();
      setSelectedAppeal(null);
      setActionDialog({ open: false, action: null });
      setReviewerNote("");
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

  const pendingAppeals = appeals.filter((a) => a.status === "pending");
  const reviewedAppeals = appeals.filter((a) => a.status !== "pending");

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
            Pending ({pendingAppeals.length})
          </TabsTrigger>
          <TabsTrigger value="reviewed" className="flex-1">
            Reviewed ({reviewedAppeals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pendingAppeals.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Check className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>No pending appeals</p>
              </CardContent>
            </Card>
          ) : (
            pendingAppeals.map((appeal) => (
              <AppealCard
                key={appeal.id}
                appeal={appeal}
                onClick={() => setSelectedAppeal(appeal)}
                isSelected={selectedAppeal?.id === appeal.id}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="reviewed" className="mt-4 space-y-3">
          {reviewedAppeals.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <p>No reviewed appeals</p>
              </CardContent>
            </Card>
          ) : (
            reviewedAppeals.map((appeal) => (
              <AppealCard
                key={appeal.id}
                appeal={appeal}
                onClick={() => setSelectedAppeal(appeal)}
                isSelected={selectedAppeal?.id === appeal.id}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Appeal Detail Dialog */}
      <Dialog
        open={!!selectedAppeal}
        onOpenChange={(open) => !open && setSelectedAppeal(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary" />
              Appeal Details
            </DialogTitle>
          </DialogHeader>

          {selectedAppeal && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={selectedAppeal.user?.avatar_url || undefined} />
                  <AvatarFallback>
                    {(selectedAppeal.user?.username || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">@{selectedAppeal.user?.username || "unknown"}</p>
                  <p className="text-sm text-muted-foreground">
                    Submitted {formatDistanceToNow(new Date(selectedAppeal.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Badge variant="outline">{selectedAppeal.content_type}</Badge>
                <Badge
                  variant={
                    selectedAppeal.status === "pending"
                      ? "secondary"
                      : selectedAppeal.status === "approved"
                      ? "default"
                      : "destructive"
                  }
                >
                  {selectedAppeal.status}
                </Badge>
              </div>

              <div className="bg-secondary/50 p-3 rounded-md">
                <p className="text-sm font-medium mb-1">Appeal reason</p>
                <p className="text-sm text-muted-foreground">{selectedAppeal.reason}</p>
              </div>

              {selectedAppeal.reviewer_note && (
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm font-medium mb-1">Reviewer note</p>
                  <p className="text-sm text-muted-foreground">{selectedAppeal.reviewer_note}</p>
                </div>
              )}

              {selectedAppeal.status === "pending" && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setActionDialog({ open: true, action: "reject" })}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => setActionDialog({ open: true, action: "approve" })}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Approve & Restore
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Confirmation */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => !open && setActionDialog({ open: false, action: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "approve" ? "Approve Appeal?" : "Reject Appeal?"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === "approve"
                ? "This will restore the moderated content and mark the appeal as approved."
                : "This will uphold the moderation decision and mark the appeal as rejected."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reviewer-note">Response to user (optional)</Label>
            <Textarea
              id="reviewer-note"
              placeholder="Add a note explaining your decision..."
              value={reviewerNote}
              onChange={(e) => setReviewerNote(e.target.value)}
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
              variant={actionDialog.action === "reject" ? "destructive" : "default"}
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

function AppealCard({
  appeal,
  onClick,
  isSelected,
}: {
  appeal: Appeal;
  onClick: () => void;
  isSelected: boolean;
}) {
  return (
    <Card
      className={`cursor-pointer transition-colors hover:bg-secondary/50 ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={appeal.user?.avatar_url || undefined} />
              <AvatarFallback>
                {(appeal.user?.username || "U")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  @{appeal.user?.username || "unknown"}
                </span>
                <Badge variant="outline" className="text-xs">
                  {appeal.content_type}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {appeal.reason}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(appeal.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <Badge
            variant={
              appeal.status === "pending"
                ? "secondary"
                : appeal.status === "approved"
                ? "default"
                : "destructive"
            }
          >
            {appeal.status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
