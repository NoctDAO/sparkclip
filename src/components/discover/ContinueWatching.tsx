import { useNavigate } from "react-router-dom";
import { Play, Clock } from "lucide-react";
import { useWatchHistory } from "@/hooks/useWatchHistory";
import { VideoThumbnail } from "@/components/video/VideoThumbnail";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

export function ContinueWatching() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { continueWatching, loading } = useWatchHistory();

  // Don't show for non-logged-in users
  if (!user) return null;

  // Loading state
  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-lg">Continue Watching</h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="shrink-0">
              <Skeleton className="w-28 aspect-[9/16] rounded-lg" shimmer />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // No items to continue
  if (continueWatching.length === 0) return null;

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-lg">Continue Watching</h2>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide scroll-fade-edges">
        {continueWatching.map((entry, index) => (
          <div
            key={entry.id}
            className="relative w-28 shrink-0 cursor-pointer group"
            onClick={() => navigate(`/?video=${entry.video_id}`)}
          >
            <VideoThumbnail
              thumbnailUrl={entry.video?.thumbnail_url}
              videoUrl={entry.video?.video_url || ""}
              alt={entry.video?.caption || "Video"}
              className="rounded-lg"
              priority={index < 4}
            />

            {/* Progress bar overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50 rounded-b-lg overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${entry.watch_progress * 100}%` }}
              />
            </div>

            {/* Play button overlay on hover */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="w-5 h-5 text-black fill-black ml-0.5" />
              </div>
            </div>

            {/* Creator name */}
            {entry.video?.profile && (
              <div className="absolute bottom-2 left-1 right-1 pointer-events-none">
                <p className="text-[10px] text-white font-medium truncate drop-shadow-lg px-1">
                  @{entry.video.profile.username || entry.video.profile.display_name}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
