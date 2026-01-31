import { useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface RateLimitConfig {
  maxActions: number;
  windowMs: number;
  actionName?: string;
}

const defaultConfigs: Record<string, RateLimitConfig> = {
  like: { maxActions: 10, windowMs: 10000, actionName: "like" },
  comment: { maxActions: 5, windowMs: 30000, actionName: "comment" },
  follow: { maxActions: 10, windowMs: 60000, actionName: "follow" },
  default: { maxActions: 20, windowMs: 60000, actionName: "action" },
};

export function useRateLimit(actionType: keyof typeof defaultConfigs = "default") {
  const { toast } = useToast();
  const actionsRef = useRef<number[]>([]);
  const config = defaultConfigs[actionType] || defaultConfigs.default;

  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Remove expired timestamps
    actionsRef.current = actionsRef.current.filter((time) => time > windowStart);

    if (actionsRef.current.length >= config.maxActions) {
      const oldestAction = actionsRef.current[0];
      const waitTime = Math.ceil((oldestAction + config.windowMs - now) / 1000);

      toast({
        title: "Slow down!",
        description: `Too many ${config.actionName}s. Please wait ${waitTime} seconds.`,
        variant: "destructive",
      });
      return false;
    }

    actionsRef.current.push(now);
    return true;
  }, [config, toast]);

  const resetLimit = useCallback(() => {
    actionsRef.current = [];
  }, []);

  return { checkRateLimit, resetLimit };
}
