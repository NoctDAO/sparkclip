import { useNotifications } from "@/hooks/useNotifications";
import { useNotificationAlerts } from "@/hooks/useNotificationAlerts";
import { useAuth } from "@/hooks/useAuth";
import { ReactNode } from "react";

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user } = useAuth();
  const { notifications } = useNotifications();

  // Only enable alerts when user is logged in
  useNotificationAlerts(notifications, {
    enabled: !!user,
    soundEnabled: true,
    vibrationEnabled: true,
  });

  return <>{children}</>;
}
