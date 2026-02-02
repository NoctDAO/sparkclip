import { useState, useCallback, useRef } from "react";

interface SwipeState {
  startX: number;
  currentX: number;
  startY: number;
  currentY: number;
  swiping: boolean;
  direction: "left" | "right" | null;
}

interface UseSwipeActionOptions {
  threshold?: number; // Minimum distance to trigger action (default: 80)
  maxSwipe?: number; // Maximum swipe distance (default: 120)
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function useSwipeAction(options: UseSwipeActionOptions = {}) {
  const { 
    threshold = 80, 
    maxSwipe = 120, 
    onSwipeLeft, 
    onSwipeRight 
  } = options;

  const [swipeState, setSwipeState] = useState<SwipeState>({
    startX: 0,
    currentX: 0,
    startY: 0,
    currentY: 0,
    swiping: false,
    direction: null,
  });

  const isScrolling = useRef<boolean | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    isScrolling.current = null;
    
    setSwipeState({
      startX: touch.clientX,
      currentX: touch.clientX,
      startY: touch.clientY,
      currentY: touch.clientY,
      swiping: true,
      direction: null,
    });
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!swipeState.swiping) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - swipeState.startX;
      const deltaY = touch.clientY - swipeState.startY;

      // Determine if this is a scroll or swipe on first significant move
      if (isScrolling.current === null) {
        isScrolling.current = Math.abs(deltaY) > Math.abs(deltaX);
      }

      // If scrolling vertically, don't handle swipe
      if (isScrolling.current) {
        return;
      }

      // Prevent scrolling while swiping horizontally
      e.preventDefault();

      const clampedX = Math.max(-maxSwipe, Math.min(maxSwipe, deltaX));
      
      setSwipeState((prev) => ({
        ...prev,
        currentX: swipeState.startX + clampedX,
        currentY: touch.clientY,
        direction: clampedX < 0 ? "left" : clampedX > 0 ? "right" : null,
      }));
    },
    [swipeState.swiping, swipeState.startX, swipeState.startY, maxSwipe]
  );

  const handleTouchEnd = useCallback(() => {
    if (!swipeState.swiping) return;

    const deltaX = swipeState.currentX - swipeState.startX;

    // Check if swipe threshold was met
    if (Math.abs(deltaX) >= threshold) {
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }

      if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      } else if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      }
    }

    // Reset state
    setSwipeState({
      startX: 0,
      currentX: 0,
      startY: 0,
      currentY: 0,
      swiping: false,
      direction: null,
    });
    isScrolling.current = null;
  }, [swipeState, threshold, onSwipeLeft, onSwipeRight]);

  const getSwipeOffset = useCallback(() => {
    if (!swipeState.swiping || isScrolling.current) return 0;
    return swipeState.currentX - swipeState.startX;
  }, [swipeState]);

  const getSwipeProgress = useCallback(() => {
    const offset = getSwipeOffset();
    return Math.min(1, Math.abs(offset) / threshold);
  }, [getSwipeOffset, threshold]);

  const touchHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchEnd,
  };

  return {
    touchHandlers,
    swipeOffset: getSwipeOffset(),
    swipeProgress: getSwipeProgress(),
    swipeDirection: swipeState.direction,
    isSwiping: swipeState.swiping && !isScrolling.current,
  };
}
