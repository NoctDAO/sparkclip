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
      // Use secure function that doesn't expose banned_by field
      const { data, error } = await supabase
        .rpc("get_my_ban_status");

      if (error) {
        console.error("Error checking ban status:", error);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const ban = data[0];
        setIsBanned(true);
        setBanInfo({
          reason: ban.reason,
          expires_at: ban.expires_at,
          banned_at: ban.banned_at,
        });
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
