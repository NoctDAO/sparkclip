/**
 * Image optimization utilities for responsive images and compression
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
}

interface ResponsiveImageSet {
  src: string;
  srcSet: string;
  sizes: string;
}

/**
 * Check if a URL is from Supabase Storage
 */
export function isSupabaseStorageUrl(url: string): boolean {
  if (!url || !SUPABASE_URL) return false;
  return url.startsWith(SUPABASE_URL) && url.includes("/storage/");
}

/**
 * Transform a Supabase Storage URL with resize/quality parameters
 * Uses Supabase's built-in image transformation
 */
export function getTransformedImageUrl(
  url: string,
  options: ImageTransformOptions
): string {
  if (!url) return url;
  
  // Only transform Supabase Storage URLs
  if (!isSupabaseStorageUrl(url)) {
    return url;
  }

  // Convert public URL to render URL for transformations
  // From: /storage/v1/object/public/bucket/path
  // To: /storage/v1/render/image/public/bucket/path
  let transformUrl = url.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/"
  );

  const params = new URLSearchParams();
  
  if (options.width) params.set("width", String(options.width));
  if (options.height) params.set("height", String(options.height));
  if (options.quality) params.set("quality", String(options.quality));
  if (options.resize) params.set("resize", options.resize);

  const queryString = params.toString();
  if (queryString) {
    transformUrl += (transformUrl.includes("?") ? "&" : "?") + queryString;
  }

  return transformUrl;
}

/**
 * Generate a responsive srcset for different device pixel ratios
 * Supports 1x, 1.5x, 2x, and 3x densities
 */
export function getResponsiveSrcSet(
  url: string,
  baseWidth: number,
  quality = 80
): string {
  if (!url) return "";
  
  // For non-Supabase URLs, just return the original
  if (!isSupabaseStorageUrl(url)) {
    return url;
  }

  const densities = [1, 1.5, 2, 3];
  
  const srcSetParts = densities.map((density) => {
    const width = Math.round(baseWidth * density);
    // Reduce quality slightly for higher densities to save bandwidth
    const adjustedQuality = density > 2 ? Math.round(quality * 0.9) : quality;
    
    const transformedUrl = getTransformedImageUrl(url, {
      width,
      quality: adjustedQuality,
      resize: "cover",
    });
    
    return `${transformedUrl} ${density}x`;
  });

  return srcSetParts.join(", ");
}

/**
 * Generate responsive image attributes for different viewport widths
 */
export function getResponsiveImageSet(
  url: string,
  options: {
    /** Base width for mobile viewport */
    mobileWidth?: number;
    /** Base width for tablet viewport */
    tabletWidth?: number;
    /** Base width for desktop viewport */
    desktopWidth?: number;
    /** Image quality (1-100) */
    quality?: number;
  } = {}
): ResponsiveImageSet {
  const {
    mobileWidth = 150,
    tabletWidth = 200,
    desktopWidth = 300,
    quality = 80,
  } = options;

  // For non-Supabase URLs, return simple set
  if (!isSupabaseStorageUrl(url)) {
    return {
      src: url,
      srcSet: "",
      sizes: "",
    };
  }

  // Generate srcset for different viewport breakpoints and densities
  const srcSetParts: string[] = [];
  
  // Mobile sizes (up to 640px viewport)
  [1, 2, 3].forEach((density) => {
    const width = Math.round(mobileWidth * density);
    const transformedUrl = getTransformedImageUrl(url, {
      width,
      quality: density > 2 ? Math.round(quality * 0.9) : quality,
      resize: "cover",
    });
    srcSetParts.push(`${transformedUrl} ${width}w`);
  });

  // Tablet sizes (641px - 1024px viewport)
  [1, 2].forEach((density) => {
    const width = Math.round(tabletWidth * density);
    const transformedUrl = getTransformedImageUrl(url, {
      width,
      quality,
      resize: "cover",
    });
    srcSetParts.push(`${transformedUrl} ${width}w`);
  });

  // Desktop sizes (1025px+ viewport)
  [1, 2].forEach((density) => {
    const width = Math.round(desktopWidth * density);
    const transformedUrl = getTransformedImageUrl(url, {
      width,
      quality,
      resize: "cover",
    });
    srcSetParts.push(`${transformedUrl} ${width}w`);
  });

  // Default src is the mobile 2x version (good balance)
  const defaultSrc = getTransformedImageUrl(url, {
    width: mobileWidth * 2,
    quality,
    resize: "cover",
  });

  return {
    src: defaultSrc,
    srcSet: srcSetParts.join(", "),
    sizes: `(max-width: 640px) ${mobileWidth}px, (max-width: 1024px) ${tabletWidth}px, ${desktopWidth}px`,
  };
}

/**
 * Get optimized thumbnail URL for video grid items
 */
export function getOptimizedThumbnailUrl(
  url: string | null | undefined,
  size: "small" | "medium" | "large" = "medium"
): string {
  if (!url) return "";
  
  const sizeConfig = {
    small: { width: 150, quality: 75 },
    medium: { width: 300, quality: 80 },
    large: { width: 450, quality: 85 },
  };

  const config = sizeConfig[size];
  
  return getTransformedImageUrl(url, {
    width: config.width,
    quality: config.quality,
    resize: "cover",
  });
}

/**
 * Get optimized avatar URL
 */
export function getOptimizedAvatarUrl(
  url: string | null | undefined,
  size: "xs" | "sm" | "md" | "lg" | "xl" = "md"
): string {
  if (!url) return "";
  
  const sizeMap = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 64,
    xl: 96,
  };

  const pixelSize = sizeMap[size];
  // Use 2x resolution for crisp avatars on retina displays
  const targetWidth = pixelSize * 2;

  return getTransformedImageUrl(url, {
    width: targetWidth,
    height: targetWidth,
    quality: 85,
    resize: "cover",
  });
}
