import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Play, Pause } from "lucide-react";
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
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.play().catch(() => {
        // Autoplay was prevented
        setIsPlaying(false);
      });
      setIsPlaying(true);
    } else {
      video.pause();
      video.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive]);

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
          "absolute bottom-4 right-4 p-2 rounded-full bg-secondary/80 transition-opacity",
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        )}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-foreground" />
        ) : (
          <Volume2 className="w-5 h-5 text-foreground" />
        )}
      </button>

      {/* Progress bar */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary">
          <div className="h-full bg-primary" style={{ width: "0%" }} />
        </div>
      )}
    </div>
  );
}