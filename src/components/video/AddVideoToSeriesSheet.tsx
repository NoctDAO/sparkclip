import { useState, useEffect } from "react";
import { Check, Eye, Layers } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Video, VideoSeries } from "@/types/video";
import { useToast } from "@/hooks/use-toast";

interface AddVideoToSeriesSheetProps {
  series: VideoSeries;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVideoAdded: () => void;
  existingVideoIds: string[];
}

export function AddVideoToSeriesSheet({
  series,
  open,
  onOpenChange,
  onVideoAdded,
  existingVideoIds,
}: AddVideoToSeriesSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchAvailableVideos();
      setSelectedVideoIds(new Set());
    }
  }, [open, user]);

  const fetchAvailableVideos = async () => {
    if (!user) return;

    setLoading(true);
    // Fetch user's videos that are NOT already in this series
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Filter out videos already in this series
      const availableVideos = data.filter(
        (video) => !existingVideoIds.includes(video.id)
      );
      setVideos(availableVideos as Video[]);
    }
    setLoading(false);
  };

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideoIds((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  const handleAddVideos = async () => {
    if (selectedVideoIds.size === 0) return;

    setAdding(true);

    // Get the next series_order number
    const { data: existingCount } = await supabase
      .from("videos")
      .select("series_order")
      .eq("series_id", series.id)
      .order("series_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextOrder = (existingCount?.series_order || 0) + 1;

    // Update each selected video to add it to the series
    const updates = Array.from(selectedVideoIds).map(async (videoId) => {
      const { error } = await supabase
        .from("videos")
        .update({
          series_id: series.id,
          series_order: nextOrder++,
        })
        .eq("id", videoId);

      return { videoId, error };
    });

    const results = await Promise.all(updates);
    const failed = results.filter((r) => r.error);

    setAdding(false);

    if (failed.length === 0) {
      toast({
        title: `Added ${selectedVideoIds.size} video${selectedVideoIds.size > 1 ? "s" : ""} to series`,
      });
      onVideoAdded();
      onOpenChange(false);
    } else {
      toast({
        title: "Some videos failed to add",
        variant: "destructive",
      });
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Add Videos to {series.title}</SheetTitle>
            {selectedVideoIds.size > 0 && (
              <button
                onClick={handleAddVideos}
                disabled={adding}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium disabled:opacity-50"
              >
                {adding ? "Adding..." : `Add (${selectedVideoIds.size})`}
              </button>
            )}
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Layers className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-lg font-medium">No available videos</p>
            <p className="text-sm text-center mt-1">
              All your videos are already in this series or you haven't uploaded any yet.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(70vh-100px)]">
            <div className="grid grid-cols-3 gap-1 pr-4">
              {videos.map((video) => {
                const isSelected = selectedVideoIds.has(video.id);
                const isInAnotherSeries = video.series_id && video.series_id !== series.id;

                return (
                  <button
                    key={video.id}
                    onClick={() => toggleVideoSelection(video.id)}
                    className={`aspect-[9/16] relative rounded-lg overflow-hidden transition-all ${
                      isSelected
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : ""
                    }`}
                  >
                    {video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={video.video_url}
                        className="w-full h-full object-cover"
                        muted
                      />
                    )}

                    {/* Dark overlay for selected */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-5 h-5 text-primary-foreground" />
                        </div>
                      </div>
                    )}

                    {/* Series indicator if in another series */}
                    {isInAnotherSeries && (
                      <div className="absolute top-1 right-1 p-1 bg-background/80 rounded">
                        <Layers className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}

                    {/* View count */}
                    <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-xs font-semibold drop-shadow-lg">
                      <Eye className="w-3 h-3" />
                      <span>{formatCount(video.views_count)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
