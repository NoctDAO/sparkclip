import { useState, useEffect } from "react";
import { Search, Shield, ShieldCheck, ShieldX, MoreHorizontal, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

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
}

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
    action: "verify" | "unverify" | "make_mod" | "remove_mod" | null;
  }>({ open: false, action: null });
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

    const rolesMap = new Map<string, string[]>();
    rolesData?.forEach((r) => {
      const existing = rolesMap.get(r.user_id) || [];
      rolesMap.set(r.user_id, [...existing, r.role]);
    });

    const usersWithRoles: UserProfile[] = (profiles || []).map((p) => ({
      ...p,
      roles: rolesMap.get(p.user_id) || [],
    }));

    setUsers(usersWithRoles);
    setFilteredUsers(usersWithRoles);
    setLoading(false);
  };

  const handleRoleAction = async () => {
    if (!selectedUser || !actionDialog.action || !currentUser) return;

    setProcessing(true);

    try {
      let roleToModify: AppRole | null = null;
      let isAdding = true;

      switch (actionDialog.action) {
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
      }

      if (roleToModify) {
        if (isAdding) {
          const { error } = await supabase.from("user_roles").insert({
            user_id: selectedUser.user_id,
            role: roleToModify,
            granted_by: currentUser.id,
          });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("user_roles")
            .delete()
            .eq("user_id", selectedUser.user_id)
            .eq("role", roleToModify);
          if (error) throw error;
        }
      }

      toast({
        title: "Role updated",
        description: `Successfully ${isAdding ? "granted" : "removed"} ${roleToModify} role`,
      });

      await fetchUsers();
      setActionDialog({ open: false, action: null });
      setSelectedUser(null);
    } catch (error) {
      console.error("Role action error:", error);
      toast({
        title: "Failed to update role",
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
                  <div className="flex items-center gap-2">
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
                  </div>
                  <p className="text-sm text-muted-foreground">
                    @{userProfile.username || "unknown"} • {userProfile.followers_count} followers
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Joined {formatDistanceToNow(new Date(userProfile.created_at), { addSuffix: true })}
                  </p>
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
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </div>

      {/* Action Confirmation Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => !open && setActionDialog({ open: false, action: null })}
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, action: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleRoleAction} disabled={processing}>
              {processing ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
