import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Lock,
  Bell,
  Shield,
  HelpCircle,
  FileText,
  LogOut,
  Trash2,
  BarChart3,
  ShieldAlert,
  Mail,
  Calendar,
  CheckCircle,
  Megaphone,
  DollarSign,
  Clock,
  EyeOff,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SettingsItem } from "@/components/settings/SettingsItem";
import { ChangeEmailDialog } from "@/components/settings/ChangeEmailDialog";
import { UiMarginSetting } from "@/components/settings/UiMarginSetting";
import { NavBarToggle } from "@/components/settings/NavBarToggle";
import { SoundPreferenceToggle } from "@/components/settings/SoundPreferenceToggle";
import { FeedPreferenceToggle } from "@/components/settings/FeedPreferenceToggle";
import { SeriesAutoPlayToggle } from "@/components/settings/SeriesAutoPlayToggle";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useWatchHistory } from "@/hooks/useWatchHistory";
import { useContentPreferences } from "@/hooks/useContentPreferences";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Profile {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, session, signOut } = useAuth();
  const { isAdmin, isModerator, isVerified, isAdvertiser } = useUserRoles(user?.id);
  const { clearHistory } = useWatchHistory();
  const { clearAllPreferences } = useContentPreferences();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [isClearingPrefs, setIsClearingPrefs] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user?.id]);

  const fetchProfile = async () => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (data) {
      setProfile(data);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out successfully" });
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    if (!session?.access_token) {
      toast({
        title: "Error",
        description: "You must be signed in to delete your account",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user-data`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete account");
      }

      toast({
        title: "Account deleted",
        description: "Your account and all data have been permanently deleted",
      });
      
      // Clear local state and redirect
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Delete account error:", error);
      toast({
        title: "Deletion failed",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleClearWatchHistory = async () => {
    setIsClearingHistory(true);
    const success = await clearHistory();
    setIsClearingHistory(false);
    if (success) {
      toast({ title: "Watch history cleared" });
    } else {
      toast({ title: "Failed to clear history", variant: "destructive" });
    }
  };

  const handleClearPreferences = async () => {
    setIsClearingPrefs(true);
    const success = await clearAllPreferences();
    setIsClearingPrefs(false);
    if (success) {
      toast({ title: "Content preferences reset" });
    } else {
      toast({ title: "Failed to reset preferences", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-[var(--app-height)] bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-bold text-lg ml-2">Settings</h1>
      </header>

      <div className="py-4">
        {/* User Info Card - Premium Design */}
        {user && (
          <div className="mx-4 mb-6 p-4 glass-card rounded-xl border-luminous">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-16 h-16 ring-2 ring-primary/30 shadow-lg">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-lg bg-gradient-to-br from-primary/20 to-primary/5">
                    {(profile?.display_name || profile?.username || user.email || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-success rounded-full border-2 border-background flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-success-foreground" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-lg truncate text-display">
                    {profile?.display_name || profile?.username || "User"}
                  </h2>
                  {isVerified && (
                    <Badge variant="secondary" className="shrink-0 bg-primary/10 text-primary border-primary/20">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {isAdmin && (
                    <Badge className="shrink-0 glow-primary-sm">Admin</Badge>
                  )}
                  {isModerator && !isAdmin && (
                    <Badge variant="outline" className="shrink-0 border-primary/30">Mod</Badge>
                  )}
                </div>
                {profile?.username && (
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-2 pt-3 border-t border-border/50">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="truncate">{user.email}</span>
                {user.email_confirmed_at && (
                  <Badge variant="outline" className="text-xs shrink-0 border-success/30 text-success">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <span>
                  Joined {user.created_at ? format(new Date(user.created_at), "MMMM d, yyyy") : "Unknown"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Account Section */}
        <div className="mb-6">
          <h2 className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Account
          </h2>
          <SettingsItem
            icon={User}
            label="Edit profile"
            description="Change photo, name, username, bio"
            onClick={() => navigate("/edit-profile")}
          />
          <SettingsItem
            icon={Mail}
            label="Change email"
            description={user?.email || "Update your email address"}
            onClick={() => setShowEmailDialog(true)}
          />
          <SettingsItem
            icon={Lock}
            label="Change password"
            description="Update your password"
            onClick={() => navigate("/settings/password")}
          />
          <SettingsItem
            icon={Shield}
            label="Privacy"
            description="Manage your privacy settings"
            onClick={() => navigate("/settings/privacy")}
          />
          <SettingsItem
            icon={BarChart3}
            label="Analytics"
            description="View your video performance"
            onClick={() => navigate("/analytics")}
          />
          <SettingsItem
            icon={DollarSign}
            label="Creator Earnings"
            description="View your ad revenue earnings"
            onClick={() => navigate("/earnings")}
          />
          {isAdmin && (
            <SettingsItem
              icon={Shield}
              label="Admin Dashboard"
              description="Manage users and content"
              onClick={() => navigate("/admin")}
            />
          )}
          {(isAdmin || isModerator) && (
            <SettingsItem
              icon={ShieldAlert}
              label="Moderation"
              description="Review reported content"
              onClick={() => navigate("/moderation")}
            />
          )}
          {isAdvertiser && (
            <SettingsItem
              icon={Megaphone}
              label="Advertiser Dashboard"
              description="Manage your ad campaigns"
              onClick={() => navigate("/advertiser")}
            />
          )}
        </div>

        {/* Display Section */}
        <div className="mb-6">
          <h2 className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Display
          </h2>
          <ThemeToggle />
          <NavBarToggle />
          <FeedPreferenceToggle />
          <UiMarginSetting />
        </div>

        {/* Playback Section */}
        <div className="mb-6">
          <h2 className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Playback
          </h2>
          <SoundPreferenceToggle />
          <SeriesAutoPlayToggle />
        </div>

        {/* Notifications Section */}
        <div className="mb-6">
          <h2 className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Notifications
          </h2>
          <SettingsItem
            icon={Bell}
            label="Push notifications"
            description="Manage notification preferences"
            onClick={() => toast({ title: "Coming soon" })}
          />
        </div>

        {/* Privacy & Data Section */}
        <div className="mb-6">
          <h2 className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Privacy & Data
          </h2>
          <SettingsItem
            icon={Clock}
            label="Clear watch history"
            description={isClearingHistory ? "Clearing..." : "Remove all watched videos from history"}
            onClick={handleClearWatchHistory}
          />
          <SettingsItem
            icon={EyeOff}
            label="Reset content preferences"
            description={isClearingPrefs ? "Resetting..." : "Clear 'not interested' data"}
            onClick={handleClearPreferences}
          />
        </div>

        {/* About Section */}
        <div className="mb-6">
          <h2 className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            About
          </h2>
          <SettingsItem
            icon={HelpCircle}
            label="Help center"
            onClick={() => toast({ title: "Coming soon" })}
          />
          <SettingsItem
            icon={FileText}
            label="Terms of Service"
            onClick={() => toast({ title: "Coming soon" })}
          />
          <SettingsItem
            icon={FileText}
            label="Privacy Policy"
            onClick={() => toast({ title: "Coming soon" })}
          />
        </div>

        {/* Danger Zone */}
        <div className="border-t border-border pt-4">
          <SettingsItem
            icon={LogOut}
            label="Log out"
            onClick={() => setShowLogoutDialog(true)}
            destructive
          />
          <SettingsItem
            icon={Trash2}
            label="Delete account"
            onClick={() => setShowDeleteDialog(true)}
            destructive
          />
        </div>

        {/* App Version */}
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">Version 1.0.0</p>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary border-none">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All your data, videos, and profile
              information will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary border-none">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Change Email Dialog */}
      {user?.email && (
        <ChangeEmailDialog
          open={showEmailDialog}
          onOpenChange={setShowEmailDialog}
          currentEmail={user.email}
        />
      )}
    </div>
  );
}
