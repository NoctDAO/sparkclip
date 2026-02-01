import { useState, useRef, useEffect } from "react";
import { ExternalLink, Volume2, VolumeX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PhoneMockup } from "./PhoneMockup";
import { cn } from "@/lib/utils";

interface AdPreviewData {
  title: string;
  description: string;
  video_url: string;
  image_url: string;
  click_url: string;
  advertiser_name: string;
  advertiser_logo_url: string;
}

interface AdPreviewProps {
  data: AdPreviewData;
  className?: string;
}

export function AdPreview({ data, className }: AdPreviewProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && data.video_url) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, data.video_url]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const hasMedia = data.video_url || data.image_url;
  const hasRequiredFields = data.title && data.advertiser_name;

  if (!hasRequiredFields && !hasMedia) {
    return (
      <div className={cn("flex flex-col items-center", className)}>
        <PhoneMockup>
          <div className="w-full h-full flex items-center justify-center bg-muted/20 p-6">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Fill in the form to see a preview</p>
              <p className="text-xs mt-2">Title, advertiser name, and media are required</p>
            </div>
          </div>
        </PhoneMockup>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <PhoneMockup>
        <div 
          className="relative h-full w-full bg-black cursor-pointer"
          onClick={togglePlayback}
        >
          {/* Media Content */}
          {data.video_url ? (
            <video
              ref={videoRef}
              src={data.video_url}
              className="absolute inset-0 w-full h-full object-cover"
              muted={isMuted}
              playsInline
              loop
              autoPlay
            />
          ) : data.image_url ? (
            <img
              src={data.image_url}
              alt={data.title || "Ad preview"}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center">
              <p className="text-white/50 text-sm">No media uploaded</p>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

          {/* Sponsored Badge */}
          <div className="absolute top-14 left-4 z-10">
            <Badge variant="secondary" className="bg-black/60 text-white border-0 backdrop-blur-sm text-xs">
              Sponsored
            </Badge>
          </div>

          {/* Mute Button (for videos) */}
          {data.video_url && (
            <button
              onClick={toggleMute}
              className="absolute top-14 right-4 z-10 p-2 rounded-full bg-black/40 backdrop-blur-sm"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-white" />
              ) : (
                <Volume2 className="h-4 w-4 text-white" />
              )}
            </button>
          )}

          {/* Bottom Content */}
          <div className="absolute bottom-16 left-0 right-0 p-4">
            {/* Advertiser Info */}
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-8 w-8 border border-white/20">
                <AvatarImage src={data.advertiser_logo_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {data.advertiser_name?.slice(0, 2).toUpperCase() || "AD"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-xs truncate">
                  {data.advertiser_name || "Advertiser Name"}
                </p>
                <p className="text-white/70 text-[10px]">Sponsored</p>
              </div>
            </div>

            {/* Ad Title & Description */}
            <h3 className="text-white font-bold text-sm mb-1 line-clamp-2">
              {data.title || "Campaign Title"}
            </h3>
            {data.description && (
              <p className="text-white/80 text-xs mb-2 line-clamp-2">
                {data.description}
              </p>
            )}

            {/* CTA Button */}
            <Button
              size="sm"
              className="w-full bg-white text-black hover:bg-white/90 font-semibold text-xs h-8"
              onClick={(e) => e.stopPropagation()}
            >
              Learn More
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </PhoneMockup>
      
      <p className="text-xs text-muted-foreground mt-4 text-center">
        This is how your ad will appear in the feed
      </p>
    </div>
  );
}
