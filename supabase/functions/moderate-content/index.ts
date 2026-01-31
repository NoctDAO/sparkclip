import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { content, content_type, content_id }: ModerationRequest = await req.json();

    if (!content || !content_type || !content_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Check keyword blocklist first (fast)
    const { data: keywords } = await supabase
      .from("moderation_keywords")
      .select("keyword, category, action, is_regex");

    let keywordMatch: { keyword: string; category: string; action: string } | null = null;

    if (keywords && keywords.length > 0) {
      const contentLower = content.toLowerCase();
      
      for (const kw of keywords) {
        if (kw.is_regex) {
          try {
            const regex = new RegExp(kw.keyword, "i");
            if (regex.test(content)) {
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
                content: `Analyze this ${content_type} content:\n\n"${content}"`
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

    return new Response(
      JSON.stringify({
        ...aiResult,
        blocked: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Moderation error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", safe: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
