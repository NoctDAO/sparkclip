import { useState, useEffect } from "react";
import { Plus, Layers, ChevronRight, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVideoSeries } from "@/hooks/useVideoSeries";
import { useAuth } from "@/hooks/useAuth";
import { VideoSeries } from "@/types/video";

interface SeriesPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSeries: VideoSeries | null;
  onSelectSeries: (series: VideoSeries | null, nextPart: number) => void;
}

export function SeriesPicker({ open, onOpenChange, selectedSeries, onSelectSeries }: SeriesPickerProps) {
  const { user } = useAuth();
  const { getUserSeries, createSeries, getNextPartNumber, loading } = useVideoSeries();
  
  const [userSeries, setUserSeries] = useState<VideoSeries[]>([]);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [loadingSeries, setLoadingSeries] = useState(true);

  useEffect(() => {
    if (open && user) {
      loadUserSeries();
    }
  }, [open, user]);

  const loadUserSeries = async () => {
    if (!user) return;
    setLoadingSeries(true);
    const series = await getUserSeries(user.id);
    setUserSeries(series);
    setLoadingSeries(false);
  };

  const handleSelectSeries = async (series: VideoSeries) => {
    const nextPart = await getNextPartNumber(series.id);
    onSelectSeries(series, nextPart);
    onOpenChange(false);
  };

  const handleCreateSeries = async () => {
    if (!newTitle.trim()) return;
    
    setCreating(true);
    const series = await createSeries(newTitle.trim(), newDescription.trim() || undefined);
    setCreating(false);

    if (series) {
      onSelectSeries(series, 1);
      onOpenChange(false);
      setNewTitle("");
      setNewDescription("");
      setShowCreateNew(false);
    }
  };

  const handleRemoveSeries = () => {
    onSelectSeries(null, 0);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle>
            {showCreateNew ? "Create New Series" : "Add to Series"}
          </SheetTitle>
        </SheetHeader>

        {showCreateNew ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Series Title</label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., My Italy Trip"
                className="bg-secondary border-none"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What's this series about?"
                className="bg-secondary border-none resize-none"
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateNew(false)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleCreateSeries}
                disabled={!newTitle.trim() || creating}
                className="flex-1"
              >
                {creating ? "Creating..." : "Create & Add"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Create New Option */}
            <button
              onClick={() => setShowCreateNew(true)}
              className="w-full flex items-center gap-3 p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors mb-4"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Create New Series</p>
                <p className="text-sm text-muted-foreground">Start a new multi-part story</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Remove from series option if already selected */}
            {selectedSeries && (
              <button
                onClick={handleRemoveSeries}
                className="w-full flex items-center gap-3 p-4 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors mb-4"
              >
                <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                  <X className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-destructive">Remove from Series</p>
                  <p className="text-sm text-muted-foreground">Post as standalone video</p>
                </div>
              </button>
            )}

            {/* Existing Series List */}
            {loadingSeries ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : userSeries.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground mb-3">Your Series</p>
                <ScrollArea className="h-[40vh]">
                  <div className="space-y-2 pr-4">
                    {userSeries.map((series) => (
                      <button
                        key={series.id}
                        onClick={() => handleSelectSeries(series)}
                        className={`w-full flex items-center gap-3 p-4 rounded-lg transition-colors ${
                          selectedSeries?.id === series.id 
                            ? "bg-primary/20 ring-2 ring-primary" 
                            : "bg-secondary hover:bg-secondary/80"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                          {series.cover_image_url ? (
                            <img 
                              src={series.cover_image_url} 
                              alt={series.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Layers className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium">{series.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {series.videos_count} {series.videos_count === 1 ? "part" : "parts"}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No series yet</p>
                <p className="text-sm">Create your first series above</p>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
