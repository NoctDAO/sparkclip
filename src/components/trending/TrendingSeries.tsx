import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, Eye, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VideoSeries } from "@/types/video";

interface SeriesWithCreator extends VideoSeries {
  profiles?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function TrendingSeries() {
  const navigate = useNavigate();
  const [series, setSeries] = useState<SeriesWithCreator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendingSeries();
  }, []);

  const fetchTrendingSeries = async () => {
    // Get series with most views and videos
    const { data, error } = await supabase
      .from("video_series")
      .select("*")
      .gte("videos_count", 2)
      .order("total_views", { ascending: false })
      .limit(10);

    if (error || !data) {
      setLoading(false);
      return;
    }

    // Fetch creator profiles
    const userIds = [...new Set(data.map(s => s.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const seriesWithCreators: SeriesWithCreator[] = data.map(s => ({
      ...s,
      profiles: profileMap.get(s.user_id) || null,
    }));

    setSeries(seriesWithCreators);
    setLoading(false);
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Popular Series</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-shrink-0 w-40">
              <div className="aspect-[4/3] bg-secondary rounded-lg animate-pulse" />
              <div className="h-4 bg-secondary rounded mt-2 animate-pulse" />
              <div className="h-3 bg-secondary rounded mt-1 w-2/3 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (series.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-6 border-b border-border">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          Popular Series
        </h2>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
        {series.map((s) => (
          <button
            key={s.id}
            onClick={() => navigate(`/series/${s.id}`)}
            className="flex-shrink-0 w-44 text-left group"
          >
            {/* Cover */}
            <div className="aspect-[4/3] bg-secondary rounded-lg overflow-hidden relative">
              {s.cover_image_url ? (
                <img
                  src={s.cover_image_url}
                  alt={s.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                  <Layers className="w-10 h-10 text-primary/60" />
                </div>
              )}
              
              {/* Parts badge */}
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-background/90 backdrop-blur-sm rounded-full text-xs font-medium flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {s.videos_count} parts
              </div>

              {/* Views badge */}
              <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-background/90 backdrop-blur-sm rounded-full text-xs font-medium flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {formatCount(s.total_views)}
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ChevronRight className="w-8 h-8 text-primary" />
              </div>
            </div>

            {/* Info */}
            <div className="mt-2">
              <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                {s.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                @{s.profiles?.username || "user"}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
