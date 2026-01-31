import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Users, Flag, FileVideo, Ban, ListChecks, AlertTriangle, History, Zap, BookX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserManagement } from "@/components/admin/UserManagement";
import { ContentModeration } from "@/components/admin/ContentModeration";
import { ModerationQueue } from "@/components/admin/ModerationQueue";
import { AppealsManagement } from "@/components/admin/AppealsManagement";
import { AdminLogs } from "@/components/admin/AdminLogs";
import { FlaggedContent } from "@/components/admin/FlaggedContent";
import { KeywordManagement } from "@/components/admin/KeywordManagement";

interface DashboardStats {
  totalUsers: number;
  totalVideos: number;
  pendingReports: number;
  hiddenVideos: number;
  bannedUsers: number;
  pendingAppeals: number;
  pendingFlags: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isModerator, loading: rolesLoading } = useUserRoles(user?.id);
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalVideos: 0,
    pendingReports: 0,
    hiddenVideos: 0,
    bannedUsers: 0,
    pendingAppeals: 0,
    pendingFlags: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const hasAccess = isAdmin || isModerator;

  useEffect(() => {
    if (!rolesLoading && !hasAccess) {
      toast({
        title: "Access denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [rolesLoading, hasAccess, navigate, toast]);

  useEffect(() => {
    if (hasAccess) {
      fetchStats();
    }
  }, [hasAccess]);

  const fetchStats = async () => {
    setStatsLoading(true);

    const [usersRes, videosRes, reportsRes, hiddenRes, bannedRes, appealsRes, flagsRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("videos").select("id", { count: "exact", head: true }).eq("visibility", "public"),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("videos").select("id", { count: "exact", head: true }).eq("visibility", "hidden"),
      supabase.from("banned_users").select("id", { count: "exact", head: true }),
      supabase.from("appeals").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("content_flags").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    setStats({
      totalUsers: usersRes.count || 0,
      totalVideos: videosRes.count || 0,
      pendingReports: reportsRes.count || 0,
      hiddenVideos: hiddenRes.count || 0,
      bannedUsers: bannedRes.count || 0,
      pendingAppeals: appealsRes.count || 0,
      pendingFlags: flagsRes.count || 0,
    });

    setStatsLoading(false);
  };

  if (rolesLoading) {
    return (
      <div className="min-h-[var(--app-height)] bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-[var(--app-height)] bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center p-4 border-b border-border sticky top-0 bg-background z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <Shield className="w-5 h-5 ml-2 text-primary" />
        <h1 className="font-bold text-lg ml-2">Admin Dashboard</h1>
        <Badge variant="secondary" className="ml-auto">
          {isAdmin ? "Admin" : "Moderator"}
        </Badge>
      </header>

      <div className="p-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                Total Users
              </CardDescription>
              <CardTitle className="text-2xl">
                {statsLoading ? "..." : stats.totalUsers}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <FileVideo className="w-4 h-4" />
                Public Videos
              </CardDescription>
              <CardTitle className="text-2xl">
                {statsLoading ? "..." : stats.totalVideos}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Flag className="w-4 h-4" />
                Pending Reports
              </CardDescription>
              <CardTitle className="text-2xl text-destructive">
                {statsLoading ? "..." : stats.pendingReports}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Hidden Videos
              </CardDescription>
              <CardTitle className="text-2xl">
                {statsLoading ? "..." : stats.hiddenVideos}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Ban className="w-4 h-4" />
                Banned Users
              </CardDescription>
              <CardTitle className="text-2xl text-destructive">
                {statsLoading ? "..." : stats.bannedUsers}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <ListChecks className="w-4 h-4" />
                Pending Appeals
              </CardDescription>
              <CardTitle className="text-2xl">
                {statsLoading ? "..." : stats.pendingAppeals}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="queue" className="w-full">
          <TabsList className="w-full grid grid-cols-4 md:grid-cols-7 h-auto">
            <TabsTrigger value="queue" className="gap-1 text-xs md:text-sm px-2">
              <ListChecks className="w-4 h-4" />
              <span className="hidden sm:inline">Queue</span>
              {stats.pendingReports > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {stats.pendingReports}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="flagged" className="gap-1 text-xs md:text-sm px-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">AI</span>
              {stats.pendingFlags > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {stats.pendingFlags}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1 text-xs md:text-sm px-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="appeals" className="gap-1 text-xs md:text-sm px-2">
              <Flag className="w-4 h-4" />
              <span className="hidden sm:inline">Appeals</span>
              {stats.pendingAppeals > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {stats.pendingAppeals}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="keywords" className="gap-1 text-xs md:text-sm px-2">
              <BookX className="w-4 h-4" />
              <span className="hidden sm:inline">Keywords</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-1 text-xs md:text-sm px-2">
              <FileVideo className="w-4 h-4" />
              <span className="hidden sm:inline">Content</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1 text-xs md:text-sm px-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="mt-4">
            <ModerationQueue />
          </TabsContent>

          <TabsContent value="flagged" className="mt-4">
            <FlaggedContent />
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <UserManagement />
          </TabsContent>

          <TabsContent value="appeals" className="mt-4">
            <AppealsManagement />
          </TabsContent>

          <TabsContent value="keywords" className="mt-4">
            <KeywordManagement />
          </TabsContent>

          <TabsContent value="content" className="mt-4">
            <ContentModeration />
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <AdminLogs />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
