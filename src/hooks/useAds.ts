import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Ad, AdSettings } from "@/types/ad";

export function useAds() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [settings, setSettings] = useState<AdSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAds = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .order("priority", { ascending: false });

      if (error) throw error;
      setAds((data || []) as Ad[]);
    } catch (error) {
      console.error("Failed to fetch ads:", error);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("ad_settings")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setSettings(data as AdSettings | null);
    } catch (error) {
      console.error("Failed to fetch ad settings:", error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAds(), fetchSettings()]);
      setLoading(false);
    };
    loadData();
  }, [fetchAds, fetchSettings]);

  const getActiveAds = useCallback(() => {
    const now = new Date();
    return ads.filter((ad) => {
      if (ad.status !== "active") return false;
      if (ad.start_date && new Date(ad.start_date) > now) return false;
      if (ad.end_date && new Date(ad.end_date) < now) return false;
      return true;
    });
  }, [ads]);

  return {
    ads,
    settings,
    loading,
    getActiveAds,
    refetch: () => Promise.all([fetchAds(), fetchSettings()]),
  };
}
