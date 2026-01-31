import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { getOptimizedAvatarUrl, isSupabaseStorageUrl } from "@/lib/image-utils";

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full ring-2 ring-transparent hover:ring-primary/30 transition-all duration-200",
  {
    variants: {
      size: {
        xs: "h-6 w-6",
        sm: "h-8 w-8",
        md: "h-10 w-10",
        lg: "h-16 w-16",
        xl: "h-24 w-24",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(avatarVariants({ size }), className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

interface AvatarImageProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> {
  /** Size variant for image optimization - should match parent Avatar size */
  optimizeSize?: "xs" | "sm" | "md" | "lg" | "xl";
}

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  AvatarImageProps
>(({ className, src, optimizeSize = "md", ...props }, ref) => {
  const [isLoading, setIsLoading] = React.useState(true);

  // Optimize the image URL if it's from Supabase Storage
  const optimizedSrc = React.useMemo(() => {
    if (!src) return src;
    if (isSupabaseStorageUrl(src)) {
      return getOptimizedAvatarUrl(src, optimizeSize);
    }
    return src;
  }, [src, optimizeSize]);

  return (
    <AvatarPrimitive.Image 
      ref={ref}
      src={optimizedSrc}
      className={cn(
        "aspect-square h-full w-full object-cover transition-opacity duration-300",
        isLoading ? "opacity-0" : "opacity-100",
        className
      )} 
      onLoad={() => setIsLoading(false)}
      {...props} 
    />
  );
});
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full",
      "bg-gradient-to-br from-primary/20 to-accent/20 text-foreground font-medium",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback, avatarVariants };
