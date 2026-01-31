import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, EyeOff, CheckCircle } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<"request" | "reset" | "success">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if we have a recovery token in URL (redirected from email)
    const accessToken = searchParams.get("access_token");
    const type = searchParams.get("type");
    
    if (type === "recovery" || accessToken) {
      setMode("reset");
    }
  }, [searchParams]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Check your email",
        description: "We've sent you a password reset link.",
      });
      setMode("success");
    }

    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Password updated",
        description: "Your password has been reset successfully.",
      });
      navigate("/");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-[var(--app-height)] bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="flex items-center p-4">
        <button onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-1 flex flex-col px-8 pt-8">
        {mode === "request" && (
          <>
            <h1 className="text-2xl font-bold mb-2">Reset password</h1>
            <p className="text-muted-foreground mb-8">
              Enter your email and we'll send you a reset link
            </p>

            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-secondary border-none h-12"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 font-semibold"
              >
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </form>

            <p className="text-center mt-8 text-muted-foreground">
              Remember your password?{" "}
              <button
                onClick={() => navigate("/auth")}
                className="text-primary font-semibold hover:underline"
              >
                Log in
              </button>
            </p>
          </>
        )}

        {mode === "reset" && (
          <>
            <h1 className="text-2xl font-bold mb-2">Create new password</h1>
            <p className="text-muted-foreground mb-8">
              Enter your new password below
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-secondary border-none h-12 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-secondary border-none h-12"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 font-semibold"
              >
                {loading ? "Updating..." : "Update password"}
              </Button>
            </form>
          </>
        )}

        {mode === "success" && (
          <div className="flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-16 h-16 text-success mb-4" />
            <h1 className="text-2xl font-bold mb-2">Check your email</h1>
            <p className="text-muted-foreground mb-8">
              We've sent a password reset link to <strong>{email}</strong>. 
              Click the link in the email to reset your password.
            </p>
            <Button
              variant="secondary"
              onClick={() => navigate("/auth")}
              className="font-semibold"
            >
              Back to login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
