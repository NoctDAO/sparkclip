import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingStatus {
  needsOnboarding: boolean;
  loading: boolean;
}

export function useOnboardingCheck(): OnboardingStatus {
  const { user, loading: authLoading } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    const checkOnboardingStatus = async () => {
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
  }, [user, authLoading]);

  return { needsOnboarding, loading };
}
