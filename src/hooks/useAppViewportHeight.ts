import { useEffect } from "react";

/**
 * Keeps a CSS variable (--app-height) in sync with the *visual* viewport height.
 * This prevents 100vh/h-screen layouts from being taller than the visible area
 * when the mobile browser URL bar is shown/hidden.
 */
export function useAppViewportHeight() {
  useEffect(() => {
    const setAppHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${Math.round(height)}px`);
    };

    setAppHeight();

    // visualViewport fires on URL bar show/hide on mobile.
    window.visualViewport?.addEventListener("resize", setAppHeight);
    window.visualViewport?.addEventListener("scroll", setAppHeight);
    window.addEventListener("resize", setAppHeight);
    window.addEventListener("orientationchange", setAppHeight);

    return () => {
      window.visualViewport?.removeEventListener("resize", setAppHeight);
      window.visualViewport?.removeEventListener("scroll", setAppHeight);
      window.removeEventListener("resize", setAppHeight);
      window.removeEventListener("orientationchange", setAppHeight);
    };
  }, []);
}
