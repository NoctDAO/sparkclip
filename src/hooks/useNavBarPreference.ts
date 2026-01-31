import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "nav-bar-auto-hide";

export function useNavBarPreference() {
  const [autoHideEnabled, setAutoHideEnabled] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(autoHideEnabled));
  }, [autoHideEnabled]);

  const toggleAutoHide = useCallback(() => {
    setAutoHideEnabled((prev) => !prev);
  }, []);

  return { autoHideEnabled, setAutoHideEnabled, toggleAutoHide };
}
