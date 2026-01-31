import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "series-auto-play";

export function useSeriesAutoPlay() {
  const [autoPlayEnabled, setAutoPlayEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Default to true if not set
    return stored === null ? true : stored === "true";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(autoPlayEnabled));
  }, [autoPlayEnabled]);

  const toggleAutoPlay = useCallback(() => {
    setAutoPlayEnabled((prev) => !prev);
  }, []);

  return { autoPlayEnabled, setAutoPlayEnabled, toggleAutoPlay };
}
