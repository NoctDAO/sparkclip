import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface BlockedUser {
  id: string;
  blocked_user_id: string;
  created_at: string;
  profile: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useBlockedUsers() {
  const { user } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlockedUsers = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("blocked_users")
      .select("id, blocked_user_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching blocked users:", error);
      setLoading(false);
      return;
    }

    // Fetch profiles for blocked users
    if (data && data.length > 0) {
      const blockedUserIds = data.map((b) => b.blocked_user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", blockedUserIds);

      const profileMap = new Map(
        profiles?.map((p) => [p.user_id, p]) || []
      );

      const enriched: BlockedUser[] = data.map((b) => ({
        ...b,
        profile: profileMap.get(b.blocked_user_id) || null,
      }));

      setBlockedUsers(enriched);
    } else {
      setBlockedUsers([]);
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  const unblockUser = async (blockedUserId: string): Promise<boolean> => {
    if (!user?.id) return false;

    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("user_id", user.id)
      .eq("blocked_user_id", blockedUserId);

    if (error) {
      console.error("Error unblocking user:", error);
      return false;
    }

    setBlockedUsers((prev) =>
      prev.filter((b) => b.blocked_user_id !== blockedUserId)
    );
    return true;
  };

  const blockUser = async (blockedUserId: string): Promise<boolean> => {
    if (!user?.id || user.id === blockedUserId) return false;

    const { error } = await supabase.from("blocked_users").insert({
      user_id: user.id,
      blocked_user_id: blockedUserId,
    });

    if (error) {
      console.error("Error blocking user:", error);
      return false;
    }

    // Refresh the list
    await fetchBlockedUsers();
    return true;
  };

  const isUserBlocked = (userId: string): boolean => {
    return blockedUsers.some((b) => b.blocked_user_id === userId);
  };

  return {
    blockedUsers,
    loading,
    blockUser,
    unblockUser,
    isUserBlocked,
    refetch: fetchBlockedUsers,
  };
}
