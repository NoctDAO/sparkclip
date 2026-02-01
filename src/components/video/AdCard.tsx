import { useState, useEffect, useRef } from "react";
import { ExternalLink, Volume2, VolumeX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Ad } from "@/types/ad";
import { useAdAnalytics } from "@/hooks/useAdAnalytics";
import { cn } from "@/lib/utils";

interface AdCardProps {
  ad: Ad;
  isActive: boolean;
  bottomNavVisible?: boolean;
}

export function AdCard({ ad, isActive, bottomNavVisible = true }: AdCardProps) {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { trackImpression, trackClick, trackViewComplete } = useAdAnalytics();
  const hasTrackedImpression = useRef(false);

  // Track impression when ad becomes active
  useEffect(() => {
    if (isActive && !hasTrackedImpression.current) {
      hasTrackedImpression.current = true;
      trackImpression(ad.id);
    }
  }, [isActive, ad.id, trackImpression]);

  // Play/pause video based on active state
  useEffect(() => {
    if (!videoRef.current || !ad.video_url) return;

    if (isActive) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isActive, ad.video_url]);

  const handleVideoEnded = () => {
    trackViewComplete(ad.id);
    // Loop the video
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleClick = () => {
    trackClick(ad.id);
    // Open ad URL in new tab
    window.open(ad.click_url, "_blank", "noopener,noreferrer");
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  return (
    <div
      className="relative h-full w-full bg-black cursor-pointer"
      onClick={handleClick}
    >
      {/* Media Content */}
      {ad.video_url ? (
        <video
          ref={videoRef}
          src={ad.video_url}
          className="absolute inset-0 w-full h-full object-cover"
          muted={isMuted}
          playsInline
          loop={false}
          onEnded={handleVideoEnded}
        />
      ) : ad.image_url ? (
        <img
          src={ad.image_url}
          alt={ad.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : null}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

      {/* Sponsored Badge */}
      <div className="absolute top-4 left-4 z-10">
        <Badge variant="secondary" className="bg-black/60 text-white border-0 backdrop-blur-sm">
          Sponsored
        </Badge>
      </div>

      {/* Mute Button (for videos) */}
      {ad.video_url && (
        <button
          onClick={toggleMute}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 backdrop-blur-sm"
        >
          {isMuted ? (
            <VolumeX className="h-5 w-5 text-white" />
          ) : (
            <Volume2 className="h-5 w-5 text-white" />
          )}
        </button>
      )}

      {/* Bottom Content */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 p-4 transition-all duration-300",
          bottomNavVisible ? "pb-20" : "pb-4"
        )}
      >
        {/* Advertiser Info */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10 border-2 border-white/20">
            <AvatarImage src={ad.advertiser_logo_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {ad.advertiser_name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">{ad.advertiser_name}</p>
            <p className="text-white/70 text-xs">Sponsored</p>
          </div>
        </div>

        {/* Ad Title & Description */}
        <h3 className="text-white font-bold text-lg mb-1 line-clamp-2">
          {ad.title}
        </h3>
        {ad.description && (
          <p className="text-white/80 text-sm mb-3 line-clamp-2">
            {ad.description}
          </p>
        )}

        {/* CTA Button */}
        <Button
          onClick={handleClick}
          className="w-full bg-white text-black hover:bg-white/90 font-semibold"
        >
          Learn More
          <ExternalLink className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
