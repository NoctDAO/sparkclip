import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Download, Eye, MousePointer, TrendingUp, 
  DollarSign, Calendar, BarChart3, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useToast } from "@/hooks/use-toast";
import { Ad } from "@/types/ad";
import { cn } from "@/lib/utils";

interface DailyPerformance {
  date: string;
  impressions: number;
  clicks: number;
  skips: number;
  completes: number;
  spend: number;
  ctr: number;
  avgViewDuration: number;
}

const CHART_COLORS = {
  impressions: "hsl(var(--primary))",
  clicks: "hsl(var(--chart-2))",
  spend: "hsl(var(--chart-3))",
  completes: "hsl(var(--chart-4))",
  skips: "hsl(var(--chart-5))",
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

export default function AdAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const { isAdvertiser, isAdmin, loading: rolesLoading } = useUserRoles(user?.id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [ads, setAds] = useState<Ad[]>([]);
  const [selectedAdId, setSelectedAdId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<DailyPerformance[]>([]);

  useEffect(() => {
    if (!authLoading && !rolesLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdvertiser && !isAdmin) {
        toast({ title: "Access Denied", description: "You don't have advertiser permissions.", variant: "destructive" });
        navigate("/");
      } else {
        fetchAds();
      }
    }
  }, [user, authLoading, rolesLoading, isAdvertiser, isAdmin]);

  useEffect(() => {
    if (ads.length > 0) {
      fetchAnalytics();
    }
  }, [ads, selectedAdId, dateRange]);

  const fetchAds = async () => {
    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setAds(data as Ad[]);
    }
    setLoading(false);
  };

  const fetchAnalytics = async () => {
    const days = parseInt(dateRange);
    const startDate = subDays(new Date(), days);

    let query = supabase
      .from("ad_analytics")
      .select("*")
      .gte("created_at", startDate.toISOString());

    if (selectedAdId !== "all") {
      query = query.eq("ad_id", selectedAdId);
    } else {
      const adIds = ads.map(ad => ad.id);
      query = query.in("ad_id", adIds);
    }

    const { data } = await query;

    if (data) {
      // Aggregate by day
      const dailyMap = new Map<string, DailyPerformance>();

      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), i), "yyyy-MM-dd");
        dailyMap.set(date, {
          date,
          impressions: 0,
          clicks: 0,
          skips: 0,
          completes: 0,
          spend: 0,
          ctr: 0,
          avgViewDuration: 0,
        });
      }

      const viewDurations: Record<string, number[]> = {};

      data.forEach((event) => {
        const date = format(new Date(event.created_at), "yyyy-MM-dd");
        const day = dailyMap.get(date);
        if (day) {
          if (event.event_type === "impression") {
            day.impressions++;
            // Estimate spend (simplified)
            const ad = ads.find(a => a.id === event.ad_id);
            if (ad) {
              day.spend += ad.cost_per_impression || 0.001;
            }
          } else if (event.event_type === "click") {
            day.clicks++;
            const ad = ads.find(a => a.id === event.ad_id);
            if (ad) {
              day.spend += ad.cost_per_click || 0.01;
            }
          } else if (event.event_type === "skip") {
            day.skips++;
          } else if (event.event_type === "view_complete") {
            day.completes++;
          }

          if (event.view_duration_ms) {
            if (!viewDurations[date]) viewDurations[date] = [];
            viewDurations[date].push(event.view_duration_ms);
          }
        }
      });

      // Calculate CTR and avg view duration
      dailyMap.forEach((day, date) => {
        day.ctr = day.impressions > 0 ? (day.clicks / day.impressions) * 100 : 0;
        const durations = viewDurations[date] || [];
        day.avgViewDuration = durations.length > 0 
          ? durations.reduce((a, b) => a + b, 0) / durations.length / 1000 
          : 0;
      });

      // Sort by date ascending
      const sortedData = Array.from(dailyMap.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      setAnalyticsData(sortedData);
    }
  };

  // Calculate totals and comparisons
  const totals = useMemo(() => {
    const current = analyticsData.reduce(
      (acc, day) => ({
        impressions: acc.impressions + day.impressions,
        clicks: acc.clicks + day.clicks,
        skips: acc.skips + day.skips,
        completes: acc.completes + day.completes,
        spend: acc.spend + day.spend,
      }),
      { impressions: 0, clicks: 0, skips: 0, completes: 0, spend: 0 }
    );

    const ctr = current.impressions > 0 
      ? (current.clicks / current.impressions) * 100 
      : 0;

    return { ...current, ctr };
  }, [analyticsData]);

  const pieData = useMemo(() => [
    { name: "Impressions", value: totals.impressions },
    { name: "Clicks", value: totals.clicks },
    { name: "Skips", value: totals.skips },
    { name: "Completes", value: totals.completes },
  ], [totals]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const exportCSV = () => {
    const headers = ["Date", "Impressions", "Clicks", "CTR (%)", "Spend", "Skips", "Completes", "Avg View (s)"];
    const rows = analyticsData.map(day => [
      day.date,
      day.impressions,
      day.clicks,
      day.ctr.toFixed(2),
      day.spend.toFixed(4),
      day.skips,
      day.completes,
      day.avgViewDuration.toFixed(2),
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ad-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported successfully" });
  };

  if (authLoading || rolesLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/advertiser")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Ad Performance Analytics</h1>
              <p className="text-muted-foreground">Detailed insights into your campaign performance</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedAdId} onValueChange={setSelectedAdId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {ads.map((ad) => (
                  <SelectItem key={ad.id} value={ad.id}>{ad.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Impressions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.impressions.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MousePointer className="w-4 h-4" />
                Clicks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.clicks.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                CTR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.ctr.toFixed(2)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total Spend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.spend)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Impressions & Clicks Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Impressions & Clicks Over Time</CardTitle>
              <CardDescription>Daily performance trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => format(new Date(val), "MMM d")}
                      className="text-xs"
                    />
                    <YAxis yAxisId="left" className="text-xs" />
                    <YAxis yAxisId="right" orientation="right" className="text-xs" />
                    <Tooltip 
                      labelFormatter={(val) => format(new Date(val), "MMM d, yyyy")}
                      contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="impressions" 
                      stroke={CHART_COLORS.impressions}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="clicks" 
                      stroke={CHART_COLORS.clicks}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Spend Area Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Spend Over Time</CardTitle>
              <CardDescription>Daily advertising spend</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => format(new Date(val), "MMM d")}
                      className="text-xs"
                    />
                    <YAxis className="text-xs" tickFormatter={(val) => `$${val}`} />
                    <Tooltip 
                      labelFormatter={(val) => format(new Date(val), "MMM d, yyyy")}
                      formatter={(val: number) => [formatCurrency(val), "Spend"]}
                      contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="spend" 
                      stroke={CHART_COLORS.spend}
                      fill={CHART_COLORS.spend}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Event Breakdown Pie Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Event Breakdown</CardTitle>
              <CardDescription>Distribution of ad events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
              <CardDescription>Key metrics at a glance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">View Completions</p>
                  <p className="text-2xl font-bold">{totals.completes.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totals.impressions > 0 
                      ? `${((totals.completes / totals.impressions) * 100).toFixed(1)}% completion rate`
                      : "No data"}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Skip Rate</p>
                  <p className="text-2xl font-bold">
                    {totals.impressions > 0 
                      ? `${((totals.skips / totals.impressions) * 100).toFixed(1)}%`
                      : "0%"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totals.skips.toLocaleString()} skips total
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Cost per Click</p>
                  <p className="text-2xl font-bold">
                    {totals.clicks > 0 
                      ? formatCurrency(totals.spend / totals.clicks)
                      : "$0.00"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Effective CPC</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Cost per 1K Impressions</p>
                  <p className="text-2xl font-bold">
                    {totals.impressions > 0 
                      ? formatCurrency((totals.spend / totals.impressions) * 1000)
                      : "$0.00"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Effective CPM</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Breakdown</CardTitle>
            <CardDescription>Detailed daily performance data</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Skips</TableHead>
                  <TableHead className="text-right">Completes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyticsData.slice().reverse().map((day) => (
                  <TableRow key={day.date}>
                    <TableCell>{format(new Date(day.date), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right">{day.impressions.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{day.clicks.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{day.ctr.toFixed(2)}%</TableCell>
                    <TableCell className="text-right">{formatCurrency(day.spend)}</TableCell>
                    <TableCell className="text-right">{day.skips.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{day.completes.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
