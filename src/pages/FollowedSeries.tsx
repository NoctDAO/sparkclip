import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Layers, Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { VideoSeries } from "@/types/video";

interface FollowedSeriesItem extends VideoSeries {
  creator?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export default function FollowedSeries() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [series, setSeries] = useState<FollowedSeriesItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFollowedSeries();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchFollowedSeries = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("series_follows")
      .select(`
        series_id,
        video_series (
          id,
          user_id,
          title,
          description,
          cover_image_url,
          cover_video_id,
          videos_count,
          total_views,
          created_at,
          updated_at
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const seriesWithCreators = await Promise.all(
        data
          .filter((item: any) => item.video_series)
          .map(async (item: any) => {
            const seriesData = item.video_series;
            
            // Fetch creator profile
            const { data: creatorData } = await supabase
              .from("profiles")
              .select("username, display_name, avatar_url")
              .eq("user_id", seriesData.user_id)
              .maybeSingle();

            return {
              ...seriesData,
              creator: creatorData,
            } as FollowedSeriesItem;
          })
      );

      setSeries(seriesWithCreators);
    }

    setLoading(false);
  };

  const handleUnfollow = async (seriesId: string) => {
    if (!user) return;

    await supabase
      .from("series_follows")
      .delete()
      .eq("series_id", seriesId)
      .eq("user_id", user.id);

    setSeries((prev) => prev.filter((s) => s.id !== seriesId));
  };

  if (!user) {
    return (
      <div className="min-h-[var(--app-height)] bg-background flex flex-col items-center justify-center p-4">
        <Layers className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-foreground mb-2">Sign in to view followed series</p>
        <p className="text-sm text-muted-foreground mb-4">Keep track of your favorite series</p>
        <Button onClick={() => navigate("/auth")}>Sign In</Button>
      </div>
    );
  }

  return (
    <div className="min-h-[var(--app-height)] bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center p-4 border-b border-border sticky top-0 bg-background z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-bold text-lg ml-2">Following</h1>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : series.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <Layers className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">No series followed yet</p>
          <p className="text-sm text-muted-foreground text-center">
            Follow series to get notified when new parts are added
          </p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {series.map((item) => (
            <Card
              key={item.id}
              className="overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => navigate(`/series/${item.id}`)}
            >
              <CardContent className="p-0">
                <div className="flex gap-4">
                  {/* Cover Image */}
                  <div className="w-24 h-24 bg-muted flex-shrink-0">
                    {item.cover_image_url ? (
                      <img
                        src={item.cover_image_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Layers className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 py-3 pr-3 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground line-clamp-1">
                        {item.title}
                      </h3>
                      {item.creator && (
                        <p className="text-sm text-muted-foreground">
                          by {item.creator.display_name || item.creator.username || "Unknown"}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.videos_count} {item.videos_count === 1 ? "part" : "parts"} • {item.total_views.toLocaleString()} views
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="self-start mt-2 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnfollow(item.id);
                      }}
                    >
                      <Bell className="w-4 h-4 mr-1 fill-current" />
                      Following
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
