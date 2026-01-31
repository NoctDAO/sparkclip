import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AvatarUploader } from "@/components/settings/AvatarUploader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function EditProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!error && data) {
      setDisplayName(data.display_name || "");
      setUsername(data.username || "");
      setBio(data.bio || "");
      setAvatarUrl(data.avatar_url);
    }
    setLoading(false);
  };

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
      const { data, error } = await supabase
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

  const handleSave = async () => {
    if (!user) return;

    // Validate username
    if (usernameError || username.length < 3) {
      toast({
        title: "Invalid username",
        description: usernameError || "Username must be at least 3 characters",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        username: username.trim(),
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
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
      toast({
        title: "Profile updated",
        description: "Your changes have been saved",
      });
      navigate(-1);
    }
  };

  const handleAvatarChange = (url: string) => {
    setAvatarUrl(url);
  };

  if (loading) {
    return (
      <div className="min-h-[var(--app-height)] bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-[var(--app-height)] bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-bold text-lg">Edit profile</h1>
        <button
          onClick={handleSave}
          disabled={saving || !!usernameError}
          className="p-2 -mr-2 text-primary font-semibold disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Check className="w-6 h-6" />
          )}
        </button>
      </header>

      <div className="p-6 space-y-6">
        {/* Avatar */}
        <AvatarUploader
          userId={user?.id || ""}
          currentAvatarUrl={avatarUrl}
          displayName={displayName}
          onAvatarChange={handleAvatarChange}
        />

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-muted-foreground">
              Name
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

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-muted-foreground">
              Username
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
            </div>
            {usernameError && (
              <p className="text-xs text-destructive">{usernameError}</p>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-muted-foreground">
              Bio
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
  );
}
