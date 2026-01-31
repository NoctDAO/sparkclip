import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Upload as UploadIcon, X, Hash, Music, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SoundPicker } from "@/components/sounds/SoundPicker";
import { Sound } from "@/types/video";
import { useContentModeration } from "@/hooks/useContentModeration";
import { useBanStatus } from "@/hooks/useBanStatus";

export default function Upload() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { moderateContent } = useContentModeration();
  const { isBanned, banInfo } = useBanStatus(user?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedSound, setSelectedSound] = useState<Sound | null>(null);
  const [soundPickerOpen, setSoundPickerOpen] = useState(false);

  // Load sound from URL params if navigating from sound detail page
  useEffect(() => {
    const soundId = searchParams.get("soundId");
    if (soundId) {
      loadSound(soundId);
    }
  }, [searchParams]);

  const loadSound = async (soundId: string) => {
    const { data } = await supabase
      .from("sounds")
      .select("*")
      .eq("id", soundId)
      .single();
    
    if (data) {
      setSelectedSound(data as Sound);
    }
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("video/")) {
      toast({ title: "Please select a video file", variant: "destructive" });
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast({ title: "Video must be less than 100MB", variant: "destructive" });
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!videoFile || !user) return;

    setUploading(true);

    let uploadedFileName: string | null = null;
    let createdVideoId: string | null = null;

    try {
      // Upload video to storage
      const fileExt = videoFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      uploadedFileName = fileName;

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, videoFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("videos")
        .getPublicUrl(fileName);

      // Parse hashtags
      const hashtagArray = hashtags
        .split(/[\s,]+/)
        .filter((tag) => tag.startsWith("#") || tag.length > 0)
        .map((tag) => tag.replace("#", ""));

      // Create video record
      const { data: videoData, error: insertError } = await supabase
        .from("videos")
        .insert({
          user_id: user.id,
          video_url: publicUrl,
          caption: caption.trim() || null,
          hashtags: hashtagArray.length > 0 ? hashtagArray : null,
          sound_id: selectedSound?.id || null,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      createdVideoId = videoData.id;

      // Build content for moderation (caption + hashtags)
      const contentToModerate = [
        caption.trim(),
        hashtagArray.map((t) => `#${t}`).join(" "),
      ]
        .filter(Boolean)
        .join(" ");

      // Run moderation if there's text content
      if (contentToModerate) {
        const moderationResult = await moderateContent({
          content: contentToModerate,
          content_type: "video",
          content_id: createdVideoId,
        });

        if (moderationResult.blocked) {
          // Content blocked - rollback: delete video record and storage file
          await supabase.from("videos").delete().eq("id", createdVideoId);
          await supabase.storage.from("videos").remove([uploadedFileName]);

          toast({
            title: "Video couldn't be posted",
            description:
              "Your video may violate our community guidelines. Please review and try again.",
            variant: "destructive",
          });
          setUploading(false);
          return;
        }

        if (!moderationResult.safe) {
          // Content flagged but not blocked - allow but notify
          toast({
            title: "Video posted!",
            description: "It will be visible while our team reviews it.",
          });
          navigate("/");
          return;
        }
      }

      toast({ title: "Video uploaded successfully!" });
      navigate("/");
    } catch (error: any) {
      // Cleanup on error if we created anything
      if (createdVideoId) {
        await supabase.from("videos").delete().eq("id", createdVideoId);
      }
      if (uploadedFileName) {
        await supabase.storage.from("videos").remove([uploadedFileName]);
      }

      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const clearVideo = () => {
    setVideoFile(null);
    setVideoPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Show banned user message
  if (isBanned) {
    return (
      <div className="min-h-[var(--app-height)] bg-background text-foreground">
        <header className="flex items-center justify-between p-4 border-b border-border">
          <button onClick={() => navigate(-1)} className="p-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-lg">New video</h1>
          <div className="w-10" />
        </header>
        <div className="flex flex-col items-center justify-center p-8 text-center h-[60vh]">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <Ban className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Account Suspended</h2>
          <p className="text-muted-foreground mb-4 max-w-sm">
            You cannot upload videos while your account is suspended.
          </p>
          {banInfo?.reason && (
            <p className="text-sm text-muted-foreground mb-2">
              Reason: {banInfo.reason}
            </p>
          )}
          {banInfo?.expires_at && (
            <p className="text-sm text-muted-foreground">
              Expires: {new Date(banInfo.expires_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[var(--app-height)] bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-bold text-lg">New video</h1>
        <div className="w-10" />
      </header>

      <div className="p-4 space-y-6">
        {/* Video Upload Area */}
        {!videoPreview ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="aspect-[9/16] max-h-[60vh] bg-secondary rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/80 transition-colors"
          >
            <UploadIcon className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-foreground font-semibold">Select video</p>
            <p className="text-sm text-muted-foreground mt-1">
              or drag and drop a file
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              MP4 or WebM • Less than 100MB
            </p>
          </div>
        ) : (
          <div className="relative aspect-[9/16] max-h-[60vh] bg-secondary rounded-lg overflow-hidden">
            <video 
              src={videoPreview} 
              className="w-full h-full object-cover"
              controls
              autoPlay
              muted
              loop
            />
            <button
              onClick={clearVideo}
              className="absolute top-2 right-2 p-2 bg-background/80 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Sound Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Music className="w-4 h-4" />
            Sound
          </label>
          {selectedSound ? (
            <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
              <div className="w-10 h-10 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                {selectedSound.cover_url ? (
                  <img 
                    src={selectedSound.cover_url} 
                    alt={selectedSound.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                    <span>♪</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedSound.title}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {selectedSound.artist || "Unknown"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSound(null)}
                className="text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setSoundPickerOpen(true)}
              className="w-full justify-start gap-2"
            >
              <Music className="w-4 h-4" />
              Add sound
            </Button>
          )}
        </div>

        {/* Caption */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Caption</label>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            className="bg-secondary border-none resize-none"
            rows={3}
            maxLength={300}
          />
          <p className="text-xs text-muted-foreground text-right">
            {caption.length}/300
          </p>
        </div>

        {/* Hashtags */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Hash className="w-4 h-4" />
            Hashtags
          </label>
          <Input
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="#fyp #viral #trending"
            className="bg-secondary border-none"
          />
        </div>

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!videoFile || uploading}
          className="w-full h-12 bg-primary hover:bg-primary/90 font-semibold"
        >
          {uploading ? "Uploading..." : "Post"}
        </Button>
      </div>

      <SoundPicker
        open={soundPickerOpen}
        onOpenChange={setSoundPickerOpen}
        onSelectSound={setSelectedSound}
        selectedSound={selectedSound}
      />
    </div>
  );
}
