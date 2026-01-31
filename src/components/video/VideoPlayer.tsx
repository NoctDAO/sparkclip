import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Loader2, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVideoAnalytics } from "@/hooks/useVideoAnalytics";

interface VideoPlayerProps {
  src: string;
  isActive: boolean;
  videoId?: string;
  className?: string;
  bottomNavVisible?: boolean;
  onVideoEnd?: () => void;
}

export function VideoPlayer({ src, isActive, videoId, className, bottomNavVisible = true, onVideoEnd }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isLandscape, setIsLandscape] = useState(false);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const volumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    const handleEnded = () => {
      if (onVideoEnd) {
        onVideoEnd();
      }
    };

    const handleVolumeChange = () => {
      if (!video) return;
      
      setCurrentVolume(video.volume);
      setIsMuted(video.muted);
      
      // Show the volume indicator
      setShowVolumeIndicator(true);
      
      // Clear any existing timeout
      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current);
      }
      
      // Hide after 1.5 seconds
      volumeTimeoutRef.current = setTimeout(() => {
        setShowVolumeIndicator(false);
      }, 1500);
    };

    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("seeking", handleSeeking);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("volumechange", handleVolumeChange);

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
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("volumechange", handleVolumeChange);
      
      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current);
      }
    };
  }, [onVideoEnd]);

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
        loop={!onVideoEnd}
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

      {/* Volume indicator */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30",
          "flex flex-col items-center gap-3 p-4 rounded-2xl bg-background/80 backdrop-blur-md",
          "transition-opacity duration-300",
          showVolumeIndicator ? "opacity-100" : "opacity-0"
        )}
      >
        {isMuted || currentVolume === 0 ? (
          <VolumeX className="w-10 h-10 text-foreground" />
        ) : (
          <Volume2 className="w-10 h-10 text-foreground" />
        )}
        <div className="w-24 h-1.5 bg-foreground/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-150"
            style={{ width: `${isMuted ? 0 : currentVolume * 100}%` }}
          />
        </div>
      </div>
      

      {/* Progress bar - always visible */}
      <div 
        className="absolute left-0 right-0 h-1 bg-foreground/20 cursor-pointer z-20 transition-[bottom] duration-300 ease-out"
        style={{ bottom: bottomNavVisible ? "calc(var(--bottom-nav-height) + var(--safe-bottom))" : "var(--safe-bottom)" }}
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