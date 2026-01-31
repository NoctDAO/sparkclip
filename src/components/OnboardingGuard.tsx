import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingCheck } from "@/hooks/useOnboardingCheck";

interface OnboardingGuardProps {
  children: ReactNode;
}

// Routes that don't require onboarding completion
const EXEMPT_ROUTES = ["/auth", "/onboarding", "/reset-password"];

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { needsOnboarding, loading: onboardingLoading } = useOnboardingCheck();
  const location = useLocation();

  // Check if current route is exempt
  const isExemptRoute = EXEMPT_ROUTES.some((route) => 
    location.pathname.startsWith(route)
  );

  // Show loading while checking auth/onboarding status
  if (authLoading || onboardingLoading) {
    return (
      <div className="min-h-[var(--app-height)] bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      </div>
    );
  }

  // If user is logged in, needs onboarding, and not on exempt route
  if (user && needsOnboarding && !isExemptRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  // If user is on onboarding page but doesn't need it
  if (user && !needsOnboarding && location.pathname === "/onboarding") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
