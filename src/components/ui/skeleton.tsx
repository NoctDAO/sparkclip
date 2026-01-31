import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean;
}

function Skeleton({ className, shimmer = true, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted",
        shimmer ? "shimmer" : "animate-pulse",
        className
      )}
      {...props}
    />
  );
}

// Preset: Video grid skeleton (3-column, 9:16 thumbnails)
interface VideoGridSkeletonProps {
  count?: number;
  className?: string;
}

function VideoGridSkeleton({ count = 6, className }: VideoGridSkeletonProps) {
  return (
    <div className={cn("grid grid-cols-3 gap-0.5", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton 
          key={i} 
          className="aspect-[9/16] rounded-sm" 
          shimmer 
        />
      ))}
    </div>
  );
}

// Preset: Avatar skeleton (circular)
interface AvatarSkeletonProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const avatarSizes = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-16 h-16",
  xl: "w-24 h-24",
};

function AvatarSkeleton({ size = "md", className }: AvatarSkeletonProps) {
  return (
    <Skeleton 
      className={cn("rounded-full", avatarSizes[size], className)} 
      shimmer 
    />
  );
}

// Preset: Text line skeleton
interface TextLineSkeletonProps {
  lines?: number;
  className?: string;
  lineClassName?: string;
}

function TextLineSkeleton({ lines = 1, className, lineClassName }: TextLineSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            "h-4 rounded",
            i === lines - 1 && lines > 1 ? "w-3/4" : "w-full",
            lineClassName
          )} 
          shimmer 
        />
      ))}
    </div>
  );
}

export { Skeleton, VideoGridSkeleton, AvatarSkeleton, TextLineSkeleton };
