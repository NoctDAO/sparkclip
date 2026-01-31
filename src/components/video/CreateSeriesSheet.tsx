import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVideoSeries } from "@/hooks/useVideoSeries";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Video } from "@/types/video";

interface CreateSeriesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSeriesCreated?: (seriesId: string) => void;
  preSelectedVideoId?: string;
}

export function CreateSeriesSheet({ 
  open, 
  onOpenChange, 
  onSeriesCreated,
  preSelectedVideoId 
}: CreateSeriesSheetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { createSeries, addToSeries } = useVideoSeries();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadUserVideos();
      // Pre-select video if provided
      if (preSelectedVideoId) {
        setSelectedVideoIds(new Set([preSelectedVideoId]));
      }
    }
  }, [open, user, preSelectedVideoId]);

  useEffect(() => {
    if (!open) {
      // Reset state when closed
      setTitle("");
      setDescription("");
      setSelectedVideoIds(new Set());
    }
  }, [open]);

  const loadUserVideos = async () => {
    if (!user) return;
    
    setLoading(true);
    
    // Fetch user's videos that are NOT already in a series
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", user.id)
      .is("series_id", null)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setVideos(data as Video[]);
    }
    
    setLoading(false);
  };

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideoIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  const handleCreateSeries = async () => {
    if (!title.trim()) {
      toast({ title: "Please enter a series title", variant: "destructive" });
      return;
    }

    if (selectedVideoIds.size === 0) {
      toast({ title: "Please select at least one video", variant: "destructive" });
      return;
    }

    setCreating(true);

    // Create the series
    const series = await createSeries(title.trim(), description.trim() || undefined);
    
    if (!series) {
      setCreating(false);
      return;
    }

    // Add selected videos to the series in order
    const videoIdsArray = Array.from(selectedVideoIds);
    let order = 1;
    
    for (const videoId of videoIdsArray) {
      const { error } = await supabase
        .from("videos")
        .update({ series_id: series.id, series_order: order })
        .eq("id", videoId);
      
      if (!error) {
        order++;
      }
    }

    setCreating(false);
    toast({ title: "Series created successfully!" });
    onOpenChange(false);
    
    if (onSeriesCreated) {
      onSeriesCreated(series.id);
    } else {
      // Navigate to the new series
      navigate(`/series/${series.id}`);
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Create New Series
          </SheetTitle>
          <SheetDescription>
            Create a series and add your videos to it
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col h-[calc(85vh-140px)] gap-4">
          {/* Series Details */}
          <div className="space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Series title"
              className="font-medium"
            />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description (optional)"
              className="text-sm resize-none"
              rows={2}
            />
          </div>

          {/* Video Selection */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <p className="text-sm font-medium mb-2">
              Select videos to add ({selectedVideoIds.size} selected)
            </p>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No available videos</p>
                <p className="text-xs mt-1">All your videos are already in a series</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-3 gap-2">
                  {videos.map((video) => (
                    <button
                      key={video.id}
                      onClick={() => toggleVideoSelection(video.id)}
                      className={cn(
                        "relative aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all",
                        selectedVideoIds.has(video.id)
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-transparent hover:border-muted-foreground/30"
                      )}
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
                      
                      {/* Selection indicator */}
                      {selectedVideoIds.has(video.id) && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                      
                      {/* Views count */}
                      <div className="absolute bottom-1 left-1 text-xs text-white bg-black/60 px-1.5 py-0.5 rounded">
                        {formatCount(video.views_count)} views
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Create Button */}
          <div className="pt-4 border-t border-border">
            <Button
              onClick={handleCreateSeries}
              disabled={creating || !title.trim() || selectedVideoIds.size === 0}
              className="w-full"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4 mr-2" />
                  Create Series with {selectedVideoIds.size} video{selectedVideoIds.size !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
