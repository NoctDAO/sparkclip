import { useState, useRef, useEffect, useCallback } from "react";
import { Volume2, VolumeX, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  src: string;
  isActive: boolean;
  className?: string;
}

export function VideoPlayer({ src, isActive, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
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
        className="w-full h-full object-cover"
        loop
        muted={isMuted}
        playsInline
        preload="metadata"
      />
      
      {/* Play/Pause indicator */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/20">
          <Play className="w-20 h-20 text-foreground/80 fill-foreground/80" />
        </div>
      )}
      
      {/* Mute toggle */}
      <button
        onClick={toggleMute}
        className={cn(
          "absolute bottom-8 right-4 p-2 rounded-full bg-secondary/80 transition-opacity z-10",
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        )}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-foreground" />
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