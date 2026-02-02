import { ReactNode } from "react";
import { useSwipeAction } from "@/hooks/useSwipeAction";
import { cn } from "@/lib/utils";
import { Check, Trash2 } from "lucide-react";

interface SwipeActionProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: {
    icon?: ReactNode;
    label?: string;
    color?: string;
  };
  rightAction?: {
    icon?: ReactNode;
    label?: string;
    color?: string;
  };
  className?: string;
  disabled?: boolean;
}

export function SwipeAction({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction = {
    icon: <Check className="w-5 h-5" />,
    label: "Done",
    color: "bg-green-500",
  },
  rightAction = {
    icon: <Trash2 className="w-5 h-5" />,
    label: "Delete",
    color: "bg-destructive",
  },
  className,
  disabled = false,
}: SwipeActionProps) {
  const { touchHandlers, swipeOffset, swipeProgress, isSwiping } = useSwipeAction({
    threshold: 80,
    maxSwipe: 120,
    onSwipeLeft: disabled ? undefined : onSwipeLeft,
    onSwipeRight: disabled ? undefined : onSwipeRight,
  });

  const showLeftAction = swipeOffset < -20;
  const showRightAction = swipeOffset > 20;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Left action background (revealed when swiping right) */}
      {onSwipeRight && (
        <div
          className={cn(
            "absolute inset-y-0 left-0 flex items-center justify-start px-4 transition-opacity",
            rightAction.color,
            showRightAction ? "opacity-100" : "opacity-0"
          )}
          style={{
            width: Math.abs(swipeOffset) + 20,
          }}
        >
          <div
            className={cn(
              "flex items-center gap-2 text-white transition-transform",
              swipeProgress >= 1 ? "scale-110" : "scale-100"
            )}
          >
            {rightAction.icon}
            {swipeProgress >= 0.5 && (
              <span className="text-sm font-medium">{rightAction.label}</span>
            )}
          </div>
        </div>
      )}

      {/* Right action background (revealed when swiping left) */}
      {onSwipeLeft && (
        <div
          className={cn(
            "absolute inset-y-0 right-0 flex items-center justify-end px-4 transition-opacity",
            leftAction.color,
            showLeftAction ? "opacity-100" : "opacity-0"
          )}
          style={{
            width: Math.abs(swipeOffset) + 20,
          }}
        >
          <div
            className={cn(
              "flex items-center gap-2 text-white transition-transform",
              swipeProgress >= 1 ? "scale-110" : "scale-100"
            )}
          >
            {swipeProgress >= 0.5 && (
              <span className="text-sm font-medium">{leftAction.label}</span>
            )}
            {leftAction.icon}
          </div>
        </div>
      )}

      {/* Main content */}
      <div
        {...(disabled ? {} : touchHandlers)}
        className={cn(
          "relative bg-background transition-transform",
          isSwiping ? "transition-none" : "transition-transform duration-200"
        )}
        style={{
          transform: `translateX(${disabled ? 0 : swipeOffset}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
