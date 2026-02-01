import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SecurityLog {
  timestamp: string;
  level: string;
  function_name: string;
  action: string;
  ip_address: string;
  user_id?: string;
  success: boolean;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user is admin/moderator
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin or moderator role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "moderator"]);

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { function_name, limit = 100 } = await req.json();

    // Query edge function logs from analytics
    // Note: This uses the Supabase Management API internally
    // For now, we'll return mock data structure since direct log access
    // requires the management API key which should be done via the dashboard

    // In a production environment, you would:
    // 1. Use the Supabase Management API to fetch function logs
    // 2. Or store security logs in a dedicated table

    // For demonstration, we'll query a security_audit_logs table if it exists
    // First, let's check if we have any stored audit logs
    const { data: auditLogs, error: logsError } = await supabaseAdmin
      .from("admin_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    // Transform admin_logs to security log format
    const logs: SecurityLog[] = (auditLogs || []).map((log) => ({
      timestamp: log.created_at,
      level: "info" as const,
      function_name: "admin-action",
      action: log.action_type,
      ip_address: "masked",
      user_id: log.admin_id.substring(0, 8) + "...",
      success: true,
      metadata: log.details as Record<string, unknown> || undefined,
    }));

    return new Response(
      JSON.stringify({ logs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error fetching security logs:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", logs: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
