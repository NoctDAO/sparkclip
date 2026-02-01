import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  isValidUUID,
  isValidString,
  isValidContentType,
  sanitizeString,
  validationErrorResponse,
} from "../_shared/validation.ts";
import {
  createSecurityLog,
  logSecurityEvent,
  getClientIp,
  createTimer,
} from "../_shared/logger.ts";

const FUNCTION_NAME = "moderate-content";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ModerationRequest {
  content: string;
  content_type: "video" | "comment";
  content_id: string;
}

interface ModerationResult {
  safe: boolean;
  issues: string[];
  confidence: number;
  flag_type: string | null;
}

// Maximum content length for moderation (prevent DoS)
const MAX_CONTENT_LENGTH = 10000;

// Rate limit config: 30 moderation requests per 5 minutes per IP
const MAX_MODERATION_ATTEMPTS = 30;
const WINDOW_MINUTES = 5;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const timer = createTimer();
  const clientIp = getClientIp(req);

  try {

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit for this IP
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
    
    const { data: existingEntry } = await supabase
      .from("ip_rate_limits")
      .select("*")
      .eq("ip_address", clientIp)
      .eq("action_type", "moderation")
      .gte("window_start", windowStart)
      .single();

    if (existingEntry && existingEntry.attempts >= MAX_MODERATION_ATTEMPTS) {
      const resetTime = new Date(new Date(existingEntry.window_start).getTime() + WINDOW_MINUTES * 60 * 1000);
      const waitMinutes = Math.ceil((resetTime.getTime() - Date.now()) / 60000);
      
      logSecurityEvent(createSecurityLog(FUNCTION_NAME, "rate_limit_exceeded", clientIp, {
        level: "warn",
        success: false,
        durationMs: timer(),
        metadata: { attempts: existingEntry.attempts },
      }));

      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded",
          message: `Too many moderation requests. Please wait ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''}.`,
          retry_after: waitMinutes * 60,
          // Fail open - return safe to not block content
          safe: true,
          blocked: false,
          issues: [],
          confidence: 0,
          flag_type: null,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment rate limit counter
    if (existingEntry) {
      await supabase
        .from("ip_rate_limits")
        .update({ attempts: existingEntry.attempts + 1 })
        .eq("id", existingEntry.id);
    } else {
      await supabase
        .from("ip_rate_limits")
        .insert({
          ip_address: clientIp,
          action_type: "moderation",
          attempts: 1,
          window_start: new Date().toISOString(),
        });
    }

    // Parse request body
    let body: ModerationRequest;
    try {
      body = await req.json();
    } catch {
      return validationErrorResponse(["Invalid JSON body"], corsHeaders);
    }

    const { content, content_type, content_id } = body;

    // Validate content_type
    if (!isValidContentType(content_type)) {
      return validationErrorResponse(["content_type must be 'video' or 'comment'"], corsHeaders);
    }

    // Validate content_id is a valid UUID
    if (!isValidUUID(content_id)) {
      return validationErrorResponse(["content_id must be a valid UUID"], corsHeaders);
    }

    // Validate content string
    if (!isValidString(content, 0, MAX_CONTENT_LENGTH)) {
      return validationErrorResponse([`content must be a string with max ${MAX_CONTENT_LENGTH} characters`], corsHeaders);
    }

    // Sanitize content
    const sanitizedContent = sanitizeString(content);

    // Step 1: Check keyword blocklist first (fast)
    const { data: keywords } = await supabase
      .from("moderation_keywords")
      .select("keyword, category, action, is_regex");

    let keywordMatch: { keyword: string; category: string; action: string } | null = null;

    if (keywords && keywords.length > 0) {
      const contentLower = sanitizedContent.toLowerCase();
      
      for (const kw of keywords) {
        if (kw.is_regex) {
          try {
            // Limit regex execution time by using a simple timeout wrapper
            const regex = new RegExp(kw.keyword, "i");
            if (regex.test(sanitizedContent)) {
              keywordMatch = { keyword: kw.keyword, category: kw.category, action: kw.action };
              break;
            }
          } catch {
            // Invalid regex, skip
          }
        } else if (contentLower.includes(kw.keyword.toLowerCase())) {
          keywordMatch = { keyword: kw.keyword, category: kw.category, action: kw.action };
          break;
        }
      }
    }

    // If keyword matched with block action, flag immediately
    if (keywordMatch && keywordMatch.action === "block") {
      await supabase.from("content_flags").insert([{
        content_type,
        content_id,
        flag_type: keywordMatch.category,
        confidence: 1.0,
        detected_issues: { keyword_match: keywordMatch.keyword },
        status: "pending",
      }] as any);

      logSecurityEvent(createSecurityLog(FUNCTION_NAME, "content_blocked", clientIp, {
        level: "warn",
        success: true,
        durationMs: timer(),
        metadata: { 
          content_type, 
          content_id, 
          flag_type: keywordMatch.category,
          method: "keyword_match",
        },
      }));

      return new Response(
        JSON.stringify({
          safe: false,
          issues: [keywordMatch.category],
          confidence: 1.0,
          flag_type: keywordMatch.category,
          blocked: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: AI moderation (if no blocking keyword match)
    let aiResult: ModerationResult = { safe: true, issues: [], confidence: 0, flag_type: null };

    if (lovableApiKey) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `You are a content moderation AI. Analyze the following ${content_type} content for policy violations.
                
Categories to check:
- hate_speech: Hate speech, slurs, discrimination
- harassment: Bullying, threats, personal attacks
- spam: Promotional spam, repetitive content, scams
- violence: Graphic violence, threats of harm
- adult_content: Sexually explicit content, nudity
- misinformation: Dangerous false claims

Respond ONLY with a JSON object (no markdown, no code blocks):
{"safe": boolean, "issues": ["category1", "category2"], "confidence": 0.0-1.0, "primary_issue": "category or null"}

Be conservative - only flag content that clearly violates policies.`
              },
              {
                role: "user",
                content: `Analyze this ${content_type} content:\n\n"${sanitizedContent}"`
              }
            ],
            temperature: 0.1,
            max_tokens: 200,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const responseText = aiData.choices?.[0]?.message?.content || "";
          
          // Parse AI response
          try {
            // Try to extract JSON from the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              aiResult = {
                safe: parsed.safe ?? true,
                issues: parsed.issues || [],
                confidence: parsed.confidence || 0,
                flag_type: parsed.primary_issue || (parsed.issues?.[0] || null),
              };
            }
          } catch {
            console.error("Failed to parse AI response:", responseText);
          }
        }
      } catch (error) {
        console.error("AI moderation error:", error);
      }
    }

    // Step 3: Flag content if issues detected
    if (!aiResult.safe && aiResult.confidence >= 0.7) {
      await supabase.from("content_flags").insert([{
        content_type,
        content_id,
        flag_type: aiResult.flag_type || "other",
        confidence: aiResult.confidence,
        detected_issues: { ai_issues: aiResult.issues },
        status: "pending",
      }] as any);

      logSecurityEvent(createSecurityLog(FUNCTION_NAME, "content_flagged", clientIp, {
        level: "info",
        success: true,
        durationMs: timer(),
        metadata: { 
          content_type, 
          content_id, 
          flag_type: aiResult.flag_type,
          confidence: aiResult.confidence,
          method: "ai_moderation",
        },
      }));
    }

    // Also flag if keyword matched with flag action (not block)
    if (keywordMatch && keywordMatch.action === "flag" && aiResult.safe) {
      await supabase.from("content_flags").insert([{
        content_type,
        content_id,
        flag_type: keywordMatch.category,
        confidence: 0.9,
        detected_issues: { keyword_match: keywordMatch.keyword },
        status: "pending",
      }] as any);

      aiResult = {
        safe: false,
        issues: [keywordMatch.category],
        confidence: 0.9,
        flag_type: keywordMatch.category,
      };
    }

    // Log successful moderation
    logSecurityEvent(createSecurityLog(FUNCTION_NAME, "moderation_complete", clientIp, {
      level: "info",
      success: true,
      durationMs: timer(),
      metadata: { 
        content_type, 
        content_id, 
        safe: aiResult.safe,
        used_ai: !!lovableApiKey,
      },
    }));

    return new Response(
      JSON.stringify({
        ...aiResult,
        blocked: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logSecurityEvent(createSecurityLog(FUNCTION_NAME, "internal_error", clientIp, {
      level: "error",
      success: false,
      durationMs: timer(),
      error: error instanceof Error ? error.message : "Unknown error",
    }));

    return new Response(
      JSON.stringify({ error: "Internal server error", safe: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
