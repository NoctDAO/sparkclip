import { useState, useEffect } from "react";
import { Clock, User, Video, MessageSquare, Shield, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface AdminLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
  admin?: {
    username: string | null;
    avatar_url: string | null;
  };
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  delete_video: <Video className="w-4 h-4" />,
  hide_video: <Video className="w-4 h-4" />,
  restore_video: <Video className="w-4 h-4" />,
  delete_comment: <MessageSquare className="w-4 h-4" />,
  ban_user: <Ban className="w-4 h-4" />,
  unban_user: <Ban className="w-4 h-4" />,
  grant_verified: <Shield className="w-4 h-4" />,
  revoke_verified: <Shield className="w-4 h-4" />,
  grant_moderator: <Shield className="w-4 h-4" />,
  revoke_moderator: <Shield className="w-4 h-4" />,
  approve_appeal: <User className="w-4 h-4" />,
  reject_appeal: <User className="w-4 h-4" />,
  dismiss_reports: <MessageSquare className="w-4 h-4" />,
};

const ACTION_LABELS: Record<string, string> = {
  delete_video: "Deleted video",
  hide_video: "Hid video",
  restore_video: "Restored video",
  delete_comment: "Deleted comment",
  ban_user: "Banned user",
  unban_user: "Unbanned user",
  grant_verified: "Granted verified",
  revoke_verified: "Revoked verified",
  grant_moderator: "Made moderator",
  revoke_moderator: "Removed moderator",
  approve_appeal: "Approved appeal",
  reject_appeal: "Rejected appeal",
  dismiss_reports: "Dismissed reports",
};

const ACTION_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  delete_video: "destructive",
  hide_video: "secondary",
  restore_video: "default",
  delete_comment: "destructive",
  ban_user: "destructive",
  unban_user: "default",
  grant_verified: "default",
  revoke_verified: "secondary",
  grant_moderator: "default",
  revoke_moderator: "secondary",
  approve_appeal: "default",
  reject_appeal: "destructive",
  dismiss_reports: "secondary",
};

export function AdminLogs() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("admin_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching logs:", error);
      setLoading(false);
      return;
    }

    // Fetch admin profiles
    const adminIds = [...new Set((data || []).map((l) => l.admin_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, avatar_url")
      .in("user_id", adminIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    setLogs(
      (data || []).map((l) => ({
        ...l,
        details: l.details as Record<string, unknown> | null,
        admin: profileMap.get(l.admin_id),
      }))
    );
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No admin actions recorded yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <Card key={log.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={log.admin?.avatar_url || undefined} />
                <AvatarFallback>
                  {(log.admin?.username || "A")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">
                    @{log.admin?.username || "unknown"}
                  </span>
                  <Badge variant={ACTION_VARIANTS[log.action_type] || "outline"}>
                    {ACTION_ICONS[log.action_type] || <Shield className="w-4 h-4" />}
                    <span className="ml-1">
                      {ACTION_LABELS[log.action_type] || log.action_type}
                    </span>
                  </Badge>
                </div>

                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {log.target_type}
                  </Badge>
                  <span className="truncate max-w-[200px]">
                    ID: {log.target_id.slice(0, 8)}...
                  </span>
                </div>

                {log.details && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {log.details.reason && (
                      <p>Reason: {String(log.details.reason)}</p>
                    )}
                    {log.details.duration && (
                      <p>Duration: {String(log.details.duration)} days</p>
                    )}
                    {log.details.report_count && (
                      <p>Reports: {String(log.details.report_count)}</p>
                    )}
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
