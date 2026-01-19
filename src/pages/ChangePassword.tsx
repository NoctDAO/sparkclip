import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const getPasswordStrength = (password: string): { label: string; color: string; width: string } => {
    if (password.length === 0) return { label: "", color: "", width: "0%" };
    if (password.length < 6) return { label: "Weak", color: "bg-destructive", width: "25%" };
    if (password.length < 8) return { label: "Fair", color: "bg-yellow-500", width: "50%" };
    if (password.length < 12 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { label: "Good", color: "bg-blue-500", width: "75%" };
    }
    if (password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) {
      return { label: "Strong", color: "bg-green-500", width: "100%" };
    }
    return { label: "Fair", color: "bg-yellow-500", width: "50%" };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handleSave = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setSaving(false);

    if (error) {
      toast({
        title: "Error updating password",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully",
      });
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-bold text-lg ml-2">Change password</h1>
      </header>

      <div className="p-6 space-y-6">
        {/* New Password */}
        <div className="space-y-2">
          <Label htmlFor="newPassword" className="text-muted-foreground">
            New password
          </Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="bg-secondary border-none h-12 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showNewPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {newPassword.length > 0 && (
            <div className="space-y-1">
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full ${passwordStrength.color} transition-all duration-300`}
                  style={{ width: passwordStrength.width }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Password strength: {passwordStrength.label}
              </p>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-muted-foreground">
            Confirm new password
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="bg-secondary border-none h-12 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {confirmPassword.length > 0 && newPassword !== confirmPassword && (
            <p className="text-xs text-destructive">Passwords don't match</p>
          )}
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving || newPassword.length < 6 || newPassword !== confirmPassword}
          className="w-full h-12 font-semibold"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            "Update password"
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Make sure your password is at least 6 characters long and includes a mix of letters, numbers, and symbols for better security.
        </p>
      </div>
    </div>
  );
}
