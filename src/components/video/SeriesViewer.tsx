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
      <SheetContent side="bottom" className="h-[45vh] rounded-t-2xl">
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
              {videos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => handleVideoClick(video)}
                  className="flex-shrink-0 w-24 group"
                >
                  {/* Movie Poster Style Thumbnail */}
                  <div 
                    className={cn(
                      "aspect-[2/3] bg-card rounded-xl overflow-hidden relative shadow-md transition-all",
                      "group-hover:shadow-lg group-hover:-translate-y-1",
                      video.id === currentVideoId && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    )}
                  >
                    {video.thumbnail_url ? (
                      <img 
                        src={video.thumbnail_url} 
                        alt={`Part ${video.series_order}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <video 
                        src={video.video_url} 
                        className="w-full h-full object-cover"
                        muted
                      />
                    )}
                    
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {/* Part number overlay */}
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-background/90 backdrop-blur-sm rounded-full text-[9px] font-bold">
                      Part {video.series_order}
                    </div>

                    {/* Play icon for non-current videos */}
                    {video.id !== currentVideoId && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-8 h-8 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
                          <Play className="w-3.5 h-3.5 text-primary-foreground fill-primary-foreground ml-0.5" />
                        </div>
                      </div>
                    )}

                    {/* Now playing indicator */}
                    {video.id === currentVideoId && (
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 px-1.5 py-0.5 bg-primary rounded-full text-[9px] font-bold text-primary-foreground text-center">
                        Playing
                      </div>
                    )}

                    {/* View count at bottom */}
                    {video.id !== currentVideoId && (
                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 text-white/80 text-[9px]">
                        <Eye className="w-2.5 h-2.5" />
                        <span>{formatCount(video.views_count)}</span>
                      </div>
                    )}
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
