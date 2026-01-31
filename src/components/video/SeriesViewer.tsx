import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Eye, Play } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { VideoSeries, Video } from "@/types/video";
import { useVideoSeries } from "@/hooks/useVideoSeries";
import { cn } from "@/lib/utils";

interface SeriesViewerProps {
  series: VideoSeries;
  currentVideoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SeriesViewer({ series, currentVideoId, open, onOpenChange }: SeriesViewerProps) {
  const navigate = useNavigate();
  const { getSeriesVideos } = useVideoSeries();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && series.id) {
      loadSeriesVideos();
    }
  }, [open, series.id]);

  const loadSeriesVideos = async () => {
    setLoading(true);
    const seriesVideos = await getSeriesVideos(series.id);
    setVideos(seriesVideos);
    setLoading(false);
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handleVideoClick = (video: Video) => {
    onOpenChange(false);
    navigate(`/video/${video.id}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[40vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-left">{series.title}</SheetTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {series.videos_count} parts • {formatCount(series.total_views)} total views
              </p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-4">
              {videos.map((video, index) => (
                <button
                  key={video.id}
                  onClick={() => handleVideoClick(video)}
                  className={cn(
                    "flex-shrink-0 w-28 relative group",
                    video.id === currentVideoId && "ring-2 ring-primary rounded-lg"
                  )}
                >
                  <div className="aspect-[9/16] bg-secondary rounded-lg overflow-hidden relative">
                    {video.thumbnail_url ? (
                      <img 
                        src={video.thumbnail_url} 
                        alt={`Part ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video 
                        src={video.video_url} 
                        className="w-full h-full object-cover"
                        muted
                      />
                    )}
                    
                    {/* Part number overlay */}
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-background/80 rounded text-[10px] font-semibold">
                      Part {video.series_order}
                    </div>

                    {/* Play icon for non-current videos */}
                    {video.id !== currentVideoId && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-8 h-8 text-white fill-white" />
                      </div>
                    )}

                    {/* Now playing indicator */}
                    {video.id === currentVideoId && (
                      <div className="absolute bottom-1 left-1 right-1 px-1.5 py-0.5 bg-primary rounded text-[10px] font-semibold text-primary-foreground text-center">
                        Now Playing
                      </div>
                    )}
                  </div>

                  {/* View count */}
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Eye className="w-3 h-3" />
                    <span>{formatCount(video.views_count)}</span>
                  </div>
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
