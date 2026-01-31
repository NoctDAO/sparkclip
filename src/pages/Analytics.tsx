import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Eye, Heart, MessageCircle, TrendingUp, Clock, Users, Play } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";

interface VideoStats {
  id: string;
  caption: string | null;
  thumbnail_url: string | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
}

interface ViewEvent {
  video_id: string;
  watch_duration_seconds: number;
  video_duration_seconds: number;
  completion_percentage: number;
  watched_at: string;
}

interface DailyStats {
  date: string;
  views: number;
  likes: number;
  comments: number;
}

interface RetentionData {
  bucket: string;
  count: number;
  percentage: number;
}

export default function Analytics() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [videos, setVideos] = useState<VideoStats[]>([]);
  const [viewEvents, setViewEvents] = useState<ViewEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideoId, setSelectedVideoId] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, timeRange]);

  const fetchAnalytics = async () => {
    if (!user) return;
    setLoading(true);

    const daysAgo = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const startDate = subDays(new Date(), daysAgo).toISOString();

    // Fetch user's videos
    const { data: videosData } = await supabase
      .from("videos")
      .select("id, caption, thumbnail_url, views_count, likes_count, comments_count, shares_count, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (videosData) {
      setVideos(videosData);
    }

    // Fetch view events for user's videos
    const videoIds = videosData?.map(v => v.id) || [];
    if (videoIds.length > 0) {
      const { data: viewsData } = await supabase
        .from("video_views")
        .select("video_id, watch_duration_seconds, video_duration_seconds, completion_percentage, watched_at")
        .in("video_id", videoIds)
        .gte("watched_at", startDate)
        .order("watched_at", { ascending: true });

      if (viewsData) {
        setViewEvents(viewsData as ViewEvent[]);
      }
    }

    setLoading(false);
  };

  // Calculate totals
  const totals = useMemo(() => {
    const filteredVideos = selectedVideoId === "all" 
      ? videos 
      : videos.filter(v => v.id === selectedVideoId);
    
    return {
      views: filteredVideos.reduce((sum, v) => sum + (v.views_count || 0), 0),
      likes: filteredVideos.reduce((sum, v) => sum + (v.likes_count || 0), 0),
      comments: filteredVideos.reduce((sum, v) => sum + (v.comments_count || 0), 0),
      shares: filteredVideos.reduce((sum, v) => sum + (v.shares_count || 0), 0),
    };
  }, [videos, selectedVideoId]);

  // Calculate engagement rate
  const engagementRate = useMemo(() => {
    if (totals.views === 0) return 0;
    return ((totals.likes + totals.comments + totals.shares) / totals.views * 100).toFixed(2);
  }, [totals]);

  // Calculate average watch time
  const avgWatchTime = useMemo(() => {
    const filteredEvents = selectedVideoId === "all"
      ? viewEvents
      : viewEvents.filter(v => v.video_id === selectedVideoId);
    
    if (filteredEvents.length === 0) return 0;
    const total = filteredEvents.reduce((sum, v) => sum + Number(v.watch_duration_seconds), 0);
    return (total / filteredEvents.length).toFixed(1);
  }, [viewEvents, selectedVideoId]);

  // Calculate average completion rate
  const avgCompletionRate = useMemo(() => {
    const filteredEvents = selectedVideoId === "all"
      ? viewEvents
      : viewEvents.filter(v => v.video_id === selectedVideoId);
    
    if (filteredEvents.length === 0) return 0;
    const total = filteredEvents.reduce((sum, v) => sum + Number(v.completion_percentage), 0);
    return (total / filteredEvents.length).toFixed(1);
  }, [viewEvents, selectedVideoId]);

  // Daily views chart data
  const dailyViewsData = useMemo(() => {
    const daysAgo = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const startDate = startOfDay(subDays(new Date(), daysAgo));
    const endDate = startOfDay(new Date());
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const filteredEvents = selectedVideoId === "all"
      ? viewEvents
      : viewEvents.filter(v => v.video_id === selectedVideoId);

    return days.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayViews = filteredEvents.filter(v => 
        format(new Date(v.watched_at), "yyyy-MM-dd") === dayStr
      ).length;

      return {
        date: format(day, "MMM d"),
        views: dayViews,
      };
    });
  }, [viewEvents, timeRange, selectedVideoId]);

  // Retention buckets
  const retentionData = useMemo(() => {
    const filteredEvents = selectedVideoId === "all"
      ? viewEvents
      : viewEvents.filter(v => v.video_id === selectedVideoId);

    if (filteredEvents.length === 0) return [];

    const buckets = [
      { min: 0, max: 25, label: "0-25%" },
      { min: 25, max: 50, label: "25-50%" },
      { min: 50, max: 75, label: "50-75%" },
      { min: 75, max: 100, label: "75-100%" },
    ];

    return buckets.map(bucket => {
      const count = filteredEvents.filter(v => {
        const pct = Number(v.completion_percentage);
        return pct >= bucket.min && (bucket.max === 100 ? pct <= bucket.max : pct < bucket.max);
      }).length;

      return {
        bucket: bucket.label,
        count,
        percentage: Math.round((count / filteredEvents.length) * 100),
      };
    });
  }, [viewEvents, selectedVideoId]);

  // Top performing videos
  const topVideos = useMemo(() => {
    return [...videos]
      .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
      .slice(0, 5);
  }, [videos]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
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
        <title>Analytics - Clips</title>
        <meta name="description" content="View your video performance analytics" />
      </Helmet>

      <div className="min-h-[var(--app-height)] bg-background pb-safe-nav">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold">Analytics</h1>
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
          {/* Video selector */}
          {videos.length > 0 && (
            <Select value={selectedVideoId} onValueChange={setSelectedVideoId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a video" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Videos</SelectItem>
                {videos.map((video) => (
                  <SelectItem key={video.id} value={video.id}>
                    {video.caption?.slice(0, 40) || `Video ${video.id.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Eye className="w-4 h-4" /> Views
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-2xl font-bold">{formatNumber(totals.views)}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Heart className="w-4 h-4" /> Likes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-2xl font-bold">{formatNumber(totals.likes)}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" /> Engagement
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-2xl font-bold">{engagementRate}%</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> Avg Watch
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-2xl font-bold">{avgWatchTime}s</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Completion rate card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="w-4 h-4" /> Average Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-4 w-full" />
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completion</span>
                    <span className="font-medium">{avgCompletionRate}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${avgCompletionRate}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs for charts */}
          <Tabs defaultValue="views" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="views">Views Over Time</TabsTrigger>
              <TabsTrigger value="retention">Audience Retention</TabsTrigger>
            </TabsList>

            <TabsContent value="views" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Views Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-64 w-full" />
                  ) : dailyViewsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={dailyViewsData}>
                        <defs>
                          <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
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
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="views" 
                          stroke="hsl(var(--primary))" 
                          fill="url(#viewsGradient)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      No view data available yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="retention" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Audience Retention</CardTitle>
                  <CardDescription>How much of your videos viewers watched</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-64 w-full" />
                  ) : retentionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={retentionData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="bucket" 
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          className="fill-muted-foreground"
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          className="fill-muted-foreground"
                          label={{ value: '%', position: 'insideLeft', fontSize: 12 }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [`${value}%`, 'Viewers']}
                        />
                        <Bar 
                          dataKey="percentage" 
                          fill="hsl(var(--primary))"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      No retention data available yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Top videos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" /> Top Performing Videos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : topVideos.length > 0 ? (
                <div className="space-y-3">
                  {topVideos.map((video, index) => (
                    <div 
                      key={video.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/video/${video.id}`)}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {index + 1}
                      </div>
                      <div className="w-12 h-12 rounded-md bg-muted overflow-hidden flex-shrink-0">
                        {video.thumbnail_url ? (
                          <img 
                            src={video.thumbnail_url} 
                            alt="" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">
                          {video.caption || "Untitled"}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {formatNumber(video.views_count || 0)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" /> {formatNumber(video.likes_count || 0)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" /> {formatNumber(video.comments_count || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No videos yet. Upload your first video to see analytics!
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
