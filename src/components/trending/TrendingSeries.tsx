import { useState, useEffect } from "react";
import { Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VideoSeries } from "@/types/video";
import { SeriesPosterCard, SeriesPosterCardSkeleton } from "@/components/video/SeriesPosterCard";

interface SeriesWithCreator extends VideoSeries {
  profiles?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function TrendingSeries() {
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

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Popular Series
          </h2>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
          {[1, 2, 3, 4].map((i) => (
            <SeriesPosterCardSkeleton key={i} size="md" />
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          Popular Series
        </h2>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
        {series.map((s) => (
          <SeriesPosterCard
            key={s.id}
            series={s}
            size="md"
            showCreator
          />
        ))}
      </div>
    </div>
  );
}
