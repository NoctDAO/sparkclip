import { useState, useEffect } from "react";
import { Bell, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface BudgetAlert {
  id: string;
  ad_id: string;
  alert_type: string;
  budget_type: string;
  threshold_value: number;
  current_value: number;
  created_at: string;
  ad_title?: string;
}

interface BudgetAlertsBellProps {
  userId: string;
}

export function BudgetAlertsBell({ userId }: BudgetAlertsBellProps) {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchAlerts();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('budget-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'budget_alerts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setAlerts(prev => [payload.new as BudgetAlert, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchAlerts = async () => {
    setLoading(true);
    
    // Fetch recent budget alerts with ad titles
    const { data: alertsData } = await supabase
      .from("budget_alerts")
      .select("*, ads(title)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    
    if (alertsData) {
      const formattedAlerts = alertsData.map((alert: any) => ({
        ...alert,
        ad_title: alert.ads?.title || "Unknown Campaign",
      }));
      setAlerts(formattedAlerts);
      
      // Count alerts from last 24 hours as "unread"
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      setUnreadCount(
        formattedAlerts.filter(
          (a) => new Date(a.created_at) > dayAgo
        ).length
      );
    }
    
    setLoading(false);
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case "80":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case "95":
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case "100":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getAlertMessage = (alert: BudgetAlert) => {
    const budgetLabel = alert.budget_type === "total" ? "Total budget" : "Daily budget";
    const percentage = alert.alert_type;
    
    if (percentage === "100") {
      return `${budgetLabel} exhausted for "${alert.ad_title}"`;
    }
    return `${budgetLabel} ${percentage}% used for "${alert.ad_title}"`;
  };

  const getAlertSeverity = (alertType: string) => {
    switch (alertType) {
      case "80":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
      case "95":
        return "bg-orange-500/10 text-orange-500 border-orange-500/30";
      case "100":
        return "bg-red-500/10 text-red-500 border-red-500/30";
      default:
        return "";
    }
  };

  const handleClearAlerts = () => {
    setUnreadCount(0);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Budget Alerts</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-6"
              onClick={handleClearAlerts}
            >
              Mark as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Loading...
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No budget alerts yet
          </div>
        ) : (
          <ScrollArea className="h-72">
            {alerts.map((alert) => (
              <DropdownMenuItem
                key={alert.id}
                className={`flex flex-col items-start gap-1 p-3 cursor-default ${getAlertSeverity(alert.alert_type)}`}
              >
                <div className="flex items-center gap-2 w-full">
                  {getAlertIcon(alert.alert_type)}
                  <span className="text-sm font-medium flex-1 truncate">
                    {getAlertMessage(alert)}
                  </span>
                </div>
                <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                  <span>
                    ${alert.current_value.toFixed(2)} of ${alert.threshold_value.toFixed(2)}
                  </span>
                  <span>
                    {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
