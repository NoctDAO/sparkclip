import { useState, useEffect } from "react";
import { Search, Shield, ShieldCheck, ShieldX, MoreHorizontal, CheckCircle, Ban, UserX, Megaphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Database } from "@/integrations/supabase/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, addDays } from "date-fns";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  followers_count: number;
  created_at: string;
  roles: string[];
  ban?: {
    reason: string | null;
    expires_at: string | null;
    banned_at: string;
  } | null;
}

type ActionType = "verify" | "unverify" | "make_mod" | "remove_mod" | "make_advertiser" | "remove_advertiser" | "ban" | "unban";

const BAN_DURATIONS = [
  { value: "1", label: "1 day" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "permanent", label: "Permanent" },
];

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: ActionType | null;
  }>({ open: false, action: null });
  const [banDuration, setBanDuration] = useState("7");
  const [banReason, setBanReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (u) =>
            u.username?.toLowerCase().includes(query) ||
            u.display_name?.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    setLoading(true);

    // Fetch all profiles
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching users:", error);
      setLoading(false);
      return;
    }

    // Fetch all roles
    const { data: rolesData } = await supabase.from("user_roles").select("*");

    // Fetch all bans
    const { data: bansData } = await supabase.from("banned_users").select("*");

    const rolesMap = new Map<string, string[]>();
    rolesData?.forEach((r) => {
      const existing = rolesMap.get(r.user_id) || [];
      rolesMap.set(r.user_id, [...existing, r.role]);
    });

    const bansMap = new Map<string, { reason: string | null; expires_at: string | null; banned_at: string }>();
    bansData?.forEach((b) => {
      // Check if ban is still active
      const isExpired = b.expires_at && new Date(b.expires_at) < new Date();
      if (!isExpired) {
        bansMap.set(b.user_id, {
          reason: b.reason,
          expires_at: b.expires_at,
          banned_at: b.banned_at,
        });
      }
    });

    const usersWithRoles: UserProfile[] = (profiles || []).map((p) => ({
      ...p,
      roles: rolesMap.get(p.user_id) || [],
      ban: bansMap.get(p.user_id) || null,
    }));

    setUsers(usersWithRoles);
    setFilteredUsers(usersWithRoles);
    setLoading(false);
  };

  const logAdminAction = async (
    actionType: string,
    targetType: string,
    targetId: string,
    details?: Record<string, unknown>
  ) => {
    if (!currentUser) return;
    
    await supabase.from("admin_logs").insert([{
      admin_id: currentUser.id,
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      details: details || null,
    }] as any);
  };

  const handleRoleAction = async () => {
    if (!selectedUser || !actionDialog.action || !currentUser) return;

    setProcessing(true);

    try {
      const { action } = actionDialog;
      
      if (action === "ban") {
        const expiresAt = banDuration === "permanent" 
          ? null 
          : addDays(new Date(), parseInt(banDuration)).toISOString();
        
        const { error } = await supabase.from("banned_users").insert({
          user_id: selectedUser.user_id,
          banned_by: currentUser.id,
          reason: banReason || null,
          expires_at: expiresAt,
        });
        if (error) throw error;
        
        await logAdminAction("ban_user", "user", selectedUser.user_id, {
          reason: banReason,
          duration: banDuration,
          expires_at: expiresAt,
        });

        toast({
          title: "User banned",
          description: banDuration === "permanent" 
            ? "User has been permanently banned"
            : `User has been banned for ${banDuration} days`,
        });
      } else if (action === "unban") {
        const { error } = await supabase
          .from("banned_users")
          .delete()
          .eq("user_id", selectedUser.user_id);
        if (error) throw error;
        
        await logAdminAction("unban_user", "user", selectedUser.user_id);

        toast({
          title: "User unbanned",
          description: "The user can now access the platform again",
        });
      } else {
        let roleToModify: AppRole | null = null;
        let isAdding = true;

        switch (action) {
          case "verify":
            roleToModify = "verified";
            isAdding = true;
            break;
          case "unverify":
            roleToModify = "verified";
            isAdding = false;
            break;
          case "make_mod":
            roleToModify = "moderator";
            isAdding = true;
            break;
          case "remove_mod":
            roleToModify = "moderator";
            isAdding = false;
            break;
          case "make_advertiser":
            roleToModify = "advertiser";
            isAdding = true;
            break;
          case "remove_advertiser":
            roleToModify = "advertiser";
            isAdding = false;
            break;
        }

        if (roleToModify) {
          if (isAdding) {
            const { error } = await supabase.from("user_roles").insert({
              user_id: selectedUser.user_id,
              role: roleToModify,
              granted_by: currentUser.id,
            });
            if (error) throw error;
            
            await logAdminAction(`grant_${roleToModify}`, "user", selectedUser.user_id);
          } else {
            const { error } = await supabase
              .from("user_roles")
              .delete()
              .eq("user_id", selectedUser.user_id)
              .eq("role", roleToModify);
            if (error) throw error;
            
            await logAdminAction(`revoke_${roleToModify}`, "user", selectedUser.user_id);
          }

          toast({
            title: "Role updated",
            description: `Successfully ${isAdding ? "granted" : "removed"} ${roleToModify} role`,
          });
        }
      }

      await fetchUsers();
      setActionDialog({ open: false, action: null });
      setSelectedUser(null);
      setBanDuration("7");
      setBanReason("");
    } catch (error) {
      console.error("Action error:", error);
      toast({
        title: "Action failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getActionText = () => {
    switch (actionDialog.action) {
      case "verify":
        return { title: "Verify User", desc: "Grant verified badge to this user?" };
      case "unverify":
        return { title: "Remove Verification", desc: "Remove verified badge from this user?" };
      case "make_mod":
        return { title: "Make Moderator", desc: "Grant moderator permissions to this user?" };
      case "remove_mod":
        return { title: "Remove Moderator", desc: "Remove moderator permissions from this user?" };
      case "make_advertiser":
        return { title: "Grant Advertiser", desc: "Grant advertiser permissions to this user? They will be able to create ad campaigns." };
      case "remove_advertiser":
        return { title: "Remove Advertiser", desc: "Remove advertiser permissions from this user?" };
      case "ban":
        return { title: "Ban User", desc: "This will prevent the user from accessing the platform." };
      case "unban":
        return { title: "Unban User", desc: "This will restore the user's access to the platform." };
      default:
        return { title: "", desc: "" };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users List */}
      <div className="space-y-2">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No users found
          </div>
        ) : (
          filteredUsers.map((userProfile) => (
            <div
              key={userProfile.id}
              className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={userProfile.avatar_url || undefined} />
                  <AvatarFallback>
                    {(userProfile.username || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">
                      {userProfile.display_name || userProfile.username || "Unknown"}
                    </span>
                    {userProfile.roles.includes("verified") && (
                      <CheckCircle className="w-4 h-4 text-primary fill-primary" />
                    )}
                    {userProfile.roles.includes("admin") && (
                      <Badge variant="destructive" className="text-xs">Admin</Badge>
                    )}
                    {userProfile.roles.includes("moderator") && (
                      <Badge variant="secondary" className="text-xs">Mod</Badge>
                    )}
                    {userProfile.roles.includes("advertiser") && (
                      <Badge className="text-xs bg-amber-500/20 text-amber-600 border-amber-500/30">
                        <Megaphone className="w-3 h-3 mr-1" />
                        Advertiser
                      </Badge>
                    )}
                    {userProfile.ban && (
                      <Badge variant="destructive" className="text-xs">
                        <Ban className="w-3 h-3 mr-1" />
                        Banned
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    @{userProfile.username || "unknown"} • {userProfile.followers_count || 0} followers
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Joined {formatDistanceToNow(new Date(userProfile.created_at), { addSuffix: true })}
                  </p>
                  {userProfile.ban && (
                    <p className="text-xs text-destructive mt-1">
                      {userProfile.ban.expires_at 
                        ? `Ban expires ${formatDistanceToNow(new Date(userProfile.ban.expires_at), { addSuffix: true })}`
                        : "Permanently banned"}
                      {userProfile.ban.reason && ` • ${userProfile.ban.reason}`}
                    </p>
                  )}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {userProfile.roles.includes("verified") ? (
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedUser(userProfile);
                        setActionDialog({ open: true, action: "unverify" });
                      }}
                    >
                      <ShieldX className="w-4 h-4 mr-2" />
                      Remove Verification
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedUser(userProfile);
                        setActionDialog({ open: true, action: "verify" });
                      }}
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Verify User
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {userProfile.roles.includes("moderator") ? (
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedUser(userProfile);
                        setActionDialog({ open: true, action: "remove_mod" });
                      }}
                      className="text-destructive"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Remove Moderator
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedUser(userProfile);
                        setActionDialog({ open: true, action: "make_mod" });
                      }}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Make Moderator
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {userProfile.roles.includes("advertiser") ? (
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedUser(userProfile);
                        setActionDialog({ open: true, action: "remove_advertiser" });
                      }}
                      className="text-destructive"
                    >
                      <Megaphone className="w-4 h-4 mr-2" />
                      Remove Advertiser
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedUser(userProfile);
                        setActionDialog({ open: true, action: "make_advertiser" });
                      }}
                    >
                      <Megaphone className="w-4 h-4 mr-2" />
                      Grant Advertiser
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {userProfile.ban ? (
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedUser(userProfile);
                        setActionDialog({ open: true, action: "unban" });
                      }}
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      Unban User
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedUser(userProfile);
                        setActionDialog({ open: true, action: "ban" });
                      }}
                      className="text-destructive"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Ban User
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </div>

      {/* Action Confirmation Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog({ open: false, action: null });
            setBanDuration("7");
            setBanReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getActionText().title}</DialogTitle>
            <DialogDescription>{getActionText().desc}</DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="flex items-center gap-3 py-4">
              <Avatar>
                <AvatarImage src={selectedUser.avatar_url || undefined} />
                <AvatarFallback>
                  {(selectedUser.username || "U")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedUser.display_name || selectedUser.username}</p>
                <p className="text-sm text-muted-foreground">@{selectedUser.username}</p>
              </div>
            </div>
          )}

          {actionDialog.action === "ban" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ban-duration">Ban Duration</Label>
                <Select value={banDuration} onValueChange={setBanDuration}>
                  <SelectTrigger id="ban-duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BAN_DURATIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ban-reason">Reason (optional)</Label>
                <Textarea
                  id="ban-reason"
                  placeholder="Enter ban reason..."
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog({ open: false, action: null });
                setBanDuration("7");
                setBanReason("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRoleAction} 
              disabled={processing}
              variant={actionDialog.action === "ban" ? "destructive" : "default"}
            >
              {processing ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
