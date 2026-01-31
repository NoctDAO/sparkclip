import { useNavigate } from "react-router-dom";
import { ArrowLeft, Globe, Lock, MessageCircle, Heart, Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrivacySettings, CommentPermission, MessagePermission } from "@/hooks/usePrivacySettings";
import { useToast } from "@/hooks/use-toast";

export default function Privacy() {
  const navigate = useNavigate();
  const { settings, loading, saving, updateSetting } = usePrivacySettings();
  const { toast } = useToast();

  const handleUpdate = async <K extends keyof typeof settings>(
    key: K,
    value: (typeof settings)[K]
  ) => {
    const success = await updateSetting(key, value);
    if (success) {
      toast({ title: "Setting updated" });
    } else {
      toast({ title: "Failed to update setting", variant: "destructive" });
    }
  };

  const permissionLabels = {
    everyone: "Everyone",
    followers: "Followers only",
    no_one: "No one",
  };

  return (
    <div className="min-h-[var(--app-height)] bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-bold text-lg ml-2">Privacy</h1>
        {saving && (
          <span className="ml-auto text-sm text-muted-foreground">Saving...</span>
        )}
      </header>

      <div className="py-4">
        {/* Account Visibility */}
        <div className="mb-6">
          <h2 className="px-4 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Account Visibility
          </h2>
          
          {loading ? (
            <div className="px-4 py-4">
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <div className="px-4 py-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {settings.is_private_account ? (
                  <Lock className="w-5 h-5 mt-0.5 text-muted-foreground" />
                ) : (
                  <Globe className="w-5 h-5 mt-0.5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">Private account</p>
                  <p className="text-sm text-muted-foreground">
                    Only approved followers can see your videos
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.is_private_account}
                onCheckedChange={(checked) => handleUpdate("is_private_account", checked)}
              />
            </div>
          )}
        </div>

        {/* Comment Controls */}
        <div className="mb-6">
          <h2 className="px-4 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Comments
          </h2>
          
          {loading ? (
            <div className="px-4 py-4">
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="px-4 py-4">
              <div className="flex items-start gap-3 mb-4">
                <MessageCircle className="w-5 h-5 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Who can comment on your videos</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Control who can leave comments
                  </p>
                  <RadioGroup
                    value={settings.comment_permission}
                    onValueChange={(value) => handleUpdate("comment_permission", value as CommentPermission)}
                    className="space-y-2"
                  >
                    {(["everyone", "followers", "no_one"] as const).map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`comment-${option}`} />
                        <Label htmlFor={`comment-${option}`} className="cursor-pointer">
                          {permissionLabels[option]}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Message Permissions */}
        <div className="mb-6">
          <h2 className="px-4 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Messages
          </h2>
          
          {loading ? (
            <div className="px-4 py-4">
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="px-4 py-4">
              <div className="flex items-start gap-3 mb-4">
                <MessageCircle className="w-5 h-5 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Who can send you messages</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Control who can start a conversation with you
                  </p>
                  <RadioGroup
                    value={settings.message_permission}
                    onValueChange={(value) => handleUpdate("message_permission", value as MessagePermission)}
                    className="space-y-2"
                  >
                    {(["everyone", "followers", "no_one"] as const).map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`message-${option}`} />
                        <Label htmlFor={`message-${option}`} className="cursor-pointer">
                          {permissionLabels[option]}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Activity Visibility */}
        <div className="mb-6">
          <h2 className="px-4 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Activity Visibility
          </h2>
          
          {loading ? (
            <div className="px-4 py-4 space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <>
              <div className="px-4 py-4 flex items-start justify-between gap-4 border-b border-border">
                <div className="flex items-start gap-3">
                  <Heart className="w-5 h-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Show liked videos</p>
                    <p className="text-sm text-muted-foreground">
                      Others can see the videos you've liked
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.show_liked_videos}
                  onCheckedChange={(checked) => handleUpdate("show_liked_videos", checked)}
                />
              </div>

              <div className="px-4 py-4 flex items-start justify-between gap-4 border-b border-border">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Show following list</p>
                    <p className="text-sm text-muted-foreground">
                      Others can see who you follow
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.show_following_list}
                  onCheckedChange={(checked) => handleUpdate("show_following_list", checked)}
                />
              </div>

              <div className="px-4 py-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Show followers list</p>
                    <p className="text-sm text-muted-foreground">
                      Others can see who follows you
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.show_followers_list}
                  onCheckedChange={(checked) => handleUpdate("show_followers_list", checked)}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
