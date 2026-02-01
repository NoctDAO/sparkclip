import { useState, useEffect, useCallback } from "react";
import { 
  Shield, 
  Search, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Clock,
  Filter,
  ChevronDown,
  Globe,
  User,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";

interface SecurityLog {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  function_name: string;
  action: string;
  ip_address: string;
  user_id?: string;
  success: boolean;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
  error?: string;
}

interface EdgeFunctionLog {
  id: string;
  function_id: string;
  event_message: string;
  event_type: string;
  level: string;
  timestamp: number;
}

const LEVEL_CONFIG = {
  debug: { icon: Zap, color: "text-muted-foreground", bgColor: "bg-muted" },
  info: { icon: CheckCircle2, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  warn: { icon: AlertTriangle, color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" },
  error: { icon: XCircle, color: "text-destructive", bgColor: "bg-destructive/10" },
};

const FUNCTION_OPTIONS = [
  { value: "all", label: "All Functions" },
  { value: "auth-rate-limit", label: "Authentication" },
  { value: "moderate-content", label: "Content Moderation" },
  { value: "delete-user-data", label: "Account Deletion" },
];

const LEVEL_OPTIONS = [
  { value: "all", label: "All Levels" },
  { value: "error", label: "Errors Only" },
  { value: "warn", label: "Warnings & Errors" },
  { value: "info", label: "Info & Above" },
];

export function SecurityAuditLogs() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [functionFilter, setFunctionFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);

    try {
      // Fetch logs from edge function analytics
      // We query each function's logs separately
      const functionNames = functionFilter === "all" 
        ? ["auth-rate-limit", "moderate-content", "delete-user-data"]
        : [functionFilter];

      const allLogs: SecurityLog[] = [];

      for (const fnName of functionNames) {
        const { data, error } = await supabase.functions.invoke("get-security-logs", {
          body: { function_name: fnName, limit: 100 },
        });

        if (!error && data?.logs) {
          allLogs.push(...data.logs);
        }
      }

      // Sort by timestamp descending
      allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply filters
      let filtered = allLogs;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (log) =>
            log.action.toLowerCase().includes(query) ||
            log.ip_address.toLowerCase().includes(query) ||
            log.user_id?.toLowerCase().includes(query) ||
            log.error?.toLowerCase().includes(query) ||
            JSON.stringify(log.metadata).toLowerCase().includes(query)
        );
      }

      if (levelFilter !== "all") {
        const levels: Record<string, string[]> = {
          error: ["error"],
          warn: ["error", "warn"],
          info: ["error", "warn", "info"],
        };
        filtered = filtered.filter((log) => levels[levelFilter]?.includes(log.level));
      }

      setLogs(filtered);
    } catch (err) {
      console.error("Error fetching security logs:", err);
      // Fallback: Show mock data structure for demo
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [functionFilter, levelFilter, searchQuery]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 10000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchLogs]);

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLogs(newExpanded);
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      signin_success: "Sign In Success",
      signin_failed: "Sign In Failed",
      signup_success: "Sign Up Success",
      signup_failed: "Sign Up Failed",
      rate_limit_exceeded: "Rate Limit Hit",
      validation_failed: "Validation Error",
      content_blocked: "Content Blocked",
      content_flagged: "Content Flagged",
      moderation_complete: "Moderation Complete",
      deletion_started: "Account Deletion Started",
      deletion_complete: "Account Deletion Complete",
      deletion_partial_failure: "Account Deletion Failed",
      unauthorized: "Unauthorized Access",
      internal_error: "Internal Error",
    };
    return labels[action] || action.replace(/_/g, " ");
  };

  const stats = {
    total: logs.length,
    errors: logs.filter((l) => l.level === "error").length,
    warnings: logs.filter((l) => l.level === "warn").length,
    rateLimits: logs.filter((l) => l.action === "rate_limit_exceeded").length,
  };

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Events</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
              <Shield className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Errors</p>
                <p className="text-xl font-bold text-destructive">{stats.errors}</p>
              </div>
              <XCircle className="w-8 h-8 text-destructive/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Warnings</p>
                <p className="text-xl font-bold text-yellow-600">{stats.warnings}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-600/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Rate Limits</p>
                <p className="text-xl font-bold">{stats.rateLimits}</p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={functionFilter} onValueChange={setFunctionFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUNCTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="icon"
                onClick={() => setAutoRefresh(!autoRefresh)}
                title={autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? "animate-spin" : ""}`} />
              </Button>
              <Button variant="outline" onClick={fetchLogs} disabled={loading}>
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No security logs found</p>
            <p className="text-sm mt-1">
              Security events will appear here as they occur
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log, index) => {
            const levelConfig = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.info;
            const LevelIcon = levelConfig.icon;
            const isExpanded = expandedLogs.has(index);

            return (
              <Collapsible key={index} open={isExpanded} onOpenChange={() => toggleExpand(index)}>
                <Card className={`transition-colors ${log.level === "error" ? "border-destructive/50" : ""}`}>
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-3 cursor-pointer hover:bg-muted/50">
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded ${levelConfig.bgColor}`}>
                          <LevelIcon className={`w-4 h-4 ${levelConfig.color}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {getActionLabel(log.action)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {log.function_name}
                            </Badge>
                            {!log.success && (
                              <Badge variant="destructive" className="text-xs">
                                Failed
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {log.ip_address}
                            </span>
                            {log.user_id && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {log.user_id}
                              </span>
                            )}
                            {log.duration_ms && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {log.duration_ms}ms
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-3 px-3">
                      <div className="ml-10 p-3 bg-muted rounded-md space-y-2 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground">Timestamp:</span>
                            <p className="font-mono text-xs">
                              {format(new Date(log.timestamp), "PPpp")}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Level:</span>
                            <p className={levelConfig.color}>{log.level.toUpperCase()}</p>
                          </div>
                        </div>

                        {log.error && (
                          <div>
                            <span className="text-muted-foreground">Error:</span>
                            <p className="text-destructive font-mono text-xs">{log.error}</p>
                          </div>
                        )}

                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Metadata:</span>
                            <pre className="font-mono text-xs bg-background p-2 rounded mt-1 overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
