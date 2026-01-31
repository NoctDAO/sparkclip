import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, Plus, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVideoSeries } from "@/hooks/useVideoSeries";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { VideoSeries } from "@/types/video";

interface AddToSeriesSheetProps {
  videoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddToSeriesSheet({ 
  videoId, 
  open, 
  onOpenChange,
  onSuccess 
}: AddToSeriesSheetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { getUserSeries, addToSeries, createSeries } = useVideoSeries();
  
  const [userSeries, setUserSeries] = useState<VideoSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [currentSeriesId, setCurrentSeriesId] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      loadUserSeries();
      checkCurrentSeries();
    }
  }, [open, user]);

  useEffect(() => {
    if (!open) {
      setShowNewForm(false);
      setNewTitle("");
    }
  }, [open]);

  const loadUserSeries = async () => {
    if (!user) return;
    
    setLoading(true);
    const series = await getUserSeries(user.id);
    setUserSeries(series);
    setLoading(false);
  };

  const checkCurrentSeries = async () => {
    const { data } = await supabase
      .from("videos")
      .select("series_id")
      .eq("id", videoId)
      .maybeSingle();
    
    setCurrentSeriesId(data?.series_id || null);
  };

  const handleAddToSeries = async (seriesId: string) => {
    setAdding(true);
    const success = await addToSeries(videoId, seriesId);
    setAdding(false);

    if (success) {
      toast({ title: "Video added to series" });
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const handleCreateNew = async () => {
    if (!newTitle.trim()) {
      toast({ title: "Please enter a series title", variant: "destructive" });
      return;
    }

    setAdding(true);
    const series = await createSeries(newTitle.trim());
    
    if (series) {
      const success = await addToSeries(videoId, series.id);
      if (success) {
        toast({ title: "Series created and video added" });
        onOpenChange(false);
        onSuccess?.();
      }
    }
    
    setAdding(false);
  };

  const handleRemoveFromSeries = async () => {
    if (!currentSeriesId) return;

    setAdding(true);
    const { error } = await supabase
      .from("videos")
      .update({ series_id: null, series_order: null })
      .eq("id", videoId);

    setAdding(false);

    if (!error) {
      toast({ title: "Video removed from series" });
      setCurrentSeriesId(null);
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast({ title: "Failed to remove video", variant: "destructive" });
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[60vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Add to Series
          </SheetTitle>
          <SheetDescription>
            {currentSeriesId 
              ? "This video is already in a series. You can move it or remove it."
              : "Add this video to an existing series or create a new one"
            }
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(60vh-140px)]">
          {/* Current series indicator */}
          {currentSeriesId && (
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Currently in a series</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFromSeries}
                disabled={adding}
                className="text-destructive hover:text-destructive"
              >
                Remove
              </Button>
            </div>
          )}

          {/* Create new series */}
          {showNewForm ? (
            <div className="p-3 border border-border rounded-lg space-y-3">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Series title"
                className="font-medium"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateNew}
                  disabled={adding || !newTitle.trim()}
                  className="flex-1"
                >
                  {adding ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Create & Add
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowNewForm(false);
                    setNewTitle("");
                  }}
                  disabled={adding}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => setShowNewForm(true)}
            >
              <Plus className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-medium">Create New Series</p>
                <p className="text-xs text-muted-foreground">Start a new video series</p>
              </div>
            </Button>
          )}

          {/* Existing series list */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : userSeries.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">No series yet</p>
              <p className="text-xs mt-1">Create your first series above</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                Your Series
              </p>
              {userSeries.map((series) => (
                <button
                  key={series.id}
                  onClick={() => handleAddToSeries(series.id)}
                  disabled={adding || series.id === currentSeriesId}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary transition-colors text-left",
                    series.id === currentSeriesId && "opacity-50 cursor-not-allowed bg-secondary"
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {series.cover_image_url ? (
                      <img src={series.cover_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Layers className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{series.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {series.videos_count} {series.videos_count === 1 ? "part" : "parts"}
                    </p>
                  </div>
                  {series.id === currentSeriesId && (
                    <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
