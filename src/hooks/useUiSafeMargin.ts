import { useState, useEffect, useCallback } from "react";

export type UiMarginSize = "small" | "medium" | "large";

const STORAGE_KEY = "ui-safe-margin";

const MARGIN_VALUES: Record<UiMarginSize, string> = {
  small: "0.75rem",
  medium: "1.5rem",
  large: "2.5rem",
};

export function useUiSafeMargin() {
  const [marginSize, setMarginSize] = useState<UiMarginSize>(() => {
    if (typeof window === "undefined") return "medium";
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as UiMarginSize) || "medium";
  });

  // Sync CSS variable when marginSize changes
  useEffect(() => {
    const value = MARGIN_VALUES[marginSize];
    document.documentElement.style.setProperty("--ui-safe-margin", value);
    localStorage.setItem(STORAGE_KEY, marginSize);
  }, [marginSize]);

  // Also set on mount for SSR hydration
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as UiMarginSize | null;
    const size = stored || "medium";
    document.documentElement.style.setProperty("--ui-safe-margin", MARGIN_VALUES[size]);
  }, []);

  const setSize = useCallback((size: UiMarginSize) => {
    setMarginSize(size);
  }, []);

  return {
    marginSize,
    setSize,
    options: ["small", "medium", "large"] as const,
  };
}
