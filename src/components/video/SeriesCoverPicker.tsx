import { useState, useRef } from "react";
import { Check, Upload, ImageIcon, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { VideoSeries, Video } from "@/types/video";
import { cn } from "@/lib/utils";

interface SeriesCoverPickerProps {
  series: VideoSeries;
  videos: Video[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCoverSelected: (type: 'video' | 'upload', value: string | File) => Promise<void>;
  currentCoverVideoId?: string | null;
}

export function SeriesCoverPicker({
  series,
  videos,
  open,
  onOpenChange,
  onCoverSelected,
  currentCoverVideoId,
}: SeriesCoverPickerProps) {
  const [selecting, setSelecting] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVideoSelect = async (video: Video) => {
    setSelecting(video.id);
    try {
      await onCoverSelected('video', video.id);
      onOpenChange(false);
    } finally {
      setSelecting(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return;
    }

    setUploading(true);
    try {
      await onCoverSelected('upload', file);
      onOpenChange(false);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Determine which video is currently the cover
  const getCoverVideoId = () => {
    if (currentCoverVideoId) return currentCoverVideoId;
    // If using cover_image_url from a video thumbnail, check if it matches any video
    if (series.cover_image_url) {
      const matchingVideo = videos.find(v => v.thumbnail_url === series.cover_image_url);
      if (matchingVideo) return matchingVideo.id;
    }
    return null;
  };

  const activeCoverVideoId = getCoverVideoId();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left">Choose Series Cover</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto h-[calc(70vh-100px)] pr-2">
          {/* Upload Custom Section */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Upload Custom Image
            </h3>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full h-20 border-dashed hover:bg-secondary/50"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Upload className="w-5 h-5 mr-2" />
              )}
              {uploading ? "Uploading..." : "Upload Image"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Video Thumbnails Section */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Use Video Thumbnail
            </h3>
            {videos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No videos in this series</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {videos.map((video) => {
                  const isSelected = activeCoverVideoId === video.id;
                  const isSelecting = selecting === video.id;

                  return (
                    <button
                      key={video.id}
                      onClick={() => handleVideoSelect(video)}
                      disabled={selecting !== null || uploading}
                      className={cn(
                        "relative aspect-[2/3] rounded-lg overflow-hidden border-2 transition-all",
                        isSelected
                          ? "border-[hsl(var(--gold))] ring-2 ring-[hsl(var(--gold))]/30"
                          : "border-transparent hover:border-primary/50",
                        (selecting !== null || uploading) && !isSelecting && "opacity-50"
                      )}
                    >
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt={`Part ${video.series_order}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-secondary flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}

                      {/* Part number badge */}
                      <div className="absolute top-1 left-1 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-medium text-white">
                        Part {video.series_order}
                      </div>

                      {/* Selected indicator */}
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[hsl(var(--gold))] flex items-center justify-center">
                          <Check className="w-3 h-3 text-black" />
                        </div>
                      )}

                      {/* Loading overlay */}
                      {isSelecting && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
