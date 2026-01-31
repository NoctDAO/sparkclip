import { useState, useRef, useEffect, useCallback } from "react";
import { Volume2, VolumeX, Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVideoAnalytics } from "@/hooks/useVideoAnalytics";

interface VideoPlayerProps {
  src: string;
  isActive: boolean;
  videoId?: string;
  className?: string;
}

export function VideoPlayer({ src, isActive, videoId, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isLandscape, setIsLandscape] = useState(false);

  // Use analytics hook to track view events
  useVideoAnalytics({ videoId, isActive, videoRef });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      setIsBuffering(true);
      video.play().catch(() => {
        setIsPlaying(false);
      });
      setIsPlaying(true);
    } else {
      video.pause();
      video.currentTime = 0;
      setIsPlaying(false);
      setProgress(0);
    }
  }, [isActive]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handleCanPlay = () => setIsBuffering(false);
    const handleSeeking = () => setIsBuffering(true);
    const handleSeeked = () => setIsBuffering(false);
    const handleLoadedMetadata = () => {
      // Detect aspect ratio: landscape if width >= height
      if (video.videoWidth >= video.videoHeight) {
        setIsLandscape(true);
      } else {
        setIsLandscape(false);
      }
    };

    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("seeking", handleSeeking);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    // Check if metadata is already loaded
    if (video.videoWidth > 0) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("seeking", handleSeeking);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    
    const currentProgress = (video.currentTime / video.duration) * 100;
    setProgress(currentProgress);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [handleTimeUpdate]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    video.currentTime = clickPosition * video.duration;
  };

  return (
    <div 
      className={cn("relative w-full h-full bg-background", className)}
      onClick={togglePlay}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        className={cn(
          "w-full h-full",
          isLandscape ? "object-contain" : "object-cover"
        )}
        loop
        muted={isMuted}
        playsInline
        preload="metadata"
      />

      {/* Buffering spinner */}
      {isBuffering && isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 pointer-events-none">
          <Loader2 className="w-12 h-12 text-foreground animate-spin" />
        </div>
      )}
      
      {/* Play/Pause indicator */}
      {!isPlaying && !isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/20">
          <Play className="w-20 h-20 text-foreground/80 fill-foreground/80" />
        </div>
      )}
      
      {/* Mute toggle - always visible when muted to prompt user to tap for sound */}
      <button
        onClick={toggleMute}
        className={cn(
          "absolute bottom-8 right-4 p-2 rounded-full transition-all z-10",
          isMuted 
            ? "bg-primary/90 opacity-100 animate-pulse" 
            : "bg-secondary/80",
          !isMuted && !showControls && isPlaying && "opacity-0"
        )}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-primary-foreground" />
        ) : (
          <Volume2 className="w-5 h-5 text-foreground" />
        )}
      </button>

      {/* Progress bar - always visible */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1 bg-foreground/20 cursor-pointer z-20"
        onClick={handleProgressClick}
      >
        <div 
          className="h-full bg-foreground transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
        {/* Progress dot indicator */}
        <div 
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-foreground rounded-full transition-opacity",
            showControls ? "opacity-100" : "opacity-0"
          )}
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>
    </div>
  );
}