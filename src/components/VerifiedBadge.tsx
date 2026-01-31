import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

export function VerifiedBadge({ className, size = "md" }: VerifiedBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <BadgeCheck
          className={cn(
            sizeClasses[size],
            "text-primary fill-primary/20 inline-block",
            className
          )}
        />
      </TooltipTrigger>
      <TooltipContent>
        <p>Verified creator</p>
      </TooltipContent>
    </Tooltip>
  );
}
