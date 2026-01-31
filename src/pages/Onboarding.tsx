import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Check, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AvatarUploader } from "@/components/settings/AvatarUploader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOnboardingCheck } from "@/hooks/useOnboardingCheck";

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { refetch: refetchOnboardingStatus } = useOnboardingCheck();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/auth");
      return;
    }

    // Fetch existing profile data if any
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        // If already completed onboarding, redirect to home
        if (data.onboarding_completed && data.username && data.display_name) {
          navigate("/");
          return;
        }
        setDisplayName(data.display_name || "");
        setUsername(data.username || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user, authLoading, navigate]);

  const checkUsernameAvailability = useCallback(
    async (newUsername: string) => {
      if (!newUsername || newUsername.length < 3) {
        setUsernameError("Username must be at least 3 characters");
        return false;
      }

      if (!/^[a-z0-9_]+$/.test(newUsername)) {
        setUsernameError("Only lowercase letters, numbers, and underscores");
        return false;
      }

      setCheckingUsername(true);
      const { data } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", newUsername)
        .neq("user_id", user?.id || "")
        .maybeSingle();

      setCheckingUsername(false);

      if (data) {
        setUsernameError("Username is already taken");
        return false;
      }

      setUsernameError("");
      return true;
    },
    [user?.id]
  );

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(value);
    if (value.length >= 3) {
      checkUsernameAvailability(value);
    } else {
      setUsernameError(value.length > 0 ? "Username must be at least 3 characters" : "");
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    // Validate required fields
    if (!displayName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your display name",
        variant: "destructive",
      });
      return;
    }

    if (!username.trim() || username.length < 3) {
      toast({
        title: "Username required",
        description: "Please enter a valid username (at least 3 characters)",
        variant: "destructive",
      });
      return;
    }

    if (usernameError) {
      toast({
        title: "Invalid username",
        description: usernameError,
        variant: "destructive",
      });
      return;
    }

    // Double-check username availability
    const isAvailable = await checkUsernameAvailability(username);
    if (!isAvailable) return;

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        username: username.trim(),
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        onboarding_completed: true,
      })
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast({
        title: "Error saving profile",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Trigger refetch of onboarding status so guard updates immediately
      refetchOnboardingStatus();
      toast({
        title: "Welcome!",
        description: "Your profile has been set up successfully",
      });
      navigate("/");
    }
  };

  const handleAvatarChange = (url: string) => {
    setAvatarUrl(url);
  };

  const isValid = displayName.trim().length > 0 && username.length >= 3 && !usernameError;

  if (authLoading || loading) {
    return (
      <div className="min-h-[var(--app-height)] bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-[var(--app-height)] bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-center p-4 border-b border-border">
        <h1 className="font-bold text-lg">Set up your profile</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Welcome message */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Welcome!</h2>
          <p className="text-muted-foreground text-sm">
            Let's get your profile ready. This helps others find and recognize you.
          </p>
        </div>

        <div className="space-y-6 max-w-md mx-auto">
          {/* Avatar */}
          <AvatarUploader
            userId={user?.id || ""}
            currentAvatarUrl={avatarUrl}
            displayName={displayName}
            onAvatarChange={handleAvatarChange}
          />

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Display Name - Required */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-muted-foreground">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 30))}
                placeholder="Your display name"
                maxLength={30}
                className="bg-secondary border-none h-12"
              />
              <p className="text-xs text-muted-foreground text-right">
                {displayName.length}/30
              </p>
            </div>

            {/* Username - Required */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-muted-foreground">
                Username <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  @
                </span>
                <Input
                  id="username"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="username"
                  maxLength={20}
                  className="bg-secondary border-none h-12 pl-8"
                />
                {checkingUsername && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
                {!checkingUsername && username.length >= 3 && !usernameError && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
              </div>
              {usernameError && (
                <p className="text-xs text-destructive">{usernameError}</p>
              )}
            </div>

            {/* Bio - Optional */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-muted-foreground">
                Bio <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 80))}
                placeholder="Tell us about yourself"
                maxLength={80}
                rows={3}
                className="bg-secondary border-none resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {bio.length}/80
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with CTA */}
      <div className="p-6 border-t border-border">
        <Button
          onClick={handleComplete}
          disabled={saving || !isValid}
          className="w-full h-12 text-base font-semibold"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Setting up...
            </>
          ) : (
            "Get Started"
          )}
        </Button>
      </div>
    </div>
  );
}
