import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  isValidEmail,
  isValidPassword,
  isValidAuthAction,
  sanitizeString,
  validationErrorResponse,
} from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-forwarded-for, x-real-ip",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Rate limit config: 5 attempts per 15 minutes per IP
const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

interface RateLimitEntry {
  attempts: number;
  window_start: string;
}

interface AuthRequest {
  action: string;
  email: string;
  password: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP from headers (works with Supabase edge functions)
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const clientIp = forwarded?.split(",")[0]?.trim() || realIp || "unknown";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse and validate request body
    let body: AuthRequest;
    try {
      body = await req.json();
    } catch {
      return validationErrorResponse(["Invalid JSON body"], corsHeaders);
    }

    const { action, email, password } = body;

    // Validate action
    if (!isValidAuthAction(action)) {
      return validationErrorResponse(["Invalid action. Must be 'signin' or 'signup'"], corsHeaders);
    }

    // Validate email
    if (!isValidEmail(email)) {
      return validationErrorResponse(["Invalid email format"], corsHeaders);
    }

    // Validate password
    if (!isValidPassword(password)) {
      return validationErrorResponse(["Password must be between 8 and 128 characters"], corsHeaders);
    }

    // Sanitize email (trim whitespace, lowercase)
    const sanitizedEmail = sanitizeString(email).toLowerCase();

    // Check rate limit for this IP
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
    
    // Get or create rate limit entry
    const { data: existingEntry } = await supabase
      .from("ip_rate_limits")
      .select("*")
      .eq("ip_address", clientIp)
      .eq("action_type", "auth")
      .gte("window_start", windowStart)
      .single();

    if (existingEntry && existingEntry.attempts >= MAX_ATTEMPTS) {
      const resetTime = new Date(new Date(existingEntry.window_start).getTime() + WINDOW_MINUTES * 60 * 1000);
      const waitMinutes = Math.ceil((resetTime.getTime() - Date.now()) / 60000);
      
      return new Response(
        JSON.stringify({ 
          error: "Too many login attempts",
          message: `Please wait ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''} before trying again.`,
          retry_after: waitMinutes * 60
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment attempt counter
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
          action_type: "auth",
          attempts: 1,
          window_start: new Date().toISOString(),
        });
    }

    // Perform the auth action using admin client with sanitized email
    let result;
    if (action === "signin") {
      result = await supabase.auth.signInWithPassword({ email: sanitizedEmail, password });
    } else if (action === "signup") {
      result = await supabase.auth.signUp({ 
        email: sanitizedEmail, 
        password,
        options: {
          emailRedirectTo: req.headers.get("origin") || undefined,
        }
      });
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // On successful login, clear rate limit for this IP
    if (action === "signin" && result.data.session) {
      await supabase
        .from("ip_rate_limits")
        .delete()
        .eq("ip_address", clientIp)
        .eq("action_type", "auth");
    }

    return new Response(
      JSON.stringify({ 
        user: result.data.user,
        session: result.data.session,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Auth rate limit error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
