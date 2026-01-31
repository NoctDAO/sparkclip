import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");

interface ChangeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
}

export function ChangeEmailDialog({
  open,
  onOpenChange,
  currentEmail,
}: ChangeEmailDialogProps) {
  const { toast } = useToast();
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    // Validate email format
    const validation = emailSchema.safeParse(newEmail);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    // Check emails match
    if (newEmail !== confirmEmail) {
      setError("Email addresses do not match");
      return;
    }

    // Check it's different from current
    if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      setError("New email must be different from current email");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Verification email sent",
        description: "Please check your new email inbox to confirm the change",
      });
      
      onOpenChange(false);
      setNewEmail("");
      setConfirmEmail("");
    } catch (err) {
      console.error("Email update error:", err);
      setError(err instanceof Error ? err.message : "Failed to update email");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setNewEmail("");
    setConfirmEmail("");
    setError("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Email Address</DialogTitle>
          <DialogDescription>
            Enter your new email address. You'll receive a confirmation link at both your current and new email addresses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Current email</Label>
            <p className="text-sm font-medium">{currentEmail}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-email">New email address</Label>
            <Input
              id="new-email"
              type="email"
              placeholder="Enter new email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-email">Confirm new email</Label>
            <Input
              id="confirm-email"
              type="email"
              placeholder="Confirm new email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !newEmail || !confirmEmail}
          >
            {isSubmitting ? "Sending..." : "Update Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
