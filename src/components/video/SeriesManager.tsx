import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, GripVertical, Eye, Trash2, Play, AlertTriangle, Pencil, Check, ImagePlus, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useVideoSeries } from "@/hooks/useVideoSeries";
import { AddVideoToSeriesSheet } from "@/components/video/AddVideoToSeriesSheet";
import { VideoSeries, Video } from "@/types/video";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SeriesManagerProps {
  series: VideoSeries;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSeriesUpdated: () => void;
}

interface SortableVideoItemProps {
  video: Video;
  onRemove: (videoId: string) => void;
  onPlay: (video: Video) => void;
}

function SortableVideoItem({ video, onRemove, onPlay }: SortableVideoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 bg-secondary rounded-lg transition-colors",
        isDragging && "opacity-50 ring-2 ring-primary"
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Thumbnail */}
      <div 
        className="w-12 h-20 bg-muted rounded overflow-hidden relative flex-shrink-0 cursor-pointer"
        onClick={() => onPlay(video)}
      >
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={`Part ${video.series_order}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            src={video.video_url}
            className="w-full h-full object-cover"
            muted
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
          <Play className="w-4 h-4 text-white fill-white" />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">Part {video.series_order}</p>
        <p className="text-xs text-muted-foreground truncate">
          {video.caption || "No caption"}
        </p>
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <Eye className="w-3 h-3" />
          <span>{formatCount(video.views_count)}</span>
        </div>
      </div>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(video.id)}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function SeriesManager({ series, open, onOpenChange, onSeriesUpdated }: SeriesManagerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { getSeriesVideos, reorderSeries, removeFromSeries, deleteSeries, updateSeries } = useVideoSeries();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(series.title);
  const [editDescription, setEditDescription] = useState(series.description || "");
  const [savingDetails, setSavingDetails] = useState(false);
  
  // Cover image state
  const [coverImageUrl, setCoverImageUrl] = useState(series.cover_image_url || "");
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  // Add video state
  const [showAddVideo, setShowAddVideo] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    setHasChanges(false);
    // Reset edit state when loading
    setEditTitle(series.title);
    setEditDescription(series.description || "");
    setCoverImageUrl(series.cover_image_url || "");
    setIsEditing(false);
  };

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be less than 5MB", variant: "destructive" });
      return;
    }

    setUploadingCover(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${series.id}-${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("series-covers")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("series-covers")
        .getPublicUrl(fileName);

      const newCoverUrl = urlData.publicUrl;
      setCoverImageUrl(newCoverUrl);

      // Update series in database
      const success = await updateSeries(series.id, { cover_image_url: newCoverUrl });

      if (success) {
        toast({ title: "Cover image updated" });
        onSeriesUpdated();
      }
    } catch (error) {
      console.error("Error uploading cover image:", error);
      toast({ title: "Failed to upload cover image", variant: "destructive" });
    } finally {
      setUploadingCover(false);
      // Reset input
      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }
    }
  };

  const handleRemoveCoverImage = async () => {
    setUploadingCover(true);

    try {
      const success = await updateSeries(series.id, { cover_image_url: null });

      if (success) {
        setCoverImageUrl("");
        toast({ title: "Cover image removed" });
        onSeriesUpdated();
      }
    } catch (error) {
      console.error("Error removing cover image:", error);
      toast({ title: "Failed to remove cover image", variant: "destructive" });
    } finally {
      setUploadingCover(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setVideos((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
          ...item,
          series_order: index + 1,
        }));

        return newItems;
      });
      setHasChanges(true);
    }
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    const videoIds = videos.map((v) => v.id);
    const success = await reorderSeries(series.id, videoIds);
    setSaving(false);

    if (success) {
      toast({ title: "Series order saved" });
      setHasChanges(false);
      onSeriesUpdated();
    }
  };

  const handleRemoveVideo = async (videoId: string) => {
    const success = await removeFromSeries(videoId);
    if (success) {
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
      toast({ title: "Video removed from series" });
      onSeriesUpdated();
    }
  };

  const handlePlayVideo = (video: Video) => {
    onOpenChange(false);
    navigate(`/video/${video.id}`);
  };

  const handleDeleteSeries = async () => {
    setDeleting(true);
    const success = await deleteSeries(series.id);
    setDeleting(false);

    if (success) {
      toast({ title: "Series deleted successfully" });
      onOpenChange(false);
      onSeriesUpdated();
      navigate(-1);
    }
  };

  const handleSaveDetails = async () => {
    if (!editTitle.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    setSavingDetails(true);
    const success = await updateSeries(series.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
    });
    setSavingDetails(false);

    if (success) {
      toast({ title: "Series updated" });
      setIsEditing(false);
      onSeriesUpdated();
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(series.title);
    setEditDescription(series.description || "");
    setIsEditing(false);
  };

  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Series
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "<strong>{series.title}</strong>"? 
              This will remove the series but keep all {videos.length} videos. 
              The videos will no longer be grouped together.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSeries}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete Series"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-3 pr-4">
                  {/* Cover Image Upload */}
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-20 h-20 rounded-lg bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer relative group"
                      onClick={() => !uploadingCover && coverInputRef.current?.click()}
                    >
                      {uploadingCover ? (
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      ) : coverImageUrl ? (
                        <>
                          <img src={coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ImagePlus className="w-5 h-5 text-white" />
                          </div>
                        </>
                      ) : (
                        <ImagePlus className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Cover Image</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        {coverImageUrl ? "Click to change" : "Add a cover image"}
                      </p>
                      {coverImageUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveCoverImage}
                          disabled={uploadingCover}
                          className="text-destructive hover:text-destructive h-7 px-2"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverImageUpload}
                      className="hidden"
                    />
                  </div>
                  
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Series title"
                    className="font-semibold"
                  />
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Add a description (optional)"
                    className="text-sm resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveDetails}
                      disabled={savingDetails}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      {savingDetails ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      disabled={savingDetails}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-left truncate">{series.title}</SheetTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={() => setIsEditing(true)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                  {series.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {series.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Drag to reorder parts
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-full hover:bg-secondary transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No videos in this series</p>
          </div>
        ) : (
          <div className="flex flex-col h-[calc(85vh-180px)]">
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={videos.map((v) => v.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {videos.map((video) => (
                    <SortableVideoItem
                      key={video.id}
                      video={video}
                      onRemove={handleRemoveVideo}
                      onPlay={handlePlayVideo}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            <div className="pt-4 border-t border-border mt-4 space-y-2">
              <Button
                variant="outline"
                onClick={() => setShowAddVideo(true)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Existing Video
              </Button>
              {hasChanges && (
                <Button
                  onClick={handleSaveOrder}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? "Saving..." : "Save Order"}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Entire Series
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>

    {/* Add Video Sheet */}
    <AddVideoToSeriesSheet
      series={series}
      open={showAddVideo}
      onOpenChange={setShowAddVideo}
      onVideoAdded={() => {
        loadSeriesVideos();
        onSeriesUpdated();
      }}
      existingVideoIds={videos.map((v) => v.id)}
    />
    </>
  );
}
