import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import { Video } from "@/types/video";

interface VideoResultsProps {
  videos: Video[];
}

export function VideoResults({ videos }: VideoResultsProps) {
  const navigate = useNavigate();

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>No videos found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 p-1">
      {videos.map((video) => (
        <div
          key={video.id}
          className="aspect-[9/16] bg-secondary cursor-pointer overflow-hidden rounded-sm relative group"
          onClick={() => navigate(`/?video=${video.id}`)}
        >
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt={video.caption || "Video thumbnail"}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <video
              src={video.video_url}
              className="w-full h-full object-cover"
              muted
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-xs font-semibold drop-shadow-lg">
            <Eye className="w-3 h-3" />
            <span>{formatCount(video.views_count)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
