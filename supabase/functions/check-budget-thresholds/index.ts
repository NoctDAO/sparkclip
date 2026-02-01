import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BudgetCheckResult {
  adId: string;
  campaignTitle: string;
  alertType: "80_percent" | "95_percent" | "100_percent" | "daily_exhausted";
  budgetType: "total" | "daily";
  thresholdValue: number;
  currentValue: number;
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active ads with budgets
    const { data: ads, error: adsError } = await supabase
      .from("ads")
      .select("*")
      .eq("status", "active")
      .or("total_budget.not.is.null,daily_budget.not.is.null");

    if (adsError) {
      throw new Error(`Failed to fetch ads: ${adsError.message}`);
    }

    const alerts: BudgetCheckResult[] = [];
    const now = new Date().toISOString();

    for (const ad of ads || []) {
      if (!ad.created_by) continue;

      // Check total budget thresholds
      if (ad.total_budget && ad.total_budget > 0) {
        const totalSpent = ad.total_spent || 0;
        const percentUsed = (totalSpent / ad.total_budget) * 100;

        // Check 80% threshold
        if (percentUsed >= 80 && percentUsed < 95 && !ad.last_80_alert_at) {
          alerts.push({
            adId: ad.id,
            campaignTitle: ad.title,
            alertType: "80_percent",
            budgetType: "total",
            thresholdValue: ad.total_budget,
            currentValue: totalSpent,
            userId: ad.created_by,
          });

          // Update last alert timestamp
          await supabase
            .from("ads")
            .update({ last_80_alert_at: now })
            .eq("id", ad.id);
        }

        // Check 95% threshold
        if (percentUsed >= 95 && percentUsed < 100 && !ad.last_95_alert_at) {
          alerts.push({
            adId: ad.id,
            campaignTitle: ad.title,
            alertType: "95_percent",
            budgetType: "total",
            thresholdValue: ad.total_budget,
            currentValue: totalSpent,
            userId: ad.created_by,
          });

          await supabase
            .from("ads")
            .update({ last_95_alert_at: now })
            .eq("id", ad.id);
        }

        // Check 100% threshold (exhausted)
        if (percentUsed >= 100 && !ad.last_100_alert_at) {
          alerts.push({
            adId: ad.id,
            campaignTitle: ad.title,
            alertType: "100_percent",
            budgetType: "total",
            thresholdValue: ad.total_budget,
            currentValue: totalSpent,
            userId: ad.created_by,
          });

          await supabase
            .from("ads")
            .update({ last_100_alert_at: now })
            .eq("id", ad.id);
        }
      }

      // Check daily budget thresholds
      if (ad.daily_budget && ad.daily_budget > 0) {
        const dailySpent = ad.daily_spent || 0;
        const dailyPercentUsed = (dailySpent / ad.daily_budget) * 100;

        // Check if daily budget is exhausted
        if (dailyPercentUsed >= 100 && !ad.last_daily_alert_at) {
          alerts.push({
            adId: ad.id,
            campaignTitle: ad.title,
            alertType: "daily_exhausted",
            budgetType: "daily",
            thresholdValue: ad.daily_budget,
            currentValue: dailySpent,
            userId: ad.created_by,
          });

          await supabase
            .from("ads")
            .update({ last_daily_alert_at: now })
            .eq("id", ad.id);
        }
      }
    }

    // Insert budget alerts into the database
    if (alerts.length > 0) {
      const alertRecords = alerts.map((alert) => ({
        ad_id: alert.adId,
        user_id: alert.userId,
        alert_type: alert.alertType,
        budget_type: alert.budgetType,
        threshold_value: alert.thresholdValue,
        current_value: alert.currentValue,
        notified_via: ["in_app"],
      }));

      const { error: insertError } = await supabase
        .from("budget_alerts")
        .insert(alertRecords);

      if (insertError) {
        console.error("Failed to insert budget alerts:", insertError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        alertsGenerated: alerts.length,
        alerts: alerts.map((a) => ({
          campaign: a.campaignTitle,
          type: a.alertType,
        })),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error checking budget thresholds:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
