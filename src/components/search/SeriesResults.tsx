import { useNavigate } from "react-router-dom";
import { Layers, Eye, Play } from "lucide-react";
import { VideoSeries } from "@/types/video";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SeriesWithCreator extends VideoSeries {
  profiles?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface SeriesResultsProps {
  series: SeriesWithCreator[];
}

const formatCount = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

// Individual series poster item for search results
function SeriesResultItem({ series }: { series: SeriesWithCreator }) {
  const navigate = useNavigate();
  const [coverUrl, setCoverUrl] = useState<string | null>(series.cover_image_url);

  useEffect(() => {
    async function fetchCover() {
      if (series.cover_image_url) {
        setCoverUrl(series.cover_image_url);
        return;
      }

      // Try to get first video thumbnail
      const { data } = await supabase
        .from("videos")
        .select("thumbnail_url")
        .eq("series_id", series.id)
        .order("series_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data?.thumbnail_url) {
        setCoverUrl(data.thumbnail_url);
      }
    }

    fetchCover();
  }, [series.id, series.cover_image_url]);

  return (
    <button
      onClick={() => navigate(`/series/${series.id}`)}
      className="w-full flex items-stretch gap-4 p-3 rounded-xl hover:bg-accent/50 transition-all group"
    >
      {/* Movie Poster Thumbnail */}
      <div className="w-20 aspect-[2/3] bg-card rounded-lg overflow-hidden flex-shrink-0 relative shadow-md group-hover:shadow-lg transition-shadow">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={series.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
            <Layers className="w-6 h-6 text-primary/60" />
          </div>
        )}

        {/* Parts badge */}
        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-background/90 backdrop-blur-sm rounded-full text-[9px] font-semibold flex items-center gap-0.5">
          <Layers className="w-2.5 h-2.5 text-primary" />
          {series.videos_count}
        </div>

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-primary/90 flex items-center justify-center">
            <Play className="w-3.5 h-3.5 text-primary-foreground fill-primary-foreground ml-0.5" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
        <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
          {series.title}
        </p>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            {series.videos_count} parts
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {formatCount(series.total_views)}
          </span>
        </div>
        {series.profiles?.username && (
          <div className="flex items-center gap-1.5 mt-2">
            {series.profiles.avatar_url && (
              <img 
                src={series.profiles.avatar_url} 
                alt=""
                className="w-4 h-4 rounded-full object-cover"
              />
            )}
            <p className="text-xs text-muted-foreground">
              @{series.profiles.username}
            </p>
          </div>
        )}
      </div>
    </button>
  );
}

export function SeriesResults({ series }: SeriesResultsProps) {
  if (series.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Layers className="w-12 h-12 mb-4 opacity-50" />
        <p>No series found</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {series.map((s) => (
        <SeriesResultItem key={s.id} series={s} />
      ))}
    </div>
  );
}
