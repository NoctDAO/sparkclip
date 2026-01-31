import { useState, useCallback, useMemo } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";
import { 
  getResponsiveSrcSet, 
  getTransformedImageUrl,
  isSupabaseStorageUrl 
} from "@/lib/image-utils";

type AspectRatio = "square" | "video" | "cover" | number;

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  aspectRatio?: AspectRatio;
  fallback?: React.ReactNode;
  showSkeleton?: boolean;
  priority?: boolean;
  containerClassName?: string;
  /** Base width for responsive srcset generation */
  baseWidth?: number;
  /** Image quality (1-100) */
  quality?: number;
  /** Disable responsive optimization */
  disableOptimization?: boolean;
}

const aspectRatioClasses: Record<string, string> = {
  square: "aspect-square",
  video: "aspect-[9/16]",
  cover: "aspect-[16/9]",
};

export function OptimizedImage({
  src,
  alt,
  aspectRatio = "square",
  fallback,
  showSkeleton = true,
  priority = false,
  className,
  containerClassName,
  baseWidth = 300,
  quality = 80,
  disableOptimization = false,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const aspectClass = typeof aspectRatio === "string" 
    ? aspectRatioClasses[aspectRatio] 
    : undefined;

  const aspectStyle = typeof aspectRatio === "number" 
    ? { aspectRatio: aspectRatio } 
    : undefined;

  // Generate responsive image attributes
  const imageAttrs = useMemo(() => {
    if (disableOptimization || !isSupabaseStorageUrl(src)) {
      return { src };
    }

    const optimizedSrc = getTransformedImageUrl(src, {
      width: baseWidth * 2, // Default to 2x for retina
      quality,
      resize: "cover",
    });

    const srcSet = getResponsiveSrcSet(src, baseWidth, quality);

    return {
      src: optimizedSrc,
      srcSet: srcSet || undefined,
    };
  }, [src, baseWidth, quality, disableOptimization]);

  return (
    <div 
      className={cn(
        "relative overflow-hidden bg-muted",
        aspectClass,
        containerClassName
      )}
      style={aspectStyle}
    >
      {/* Loading skeleton */}
      {showSkeleton && isLoading && !hasError && (
        <Skeleton className="absolute inset-0 w-full h-full" shimmer />
      )}

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          {fallback || (
            <ImageOff className="w-8 h-8 text-muted-foreground/50" />
          )}
        </div>
      )}

      {/* Image */}
      {!hasError && (
        <img
          {...imageAttrs}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "w-full h-full object-cover transition-all duration-300",
            isLoading ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100",
            className
          )}
          {...props}
        />
      )}
    </div>
  );
}
