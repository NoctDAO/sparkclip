import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface AppealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: "video" | "comment";
  contentId: string;
  onSuccess?: () => void;
}

export function AppealDialog({
  open,
  onOpenChange,
  contentType,
  contentId,
  onSuccess,
}: AppealDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason.trim()) return;

    setSubmitting(true);

    try {
      const { error } = await supabase.from("appeals").insert({
        user_id: user.id,
        content_type: contentType,
        content_id: contentId,
        reason: reason.trim(),
      });

      if (error) throw error;

      toast({
        title: "Appeal submitted",
        description: "Your appeal has been submitted for review",
      });

      setReason("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Appeal error:", error);
      toast({
        title: "Failed to submit appeal",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" />
            Appeal Moderation Decision
          </DialogTitle>
          <DialogDescription>
            If you believe your {contentType} was moderated incorrectly, you can submit an appeal explaining why.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appeal-reason">
              Why do you believe this decision was incorrect?
            </Label>
            <Textarea
              id="appeal-reason"
              placeholder="Explain your reasoning..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {reason.length}/1000
            </p>
          </div>

          <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
            <p>
              Appeals are reviewed by our moderation team. You'll be notified of the decision.
              Please be respectful and provide clear reasoning.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !reason.trim()}
          >
            {submitting ? "Submitting..." : "Submit Appeal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
