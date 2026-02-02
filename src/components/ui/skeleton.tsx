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

// Preset: Profile header skeleton
interface ProfileHeaderSkeletonProps {
  className?: string;
}

function ProfileHeaderSkeleton({ className }: ProfileHeaderSkeletonProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 py-4", className)}>
      <AvatarSkeleton size="xl" />
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-6 w-32 rounded" shimmer />
        <Skeleton className="h-4 w-24 rounded" shimmer />
      </div>
      <div className="flex items-center gap-8 mt-2">
        <div className="flex flex-col items-center gap-1">
          <Skeleton className="h-5 w-12 rounded" shimmer />
          <Skeleton className="h-3 w-16 rounded" shimmer />
        </div>
        <div className="flex flex-col items-center gap-1">
          <Skeleton className="h-5 w-12 rounded" shimmer />
          <Skeleton className="h-3 w-16 rounded" shimmer />
        </div>
        <div className="flex flex-col items-center gap-1">
          <Skeleton className="h-5 w-12 rounded" shimmer />
          <Skeleton className="h-3 w-16 rounded" shimmer />
        </div>
      </div>
      <Skeleton className="h-10 w-32 rounded-lg mt-2" shimmer />
    </div>
  );
}

// Preset: Hashtag chip skeleton for trending tags
function HashtagChipSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton 
          key={i} 
          className="h-9 w-24 rounded-full shrink-0" 
          shimmer 
        />
      ))}
    </div>
  );
}

// Preset: Creator card skeleton for trending creators
function CreatorCardSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 shrink-0">
          <Skeleton className="w-16 h-16 rounded-full" shimmer />
          <Skeleton className="h-3 w-16 rounded" shimmer />
          <Skeleton className="h-2 w-12 rounded" shimmer />
        </div>
      ))}
    </div>
  );
}

// Preset: Video card skeleton for horizontal scrolling lists
function VideoCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton 
          key={i} 
          className="w-28 aspect-[9/16] rounded-lg shrink-0" 
          shimmer 
        />
      ))}
    </div>
  );
}

// Preset: Notification item skeleton
function NotificationItemSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-4">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" shimmer />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 rounded" shimmer />
            <Skeleton className="h-3 w-1/2 rounded" shimmer />
          </div>
          <Skeleton className="w-8 h-8 rounded-full shrink-0" shimmer />
        </div>
      ))}
    </div>
  );
}

// Preset: Conversation item skeleton
function ConversationItemSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          <Skeleton className="w-12 h-12 rounded-full shrink-0" shimmer />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24 rounded" shimmer />
            <Skeleton className="h-3 w-40 rounded" shimmer />
          </div>
        </div>
      ))}
    </div>
  );
}

export { 
  Skeleton, 
  VideoGridSkeleton, 
  AvatarSkeleton, 
  TextLineSkeleton,
  ProfileHeaderSkeleton,
  HashtagChipSkeleton,
  CreatorCardSkeleton,
  VideoCardSkeleton,
  NotificationItemSkeleton,
  ConversationItemSkeleton,
};
