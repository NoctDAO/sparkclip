import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BanInfo {
  reason: string | null;
  expires_at: string | null;
  banned_at: string;
}

export function useBanStatus(userId: string | undefined) {
  const [isBanned, setIsBanned] = useState(false);
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsBanned(false);
      setBanInfo(null);
      setLoading(false);
      return;
    }

    const checkBanStatus = async () => {
      const { data, error } = await supabase
        .from("banned_users")
        .select("reason, expires_at, banned_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error checking ban status:", error);
        setLoading(false);
        return;
      }

      if (data) {
        // Check if ban is expired
        const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
        
        if (isExpired) {
          // Ban has expired, delete it
          await supabase
            .from("banned_users")
            .delete()
            .eq("user_id", userId);
          
          setIsBanned(false);
          setBanInfo(null);
        } else {
          setIsBanned(true);
          setBanInfo({
            reason: data.reason,
            expires_at: data.expires_at,
            banned_at: data.banned_at,
          });
        }
      } else {
        setIsBanned(false);
        setBanInfo(null);
      }

      setLoading(false);
    };

    checkBanStatus();
  }, [userId]);

  return { isBanned, banInfo, loading };
}
