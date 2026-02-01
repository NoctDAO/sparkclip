import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface BudgetStatus {
  total_budget: number | null;
  daily_budget: number | null;
  total_spent: number;
  daily_spent: number;
  total_remaining: number | null;
  daily_remaining: number | null;
  total_percent_used: number;
  daily_percent_used: number;
}

interface BudgetStatusCardProps {
  adId: string;
  compact?: boolean;
}

export function BudgetStatusCard({ adId, compact = false }: BudgetStatusCardProps) {
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBudgetStatus();
  }, [adId]);

  const fetchBudgetStatus = async () => {
    try {
      const { data, error } = await supabase.rpc("get_ad_budget_status", {
        p_ad_id: adId,
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setBudgetStatus(data[0] as BudgetStatus);
      }
    } catch (error) {
      console.error("Failed to fetch budget status:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-muted rounded-lg h-20" />
    );
  }

  if (!budgetStatus) {
    return null;
  }

  const hasNoBudget = !budgetStatus.total_budget && !budgetStatus.daily_budget;

  if (hasNoBudget) {
    if (compact) return null;
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">No budget limits set</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getStatusColor = (percentUsed: number) => {
    if (percentUsed >= 100) return "text-destructive";
    if (percentUsed >= 80) return "text-amber-500";
    return "text-green-500";
  };

  const getProgressColor = (percentUsed: number) => {
    if (percentUsed >= 100) return "bg-destructive";
    if (percentUsed >= 80) return "bg-amber-500";
    return "bg-green-500";
  };

  const getStatusBadge = (percentUsed: number) => {
    if (percentUsed >= 100) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          Exhausted
        </Badge>
      );
    }
    if (percentUsed >= 80) {
      return (
        <Badge variant="outline" className="gap-1 border-amber-500 text-amber-500">
          <AlertTriangle className="w-3 h-3" />
          Low
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 border-green-500 text-green-500">
        <CheckCircle className="w-3 h-3" />
        Active
      </Badge>
    );
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {budgetStatus.daily_budget && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground w-12">Daily:</span>
            <Progress 
              value={Math.min(budgetStatus.daily_percent_used, 100)} 
              className="h-2 flex-1"
            />
            <span className={cn("text-xs font-medium", getStatusColor(budgetStatus.daily_percent_used))}>
              {formatCurrency(budgetStatus.daily_spent)} / {formatCurrency(budgetStatus.daily_budget)}
            </span>
          </div>
        )}
        {budgetStatus.total_budget && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground w-12">Total:</span>
            <Progress 
              value={Math.min(budgetStatus.total_percent_used, 100)} 
              className="h-2 flex-1"
            />
            <span className={cn("text-xs font-medium", getStatusColor(budgetStatus.total_percent_used))}>
              {formatCurrency(budgetStatus.total_spent)} / {formatCurrency(budgetStatus.total_budget)}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Budget Status
          </CardTitle>
          {budgetStatus.total_budget && getStatusBadge(budgetStatus.total_percent_used)}
        </div>
        <CardDescription>
          Track your campaign spending
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Budget */}
        {budgetStatus.total_budget && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Budget</span>
              <span className={cn("text-sm font-semibold", getStatusColor(budgetStatus.total_percent_used))}>
                {formatCurrency(budgetStatus.total_spent)} / {formatCurrency(budgetStatus.total_budget)}
              </span>
            </div>
            <div className="relative">
              <Progress 
                value={Math.min(budgetStatus.total_percent_used, 100)} 
                className="h-3"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{budgetStatus.total_percent_used.toFixed(1)}% used</span>
              <span>{formatCurrency(budgetStatus.total_remaining || 0)} remaining</span>
            </div>
          </div>
        )}

        {/* Daily Budget */}
        {budgetStatus.daily_budget && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Daily Budget</span>
              <span className={cn("text-sm font-semibold", getStatusColor(budgetStatus.daily_percent_used))}>
                {formatCurrency(budgetStatus.daily_spent)} / {formatCurrency(budgetStatus.daily_budget)}
              </span>
            </div>
            <div className="relative">
              <Progress 
                value={Math.min(budgetStatus.daily_percent_used, 100)} 
                className="h-3"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{budgetStatus.daily_percent_used.toFixed(1)}% used today</span>
              <span>{formatCurrency(budgetStatus.daily_remaining || 0)} remaining</span>
            </div>
          </div>
        )}

        {/* Cost Summary */}
        <div className="pt-4 border-t grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(budgetStatus.total_spent)}
            </p>
            <p className="text-xs text-muted-foreground">Total Spent</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-muted-foreground">
              {formatCurrency(budgetStatus.daily_spent)}
            </p>
            <p className="text-xs text-muted-foreground">Spent Today</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
