import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Layers, Bell, Eye, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { VideoSeries } from "@/types/video";
import { cn } from "@/lib/utils";

interface FollowedSeriesItem extends VideoSeries {
  creator?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  firstVideoThumbnail?: string | null;
}

const formatCount = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

function FollowedSeriesCard({ 
  item, 
  onUnfollow 
}: { 
  item: FollowedSeriesItem; 
  onUnfollow: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [coverUrl, setCoverUrl] = useState<string | null>(item.cover_image_url || null);
  const [loading, setLoading] = useState(!item.cover_image_url);

  useEffect(() => {
    async function fetchCover() {
      if (item.cover_image_url) {
        setCoverUrl(item.cover_image_url);
        setLoading(false);
        return;
      }

      setLoading(true);

      // Fallback: get first video (part 1) thumbnail
      const { data } = await supabase
        .from("videos")
        .select("thumbnail_url")
        .eq("series_id", item.id)
        .order("series_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data?.thumbnail_url) {
        setCoverUrl(data.thumbnail_url);
      }
      setLoading(false);
    }

    fetchCover();
  }, [item.id, item.cover_image_url]);

  return (
    <div
      className="flex items-stretch gap-4 p-3 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group"
      onClick={() => navigate(`/series/${item.id}`)}
    >
      {/* Movie Poster Thumbnail */}
      <div className="w-24 aspect-[2/3] bg-muted rounded-lg overflow-hidden flex-shrink-0 relative shadow-md">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
            <Layers className="w-8 h-8 text-primary/60" />
          </div>
        )}

        {/* Parts badge */}
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-background/90 backdrop-blur-sm rounded-full text-[10px] font-semibold flex items-center gap-0.5">
          <Layers className="w-3 h-3 text-primary" />
          {item.videos_count}
        </div>

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
            <Play className="w-4 h-4 text-primary-foreground fill-primary-foreground ml-0.5" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
        <div>
          <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          {item.creator && (
            <div className="flex items-center gap-1.5 mt-1">
              {item.creator.avatar_url && (
                <img 
                  src={item.creator.avatar_url}
                  alt=""
                  className="w-4 h-4 rounded-full object-cover"
                />
              )}
              <p className="text-sm text-muted-foreground">
                {item.creator.display_name || item.creator.username || "Unknown"}
              </p>
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {item.videos_count} {item.videos_count === 1 ? "part" : "parts"}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {formatCount(item.total_views)}
            </span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="self-start mt-2 text-muted-foreground hover:text-foreground h-8"
          onClick={(e) => {
            e.stopPropagation();
            onUnfollow(item.id);
          }}
        >
          <Bell className="w-4 h-4 mr-1 fill-current" />
          Following
        </Button>
      </div>
    </div>
  );
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
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Layers className="w-10 h-10 text-primary" />
        </div>
        <p className="text-lg font-semibold text-foreground mb-2">Sign in to view followed series</p>
        <p className="text-sm text-muted-foreground mb-4 text-center">Keep track of your favorite series</p>
        <Button onClick={() => navigate("/auth")} className="glow-primary">Sign In</Button>
      </div>
    );
  }

  return (
    <div className="min-h-[var(--app-height)] bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center p-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur-md z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-accent rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-bold text-lg ml-2 tracking-tight">Following</h1>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : series.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Layers className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-2">No series followed yet</p>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Follow series to get notified when new parts are added
          </p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {series.map((item) => (
            <FollowedSeriesCard
              key={item.id}
              item={item}
              onUnfollow={handleUnfollow}
            />
          ))}
        </div>
      )}
    </div>
  );
}
