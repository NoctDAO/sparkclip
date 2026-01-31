import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingStatus {
  needsOnboarding: boolean;
  loading: boolean;
  refetch: () => void;
}

export function useOnboardingCheck(): OnboardingStatus {
  const { user, loading: authLoading } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    const checkOnboardingStatus = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("onboarding_completed, username, display_name")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error checking onboarding status:", error);
          setNeedsOnboarding(false);
        } else {
          // User needs onboarding if not completed OR missing required fields
          const needsSetup = !data?.onboarding_completed || 
            !data?.username || 
            !data?.display_name;
          setNeedsOnboarding(needsSetup);
        }
      } catch (err) {
        console.error("Onboarding check failed:", err);
        setNeedsOnboarding(false);
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user, authLoading, refetchTrigger]);

  // Listen for profile updates to auto-refresh onboarding status
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("onboarding-profile-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Check if onboarding was just completed
          const newData = payload.new as { onboarding_completed?: boolean; username?: string; display_name?: string };
          if (newData.onboarding_completed && newData.username && newData.display_name) {
            setNeedsOnboarding(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { needsOnboarding, loading, refetch };
}
