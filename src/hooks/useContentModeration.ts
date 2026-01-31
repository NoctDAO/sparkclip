import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ModerationResult {
  safe: boolean;
  blocked: boolean;
  issues: string[];
  confidence: number;
  flag_type: string | null;
}

interface ModerationRequest {
  content: string;
  content_type: "video" | "comment";
  content_id: string;
}

export function useContentModeration() {
  const [isLoading, setIsLoading] = useState(false);

  const moderateContent = useCallback(async (
    request: ModerationRequest
  ): Promise<ModerationResult> => {
    // Skip moderation for empty content
    if (!request.content.trim()) {
      return {
        safe: true,
        blocked: false,
        issues: [],
        confidence: 0,
        flag_type: null,
      };
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("moderate-content", {
        body: {
          content: request.content,
          content_type: request.content_type,
          content_id: request.content_id,
        },
      });

      if (error) {
        console.error("Moderation error:", error);
        // Fail open - allow content if moderation fails
        return {
          safe: true,
          blocked: false,
          issues: [],
          confidence: 0,
          flag_type: null,
        };
      }

      return {
        safe: data.safe ?? true,
        blocked: data.blocked ?? false,
        issues: data.issues ?? [],
        confidence: data.confidence ?? 0,
        flag_type: data.flag_type ?? null,
      };
    } catch (err) {
      console.error("Moderation request failed:", err);
      // Fail open - allow content if moderation fails
      return {
        safe: true,
        blocked: false,
        issues: [],
        confidence: 0,
        flag_type: null,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { moderateContent, isLoading };
}
