import { useState } from "react";
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
} from "lucide-react";
import { SettingsItem } from "@/components/settings/SettingsItem";
import { UiMarginSetting } from "@/components/settings/UiMarginSetting";
import { NavBarToggle } from "@/components/settings/NavBarToggle";
import { SoundPreferenceToggle } from "@/components/settings/SoundPreferenceToggle";
import { FeedPreferenceToggle } from "@/components/settings/FeedPreferenceToggle";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useToast } from "@/hooks/use-toast";
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

export default function Settings() {
  const navigate = useNavigate();
  const { user, session, signOut } = useAuth();
  const { isAdmin, isModerator } = useUserRoles(user?.id);
  const { toast } = useToast();

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
        {/* Account Section */}
        <div className="mb-6">
          <h2 className="px-4 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Account
          </h2>
          <SettingsItem
            icon={User}
            label="Edit profile"
            description="Change photo, name, username, bio"
            onClick={() => navigate("/edit-profile")}
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
            onClick={() => toast({ title: "Coming soon" })}
          />
          <SettingsItem
            icon={BarChart3}
            label="Analytics"
            description="View your video performance"
            onClick={() => navigate("/analytics")}
          />
          {(isAdmin || isModerator) && (
            <SettingsItem
              icon={ShieldAlert}
              label="Moderation"
              description="Review reported content"
              onClick={() => navigate("/moderation")}
            />
          )}
        </div>

        {/* Display Section */}
        <div className="mb-6">
          <h2 className="px-4 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Display
          </h2>
          <ThemeToggle />
          <NavBarToggle />
          <FeedPreferenceToggle />
          <UiMarginSetting />
        </div>

        {/* Sound Section */}
        <div className="mb-6">
          <h2 className="px-4 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Sound
          </h2>
          <SoundPreferenceToggle />
        </div>

        {/* Notifications Section */}
        <div className="mb-6">
          <h2 className="px-4 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Notifications
          </h2>
          <SettingsItem
            icon={Bell}
            label="Push notifications"
            description="Manage notification preferences"
            onClick={() => toast({ title: "Coming soon" })}
          />
        </div>

        {/* About Section */}
        <div className="mb-6">
          <h2 className="px-4 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
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
    </div>
  );
}
