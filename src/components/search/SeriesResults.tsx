import { useNavigate } from "react-router-dom";
import { Layers, Eye } from "lucide-react";
import { VideoSeries } from "@/types/video";

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

export function SeriesResults({ series }: SeriesResultsProps) {
  const navigate = useNavigate();

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (series.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Layers className="w-12 h-12 mb-4 opacity-50" />
        <p>No series found</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {series.map((s) => (
        <button
          key={s.id}
          onClick={() => navigate(`/series/${s.id}`)}
          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
        >
          {/* Cover */}
          <div className="w-20 h-14 bg-secondary rounded-lg overflow-hidden flex-shrink-0 relative">
            {s.cover_image_url ? (
              <img
                src={s.cover_image_url}
                alt={s.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                <Layers className="w-6 h-6 text-primary/60" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{s.title}</p>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                {s.videos_count} parts
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {formatCount(s.total_views)}
              </span>
            </div>
            {s.profiles?.username && (
              <p className="text-xs text-muted-foreground mt-0.5">
                @{s.profiles.username}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
