import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Eye, Layers, Star } from "lucide-react";
import { VideoSeries, Video } from "@/types/video";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SeriesCreator {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface SeriesPosterCardProps {
  series: VideoSeries & { profiles?: SeriesCreator | null; creator?: SeriesCreator | null };
  size?: "sm" | "md" | "lg";
  showCreator?: boolean;
  className?: string;
  onClick?: () => void;
}

const formatCount = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

export function SeriesPosterCard({ 
  series, 
  size = "md", 
  showCreator = true,
  className,
  onClick,
}: SeriesPosterCardProps) {
  const navigate = useNavigate();
  const [coverUrl, setCoverUrl] = useState<string | null>(series.cover_image_url);
  const [loading, setLoading] = useState(!series.cover_image_url && !!series.cover_video_id);

  // If no cover image but has cover_video_id, fetch the video thumbnail
  useEffect(() => {
    async function fetchCoverFromVideo() {
      if (series.cover_image_url) {
        setCoverUrl(series.cover_image_url);
        setLoading(false);
        return;
      }

      if (!series.cover_video_id) {
        // No cover image and no cover video, try to get first video thumbnail
        const { data } = await supabase
          .from("videos")
          .select("thumbnail_url, video_url")
          .eq("series_id", series.id)
          .order("series_order", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (data?.thumbnail_url) {
          setCoverUrl(data.thumbnail_url);
        }
        setLoading(false);
        return;
      }

      // Fetch cover video thumbnail
      const { data } = await supabase
        .from("videos")
        .select("thumbnail_url, video_url")
        .eq("id", series.cover_video_id)
        .maybeSingle();

      if (data?.thumbnail_url) {
        setCoverUrl(data.thumbnail_url);
      }
      setLoading(false);
    }

    fetchCoverFromVideo();
  }, [series.id, series.cover_image_url, series.cover_video_id]);

  const creator = series.profiles || series.creator;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/series/${series.id}`);
    }
  };

  const sizeClasses = {
    sm: "w-28",
    md: "w-36",
    lg: "w-44",
  };

  const aspectClasses = {
    sm: "aspect-[2/3]",
    md: "aspect-[2/3]",
    lg: "aspect-[2/3]",
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex-shrink-0 text-left group relative",
        sizeClasses[size],
        className
      )}
    >
      {/* Movie Poster Container */}
      <div 
        className={cn(
          "relative overflow-hidden rounded-xl bg-card border border-border/50",
          "shadow-lg transition-all duration-300",
          "group-hover:shadow-xl group-hover:shadow-primary/10 group-hover:border-primary/30",
          "group-hover:-translate-y-1",
          aspectClasses[size]
        )}
      >
        {/* Cover Image */}
        {loading ? (
          <Skeleton className="absolute inset-0 w-full h-full" />
        ) : coverUrl ? (
          <img
            src={coverUrl}
            alt={series.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          /* Fallback gradient poster */
          <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/10 to-background flex flex-col items-center justify-center p-3">
            <Layers className="w-10 h-10 text-primary/60 mb-2" />
            <p className="text-xs text-center text-foreground/70 font-medium line-clamp-2">
              {series.title}
            </p>
          </div>
        )}

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

        {/* Premium Badge (top right) */}
        {series.videos_count >= 5 && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 bg-gold/90 rounded-full text-[10px] font-bold text-black">
            <Star className="w-2.5 h-2.5 fill-current" />
            <span>SERIES</span>
          </div>
        )}

        {/* Parts Badge (top left) */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-background/90 backdrop-blur-sm rounded-full text-[10px] font-semibold">
          <Layers className="w-3 h-3 text-primary" />
          <span>{series.videos_count} parts</span>
        </div>

        {/* Play Button Overlay on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-12 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-lg glow-primary">
            <Play className="w-5 h-5 text-primary-foreground fill-primary-foreground ml-0.5" />
          </div>
        </div>

        {/* Bottom Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {/* Title */}
          <h3 className={cn(
            "font-bold text-white line-clamp-2 leading-tight",
            size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"
          )}>
            {series.title}
          </h3>

          {/* Views */}
          <div className="flex items-center gap-1 mt-1 text-white/70">
            <Eye className="w-3 h-3" />
            <span className="text-[10px] font-medium">
              {formatCount(series.total_views)} views
            </span>
          </div>
        </div>
      </div>

      {/* Creator Info (Below Poster) */}
      {showCreator && creator?.username && (
        <div className="mt-2 flex items-center gap-1.5 px-0.5">
          {creator.avatar_url && (
            <img 
              src={creator.avatar_url} 
              alt={creator.username}
              className="w-4 h-4 rounded-full object-cover ring-1 ring-border"
            />
          )}
          <span className="text-xs text-muted-foreground truncate">
            @{creator.username}
          </span>
        </div>
      )}
    </button>
  );
}

// Loading skeleton for the poster card
export function SeriesPosterCardSkeleton({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-28",
    md: "w-36",
    lg: "w-44",
  };

  return (
    <div className={cn("flex-shrink-0", sizeClasses[size])}>
      <Skeleton className="aspect-[2/3] rounded-xl" />
      <div className="mt-2 space-y-1 px-0.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}
