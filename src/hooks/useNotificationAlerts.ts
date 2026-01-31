import { useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Notification } from "@/types/video";

interface UseNotificationAlertsOptions {
  enabled?: boolean;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
}

export function useNotificationAlerts(
  notifications: Notification[],
  options: UseNotificationAlertsOptions = {}
) {
  const { enabled = true, soundEnabled = true, vibrationEnabled = true } = options;
  const { toast } = useToast();
  const previousCountRef = useRef<number>(0);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    // Create a simple notification sound using Web Audio API
    audioRef.current = new Audio();
    audioRef.current.volume = 0.3;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;

    // Use Web Audio API to create a simple notification tone
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch {
      // Audio not supported or blocked
    }
  }, [soundEnabled]);

  const vibrate = useCallback(() => {
    if (!vibrationEnabled) return;

    if ("vibrate" in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  }, [vibrationEnabled]);

  const getNotificationMessage = useCallback((notification: Notification): string => {
    const actorName = notification.actor?.display_name || notification.actor?.username || "Someone";

    switch (notification.type) {
      case "like":
        return `${actorName} liked your video`;
      case "comment_like":
        return `${actorName} liked your comment`;
      case "reply":
        return `${actorName} replied to your comment`;
      case "mention":
        return `${actorName} mentioned you`;
      case "follow":
        return `${actorName} started following you`;
      default:
        return `${actorName} interacted with you`;
    }
  }, []);

  const showToastNotification = useCallback((notification: Notification) => {
    const message = getNotificationMessage(notification);

    toast({
      title: getNotificationTitle(notification.type),
      description: message,
      duration: 4000,
    });
  }, [toast, getNotificationMessage]);

  // Watch for new notifications
  useEffect(() => {
    if (!enabled || notifications.length === 0) {
      previousCountRef.current = notifications.length;
      return;
    }

    // Find truly new notifications (not seen before)
    const newNotifications = notifications.filter(
      (n) => !seenIdsRef.current.has(n.id) && !n.is_read
    );

    if (newNotifications.length > 0 && previousCountRef.current > 0) {
      // Only alert for the most recent new notification
      const latestNotification = newNotifications[0];

      playNotificationSound();
      vibrate();
      showToastNotification(latestNotification);
    }

    // Update seen IDs
    notifications.forEach((n) => seenIdsRef.current.add(n.id));
    previousCountRef.current = notifications.length;
  }, [notifications, enabled, playNotificationSound, vibrate, showToastNotification]);

  return null;
}

function getNotificationTitle(type: Notification["type"]): string {
  switch (type) {
    case "like":
    case "comment_like":
      return "❤️ New Like";
    case "reply":
      return "💬 New Reply";
    case "mention":
      return "📢 You were mentioned";
    case "follow":
      return "👋 New Follower";
    default:
      return "🔔 New Activity";
  }
}
