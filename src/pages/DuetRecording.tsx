import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Video, Square, RotateCcw, Check, Pause, Play, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDuetRecording, DuetLayout } from "@/hooks/useDuetRecording";
import { DuetLayoutPicker } from "@/components/video/DuetLayoutPicker";
import { Video as VideoType } from "@/types/video";

export default function DuetRecording() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [sourceVideo, setSourceVideo] = useState<VideoType | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [layout, setLayout] = useState<DuetLayout>("side-by-side");
  const [showLayoutPicker, setShowLayoutPicker] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);

  const sourceVideoRef = useRef<HTMLVideoElement>(null);

  const {
    isRecording,
    isPaused,
    recordedBlob,
    recordedUrl,
    cameraStream,
    error,
    recordingDuration,
    canvasRef,
    cameraVideoRef,
    initCamera,
    stopCamera,
    startRecording,
    stopRecording,
    togglePause,
    resetRecording,
  } = useDuetRecording({ sourceVideoRef, layout });

  // Fetch source video
  useEffect(() => {
    const fetchVideo = async () => {
      if (!videoId) return;

      const { data: videoData, error: videoError } = await supabase
        .from("videos")
        .select("*")
        .eq("id", videoId)
        .single();

      if (videoError || !videoData) {
        toast({ title: "Video not found", variant: "destructive" });
        navigate(-1);
        return;
      }

      // Fetch profile separately
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("user_id", videoData.user_id)
        .single();

      const data = {
        ...videoData,
        profiles: profileData || { username: null, display_name: null, avatar_url: null },
      };

      // Check if duets are allowed
      if (data.allow_duets === false && data.user_id !== user?.id) {
        toast({ title: "Duets are disabled for this video", variant: "destructive" });
        navigate(-1);
        return;
      }

      setSourceVideo(data as VideoType);
      setLoading(false);
    };

    fetchVideo();
  }, [videoId, user?.id, navigate, toast]);

  // Attach camera stream to video element
  useEffect(() => {
    if (cameraStream && cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = cameraStream;
      cameraVideoRef.current.play();
      setCameraReady(true);
    }
  }, [cameraStream, cameraVideoRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleStartCamera = async () => {
    const stream = await initCamera();
    if (stream) {
      setShowLayoutPicker(false);
    }
  };

  const handleStartRecording = () => {
    if (!cameraReady) {
      toast({ title: "Camera not ready", variant: "destructive" });
      return;
    }
    startRecording();
  };

  const handleUpload = async () => {
    if (!recordedBlob || !user || !sourceVideo) return;

    setUploading(true);

    try {
      // Convert to File
      const fileName = `${user.id}/${Date.now()}.webm`;
      const file = new File([recordedBlob], fileName, { type: "video/webm" });

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("videos")
        .getPublicUrl(fileName);

      // Create video record with duet reference
      const { error: insertError } = await supabase
        .from("videos")
        .insert({
          user_id: user.id,
          video_url: publicUrl,
          caption: `Duet with @${sourceVideo.profiles?.username || "creator"}`,
          duet_source_id: sourceVideo.id,
          duet_layout: layout,
        });

      if (insertError) throw insertError;

      toast({ title: "Duet posted successfully!" });
      navigate("/");
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-[var(--app-height)] bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Preview recorded duet
  if (recordedUrl) {
    return (
      <div className="min-h-[var(--app-height)] bg-background text-foreground flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-border">
          <button onClick={resetRecording} className="p-2">
            <RotateCcw className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-lg">Preview Duet</h1>
          <div className="w-10" />
        </header>

        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-black flex items-center justify-center">
            <video
              src={recordedUrl}
              className="max-h-[70vh] w-auto"
              controls
              autoPlay
              loop
            />
          </div>

          <div className="p-4 space-y-3">
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full h-12 bg-primary hover:bg-primary/90 font-semibold"
            >
              {uploading ? "Posting..." : "Post Duet"}
            </Button>
            <Button
              variant="outline"
              onClick={resetRecording}
              className="w-full"
            >
              Record Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[var(--app-height)] bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-bold text-lg">Create Duet</h1>
        <div className="w-10" />
      </header>

      {/* Layout picker */}
      {showLayoutPicker && (
        <div className="p-4 space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Choose layout</p>
            <DuetLayoutPicker value={layout} onChange={setLayout} />
          </div>

          <Button onClick={handleStartCamera} className="w-full">
            <Camera className="w-4 h-4 mr-2" />
            Start Camera
          </Button>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </div>
      )}

      {/* Recording view */}
      {!showLayoutPicker && (
        <div className="flex-1 flex flex-col">
          {/* Preview area */}
          <div className="flex-1 relative bg-black">
            {/* Hidden source video */}
            <video
              ref={sourceVideoRef}
              src={sourceVideo?.video_url}
              className="hidden"
              playsInline
              muted={false}
              preload="auto"
            />

            {/* Hidden camera video */}
            <video
              ref={cameraVideoRef}
              className="hidden"
              playsInline
              muted
              autoPlay
            />

            {/* Canvas for combined preview */}
            <canvas
              ref={canvasRef}
              width={720}
              height={1280}
              className="w-full h-full object-contain"
            />

            {/* Recording indicator */}
            {isRecording && (
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-destructive rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white text-sm font-medium">
                  {formatDuration(recordingDuration)}
                </span>
              </div>
            )}

            {/* Split preview when not recording */}
            {!isRecording && cameraReady && (
              <div className="absolute inset-0 flex">
                {layout === "side-by-side" && (
                  <>
                    <div className="w-1/2 relative">
                      <video
                        src={sourceVideo?.video_url}
                        className="absolute inset-0 w-full h-full object-cover"
                        muted
                        loop
                        autoPlay
                      />
                      <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded">
                        Original
                      </div>
                    </div>
                    <div className="w-1/2 relative">
                      <video
                        ref={(el) => {
                          if (el && cameraStream) {
                            el.srcObject = cameraStream;
                            el.play();
                          }
                        }}
                        className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                        muted
                        playsInline
                      />
                      <div className="absolute bottom-2 right-2 text-xs text-white bg-black/50 px-2 py-1 rounded">
                        You
                      </div>
                    </div>
                  </>
                )}

                {layout === "top-bottom" && (
                  <div className="flex flex-col w-full h-full">
                    <div className="h-1/2 relative">
                      <video
                        src={sourceVideo?.video_url}
                        className="absolute inset-0 w-full h-full object-cover"
                        muted
                        loop
                        autoPlay
                      />
                      <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded">
                        Original
                      </div>
                    </div>
                    <div className="h-1/2 relative">
                      <video
                        ref={(el) => {
                          if (el && cameraStream) {
                            el.srcObject = cameraStream;
                            el.play();
                          }
                        }}
                        className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                        muted
                        playsInline
                      />
                      <div className="absolute bottom-2 right-2 text-xs text-white bg-black/50 px-2 py-1 rounded">
                        You
                      </div>
                    </div>
                  </div>
                )}

                {layout === "picture-in-picture" && (
                  <div className="relative w-full h-full">
                    <video
                      src={sourceVideo?.video_url}
                      className="absolute inset-0 w-full h-full object-cover"
                      muted
                      loop
                      autoPlay
                    />
                    <div className="absolute bottom-20 right-4 w-[30%] aspect-[9/16] rounded-lg overflow-hidden border-2 border-white shadow-lg">
                      <video
                        ref={(el) => {
                          if (el && cameraStream) {
                            el.srcObject = cameraStream;
                            el.play();
                          }
                        }}
                        className="w-full h-full object-cover scale-x-[-1]"
                        muted
                        playsInline
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-4 bg-background border-t border-border">
            <div className="flex items-center justify-center gap-6">
              {!isRecording ? (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowLayoutPicker(true)}
                  >
                    <RotateCcw className="w-5 h-5" />
                  </Button>

                  <button
                    onClick={handleStartRecording}
                    className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center hover:bg-destructive/90 transition-colors"
                  >
                    <Video className="w-8 h-8 text-white" />
                  </button>

                  <div className="w-10" />
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={togglePause}
                  >
                    {isPaused ? (
                      <Play className="w-5 h-5" />
                    ) : (
                      <Pause className="w-5 h-5" />
                    )}
                  </Button>

                  <button
                    onClick={stopRecording}
                    className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center hover:bg-destructive/90 transition-colors"
                  >
                    <Square className="w-8 h-8 text-white fill-white" />
                  </button>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={stopRecording}
                  >
                    <Check className="w-5 h-5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
