import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "moderator" | "verified";

interface UserRole {
  role: AppRole;
  granted_at: string;
}

export function useUserRoles(userId: string | undefined) {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const fetchRoles = async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, granted_at")
        .eq("user_id", userId);

      if (!error && data) {
        // Cast the role strings to AppRole type
        setRoles((data as UserRole[]).map((r) => r.role));
      }
      setLoading(false);
    };

    fetchRoles();
  }, [userId]);

  const isVerified = roles.includes("verified");
  const isAdmin = roles.includes("admin");
  const isModerator = roles.includes("moderator");

  return { roles, isVerified, isAdmin, isModerator, loading };
}
