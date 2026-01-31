import { useState, useCallback, useMemo } from "react";
import { Play, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  getResponsiveSrcSet, 
  getOptimizedThumbnailUrl,
  isSupabaseStorageUrl 
} from "@/lib/image-utils";

interface VideoThumbnailProps {
  thumbnailUrl?: string | null;
  videoUrl: string;
  alt?: string;
  showPlayIcon?: boolean;
  onClick?: () => void;
  className?: string;
  priority?: boolean;
  /** Size variant for optimization */
  size?: "small" | "medium" | "large";
}

const sizeToBaseWidth = {
  small: 100,
  medium: 150,
  large: 200,
};

export function VideoThumbnail({
  thumbnailUrl,
  videoUrl,
  alt = "Video thumbnail",
  showPlayIcon = false,
  onClick,
  className,
  priority = false,
  size = "medium",
}: VideoThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  // Generate optimized image attributes
  const imageAttrs = useMemo(() => {
    if (!thumbnailUrl) return null;
    
    if (!isSupabaseStorageUrl(thumbnailUrl)) {
      return { src: thumbnailUrl };
    }

    const baseWidth = sizeToBaseWidth[size];
    const optimizedSrc = getOptimizedThumbnailUrl(thumbnailUrl, size);
    const srcSet = getResponsiveSrcSet(thumbnailUrl, baseWidth, 80);

    return {
      src: optimizedSrc,
      srcSet: srcSet || undefined,
    };
  }, [thumbnailUrl, size]);

  return (
    <div 
      className={cn(
        "relative aspect-[9/16] overflow-hidden bg-secondary group cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* Loading skeleton */}
      {isLoading && !hasError && (
        <Skeleton className="absolute inset-0 w-full h-full" shimmer />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary">
          <ImageOff className="w-8 h-8 text-muted-foreground/50" />
        </div>
      )}

      {/* Thumbnail image or video fallback */}
      {!hasError && (
        <>
          {imageAttrs ? (
            <img
              {...imageAttrs}
              alt={alt}
              loading={priority ? "eager" : "lazy"}
              decoding={priority ? "sync" : "async"}
              onLoad={handleLoad}
              onError={handleError}
              className={cn(
                "w-full h-full object-cover transition-all duration-300",
                "group-hover:scale-105",
                isLoading ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100"
              )}
            />
          ) : (
            <video
              src={videoUrl}
              className={cn(
                "w-full h-full object-cover transition-transform duration-300",
                "group-hover:scale-105"
              )}
              muted
              preload="metadata"
              onLoadedData={handleLoad}
              onError={handleError}
            />
          )}
        </>
      )}

      {/* Gradient overlay for better contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {/* Play icon overlay */}
      {showPlayIcon && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-6 h-6 text-foreground fill-foreground ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
}
