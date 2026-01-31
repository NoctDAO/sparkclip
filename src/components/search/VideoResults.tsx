import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import { VideoThumbnail } from "@/components/video/VideoThumbnail";
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
    <div className="grid grid-cols-3 gap-0.5 p-1">
      {videos.map((video, index) => (
        <div
          key={video.id}
          className="relative grid-item-hover"
        >
          <VideoThumbnail
            thumbnailUrl={video.thumbnail_url}
            videoUrl={video.video_url}
            alt={video.caption || "Video thumbnail"}
            onClick={() => navigate(`/?video=${video.id}`)}
            className="rounded-sm"
            priority={index < 6}
          />
          {/* View count overlay */}
          <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-xs font-semibold drop-shadow-lg pointer-events-none">
            <Eye className="w-3 h-3" />
            <span>{formatCount(video.views_count)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
