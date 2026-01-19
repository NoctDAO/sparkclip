import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload as UploadIcon, X, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Upload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [uploading, setUploading] = useState(false);

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

    try {
      // Upload video to storage
      const fileExt = videoFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

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
      const { error: insertError } = await supabase.from("videos").insert({
        user_id: user.id,
        video_url: publicUrl,
        caption: caption.trim() || null,
        hashtags: hashtagArray.length > 0 ? hashtagArray : null,
      });

      if (insertError) throw insertError;

      toast({ title: "Video uploaded successfully!" });
      navigate("/");
    } catch (error: any) {
      toast({ 
        title: "Upload failed", 
        description: error.message,
        variant: "destructive" 
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

  return (
    <div className="min-h-screen bg-background text-foreground">
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
    </div>
  );
}