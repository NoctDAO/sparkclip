import { useState, useEffect } from "react";
import { Bell, Mail, AlertTriangle, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface NotificationPreferences {
  budget_alert_email: boolean;
  budget_alert_in_app: boolean;
  alert_threshold_80: boolean;
  alert_threshold_95: boolean;
  alert_threshold_100: boolean;
  custom_threshold_percent: number | null;
}

const defaultPreferences: NotificationPreferences = {
  budget_alert_email: true,
  budget_alert_in_app: true,
  alert_threshold_80: true,
  alert_threshold_95: true,
  alert_threshold_100: true,
  custom_threshold_percent: null,
};

export function NotificationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customThreshold, setCustomThreshold] = useState<number[]>([80]);

  useEffect(() => {
    if (user?.id) {
      fetchPreferences();
    }
  }, [user?.id]);

  const fetchPreferences = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("advertiser_notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setPreferences({
        budget_alert_email: data.budget_alert_email,
        budget_alert_in_app: data.budget_alert_in_app,
        alert_threshold_80: data.alert_threshold_80,
        alert_threshold_95: data.alert_threshold_95,
        alert_threshold_100: data.alert_threshold_100,
        custom_threshold_percent: data.custom_threshold_percent,
      });
      if (data.custom_threshold_percent) {
        setCustomThreshold([data.custom_threshold_percent]);
      }
    }
    setLoading(false);
  };

  const savePreferences = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    
    const prefData = {
      user_id: user.id,
      budget_alert_email: preferences.budget_alert_email,
      budget_alert_in_app: preferences.budget_alert_in_app,
      alert_threshold_80: preferences.alert_threshold_80,
      alert_threshold_95: preferences.alert_threshold_95,
      alert_threshold_100: preferences.alert_threshold_100,
      custom_threshold_percent: preferences.custom_threshold_percent,
    };

    const { error } = await supabase
      .from("advertiser_notification_preferences")
      .upsert(prefData, { onConflict: "user_id" });

    if (error) {
      toast({ title: "Failed to save preferences", variant: "destructive" });
    } else {
      toast({ title: "Notification preferences saved" });
    }
    
    setSaving(false);
  };

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleCustomThresholdChange = (value: number[]) => {
    setCustomThreshold(value);
    setPreferences((prev) => ({ ...prev, custom_threshold_percent: value[0] }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Budget Notifications
        </CardTitle>
        <CardDescription>
          Configure how you want to be notified about campaign budget status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Channels */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Notification Channels</h4>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="email-alerts">Email Notifications</Label>
            </div>
            <Switch
              id="email-alerts"
              checked={preferences.budget_alert_email}
              onCheckedChange={(v) => handleToggle("budget_alert_email", v)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="in-app-alerts">In-App Notifications</Label>
            </div>
            <Switch
              id="in-app-alerts"
              checked={preferences.budget_alert_in_app}
              onCheckedChange={(v) => handleToggle("budget_alert_in_app", v)}
            />
          </div>
        </div>

        {/* Alert Thresholds */}
        <div className="space-y-4 pt-4 border-t">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alert Thresholds
          </h4>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="threshold-80">80% Budget Used</Label>
              <p className="text-xs text-muted-foreground">Early warning</p>
            </div>
            <Switch
              id="threshold-80"
              checked={preferences.alert_threshold_80}
              onCheckedChange={(v) => handleToggle("alert_threshold_80", v)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="threshold-95">95% Budget Used</Label>
              <p className="text-xs text-muted-foreground">Critical warning</p>
            </div>
            <Switch
              id="threshold-95"
              checked={preferences.alert_threshold_95}
              onCheckedChange={(v) => handleToggle("alert_threshold_95", v)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="threshold-100">100% Budget Exhausted</Label>
              <p className="text-xs text-muted-foreground">Campaign paused</p>
            </div>
            <Switch
              id="threshold-100"
              checked={preferences.alert_threshold_100}
              onCheckedChange={(v) => handleToggle("alert_threshold_100", v)}
            />
          </div>
        </div>

        {/* Custom Threshold */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Custom Threshold</h4>
            <span className="text-sm font-semibold">{customThreshold[0]}%</span>
          </div>
          <Slider
            value={customThreshold}
            onValueChange={handleCustomThresholdChange}
            min={10}
            max={99}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Get an additional alert when this percentage of budget is used
          </p>
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Budget alerts are checked hourly. You'll receive notifications based on your preferences above.
          </AlertDescription>
        </Alert>

        {/* Save Button */}
        <Button onClick={savePreferences} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}
