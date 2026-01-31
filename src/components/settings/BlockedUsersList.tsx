import { useState } from "react";
import { Ban, UserX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { useToast } from "@/hooks/use-toast";

export function BlockedUsersList() {
  const { blockedUsers, loading, unblockUser } = useBlockedUsers();
  const { toast } = useToast();
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [confirmUnblock, setConfirmUnblock] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleUnblock = async () => {
    if (!confirmUnblock) return;

    setUnblockingId(confirmUnblock.id);
    const success = await unblockUser(confirmUnblock.id);

    if (success) {
      toast({ title: `Unblocked ${confirmUnblock.name}` });
    } else {
      toast({ title: "Failed to unblock user", variant: "destructive" });
    }

    setUnblockingId(null);
    setConfirmUnblock(null);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (blockedUsers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
          <Ban className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No blocked accounts</p>
        <p className="text-sm text-muted-foreground mt-1">
          Accounts you block will appear here
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-border">
        {blockedUsers.map((blocked) => {
          const displayName =
            blocked.profile?.display_name ||
            blocked.profile?.username ||
            "Unknown user";
          const username = blocked.profile?.username;

          return (
            <div
              key={blocked.id}
              className="flex items-center gap-3 p-3 hover:bg-secondary/30 transition-colors"
            >
              <Avatar className="w-10 h-10">
                <AvatarImage src={blocked.profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10">
                  {displayName[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{displayName}</p>
                {username && (
                  <p className="text-sm text-muted-foreground truncate">
                    @{username}
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setConfirmUnblock({
                    id: blocked.blocked_user_id,
                    name: displayName,
                  })
                }
                disabled={unblockingId === blocked.blocked_user_id}
              >
                {unblockingId === blocked.blocked_user_id ? (
                  "..."
                ) : (
                  <>
                    <UserX className="w-4 h-4 mr-1" />
                    Unblock
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <AlertDialog
        open={!!confirmUnblock}
        onOpenChange={() => setConfirmUnblock(null)}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock {confirmUnblock?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will be able to find your profile and videos, follow you, and
              send you messages again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary border-none">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblock}>Unblock</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
