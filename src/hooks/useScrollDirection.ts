import { useState, useEffect, useCallback, useRef } from "react";

export function useScrollDirection(threshold = 10) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const updateScrollDirection = useCallback(() => {
    const scrollY = window.scrollY;
    const difference = scrollY - lastScrollY.current;
    
    if (Math.abs(difference) < threshold) {
      ticking.current = false;
      return;
    }

    // Scrolling down - hide bars
    if (difference > 0 && scrollY > 50) {
      setIsVisible(false);
    } 
    // Scrolling up - show bars
    else if (difference < 0) {
      setIsVisible(true);
    }

    lastScrollY.current = scrollY > 0 ? scrollY : 0;
    ticking.current = false;
  }, [threshold]);

  const onScroll = useCallback(() => {
    if (!ticking.current) {
      window.requestAnimationFrame(updateScrollDirection);
      ticking.current = true;
    }
  }, [updateScrollDirection]);

  useEffect(() => {
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  return isVisible;
}

// For touch-based swipe detection on video feeds
export function useSwipeDirection(elementRef: React.RefObject<HTMLElement>, threshold = 30) {
  const [isVisible, setIsVisible] = useState(true);
  const touchStartY = useRef(0);
  const lastTouchY = useRef(0);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      lastTouchY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const difference = lastTouchY.current - currentY;

      if (Math.abs(difference) > threshold) {
        // Swiping up (scrolling down) - hide bars
        if (difference > 0) {
          setIsVisible(false);
        } 
        // Swiping down (scrolling up) - show bars
        else {
          setIsVisible(true);
        }
        lastTouchY.current = currentY;
      }
    };

    const handleTouchEnd = () => {
      touchStartY.current = 0;
    };

    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: true });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [elementRef, threshold]);

  return { isVisible, setIsVisible };
}
