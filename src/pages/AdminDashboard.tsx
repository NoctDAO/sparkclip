import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Users, Flag, FileVideo, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserManagement } from "@/components/admin/UserManagement";
import { ContentModeration } from "@/components/admin/ContentModeration";

interface DashboardStats {
  totalUsers: number;
  totalVideos: number;
  pendingReports: number;
  totalComments: number;
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
    totalComments: 0,
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

    const [usersRes, videosRes, reportsRes, commentsRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("videos").select("id", { count: "exact", head: true }),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("comments").select("id", { count: "exact", head: true }),
    ]);

    setStats({
      totalUsers: usersRes.count || 0,
      totalVideos: videosRes.count || 0,
      pendingReports: reportsRes.count || 0,
      totalComments: commentsRes.count || 0,
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
        <div className="grid grid-cols-2 gap-4 mb-6">
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
                Total Videos
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
                <BarChart3 className="w-4 h-4" />
                Total Comments
              </CardDescription>
              <CardTitle className="text-2xl">
                {statsLoading ? "..." : stats.totalComments}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="users" className="gap-1">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1">
              <Flag className="w-4 h-4" />
              Reports
              {stats.pendingReports > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {stats.pendingReports}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-1">
              <FileVideo className="w-4 h-4" />
              Content
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <UserManagement />
          </TabsContent>

          <TabsContent value="reports" className="mt-4">
            <div className="text-center py-8">
              <Flag className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                View and manage reports in the dedicated moderation page
              </p>
              <Button onClick={() => navigate("/moderation")}>
                Go to Reports
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="content" className="mt-4">
            <ContentModeration />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
