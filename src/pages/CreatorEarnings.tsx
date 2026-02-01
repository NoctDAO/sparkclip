import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { 
  ArrowLeft, DollarSign, TrendingUp, Eye, MousePointer, 
  Download, Wallet, CalendarDays, Video
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, subDays, eachDayOfInterval, startOfDay } from "date-fns";

interface EarningRecord {
  id: string;
  video_id: string;
  event_type: string;
  gross_revenue: number;
  creator_share: number;
  created_at: string;
  video_caption?: string;
}

interface EarningSummary {
  total_impressions: number;
  total_clicks: number;
  total_earnings: number;
  pending_payout: number;
  earnings_this_month: number;
}

interface DailyEarning {
  date: string;
  earnings: number;
  impressions: number;
  clicks: number;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))"];

export default function CreatorEarnings() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);
  const [summary, setSummary] = useState<EarningSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchEarnings();
    }
  }, [user, timeRange]);

  const fetchEarnings = async () => {
    if (!user) return;
    setLoading(true);

    const daysAgo = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const startDate = subDays(new Date(), daysAgo).toISOString();

    // Fetch earnings records
    const { data: earningsData } = await supabase
      .from("creator_earnings")
      .select("*, videos(caption)")
      .eq("creator_id", user.id)
      .gte("created_at", startDate)
      .order("created_at", { ascending: false });

    if (earningsData) {
      const formatted = earningsData.map((e: any) => ({
        ...e,
        video_caption: e.videos?.caption || "Untitled Video",
      }));
      setEarnings(formatted);
    }

    // Fetch payout summary
    const { data: summaryData } = await supabase
      .from("creator_payout_summary")
      .select("*")
      .eq("creator_id", user.id)
      .single();

    if (summaryData) {
      // Calculate this month's earnings
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      
      const monthlyEarnings = earningsData
        ?.filter((e: any) => new Date(e.created_at) >= monthStart)
        .reduce((sum: number, e: any) => sum + Number(e.creator_share), 0) || 0;

      setSummary({
        total_impressions: summaryData.total_impressions,
        total_clicks: summaryData.total_clicks,
        total_earnings: Number(summaryData.total_earnings),
        pending_payout: Number(summaryData.pending_payout),
        earnings_this_month: monthlyEarnings,
      });
    } else {
      setSummary({
        total_impressions: 0,
        total_clicks: 0,
        total_earnings: 0,
        pending_payout: 0,
        earnings_this_month: 0,
      });
    }

    setLoading(false);
  };

  // Calculate daily earnings for chart
  const dailyEarnings = useMemo(() => {
    const daysAgo = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const startDate = startOfDay(subDays(new Date(), daysAgo));
    const endDate = startOfDay(new Date());
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return days.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayEarnings = earnings.filter(e => 
        format(new Date(e.created_at), "yyyy-MM-dd") === dayStr
      );

      return {
        date: format(day, "MMM d"),
        earnings: dayEarnings.reduce((sum, e) => sum + Number(e.creator_share), 0),
        impressions: dayEarnings.filter(e => e.event_type === "impression").length,
        clicks: dayEarnings.filter(e => e.event_type === "click").length,
      };
    });
  }, [earnings, timeRange]);

  // Event breakdown for pie chart
  const eventBreakdown = useMemo(() => {
    const impressions = earnings.filter(e => e.event_type === "impression").length;
    const clicks = earnings.filter(e => e.event_type === "click").length;
    return [
      { name: "Impressions", value: impressions },
      { name: "Clicks", value: clicks },
    ];
  }, [earnings]);

  // Top earning videos
  const topVideos = useMemo(() => {
    const videoMap = new Map<string, { caption: string; earnings: number; count: number }>();
    
    for (const earning of earnings) {
      const existing = videoMap.get(earning.video_id) || { 
        caption: earning.video_caption || "Untitled", 
        earnings: 0, 
        count: 0 
      };
      videoMap.set(earning.video_id, {
        ...existing,
        earnings: existing.earnings + Number(earning.creator_share),
        count: existing.count + 1,
      });
    }

    return Array.from(videoMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 5);
  }, [earnings]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  if (authLoading) {
    return (
      <div className="min-h-[var(--app-height)] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Creator Earnings - Clips</title>
        <meta name="description" content="View your ad revenue earnings" />
      </Helmet>

      <div className="min-h-[var(--app-height)] bg-background pb-safe-nav">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Creator Earnings</h1>
                <p className="text-xs text-muted-foreground">
                  50% revenue share on ads shown with your videos
                </p>
              </div>
            </div>
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        <div className="p-4 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="col-span-2 bg-gradient-to-br from-primary/10 to-primary/5">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Wallet className="w-4 h-4" /> Pending Payout
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-10 w-32" />
                ) : (
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(summary?.pending_payout || 0)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <CalendarDays className="w-4 h-4" /> This Month
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-2xl font-bold">
                    {formatCurrency(summary?.earnings_this_month || 0)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" /> All Time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-2xl font-bold">
                    {formatCurrency(summary?.total_earnings || 0)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Eye className="w-4 h-4" /> Impressions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-2xl font-bold">
                    {(summary?.total_impressions || 0).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <MousePointer className="w-4 h-4" /> Clicks
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-2xl font-bold">
                    {(summary?.total_clicks || 0).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Earnings Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Earnings Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : dailyEarnings.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={dailyEarnings}>
                    <defs>
                      <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      className="fill-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      className="fill-muted-foreground"
                      tickFormatter={(v) => `$${v.toFixed(2)}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`$${value.toFixed(4)}`, 'Earnings']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="earnings" 
                      stroke="hsl(var(--primary))" 
                      fill="url(#earningsGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No earnings data yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Earning Videos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Video className="w-4 h-4" /> Top Earning Videos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : topVideos.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Video</TableHead>
                      <TableHead className="text-right">Events</TableHead>
                      <TableHead className="text-right">Earnings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topVideos.map((video, index) => (
                      <TableRow key={video.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                              {index + 1}
                            </Badge>
                            <span className="truncate max-w-[150px]">
                              {video.caption}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{video.count}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(video.earnings)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No video earnings yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revenue Share Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-primary mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium">How Creator Earnings Work</p>
                  <p className="text-sm text-muted-foreground">
                    You earn 50% of the ad revenue generated when ads are shown alongside your videos. 
                    Revenue is calculated from impressions (CPM) and clicks (CPC) based on the advertiser's rates.
                    Payouts are processed monthly for balances over $10.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
