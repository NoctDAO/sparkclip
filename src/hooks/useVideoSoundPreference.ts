import { useState, useEffect, useCallback } from "react";

const MUTED_KEY = "video-muted";
const VOLUME_KEY = "video-volume";

export function useVideoSoundPreference() {
  const [isMuted, setIsMuted] = useState(() => {
    const stored = localStorage.getItem(MUTED_KEY);
    return stored === null ? true : stored === "true";
  });

  const [volume, setVolume] = useState(() => {
    const stored = localStorage.getItem(VOLUME_KEY);
    return stored === null ? 1 : parseFloat(stored);
  });

  useEffect(() => {
    localStorage.setItem(MUTED_KEY, String(isMuted));
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem(VOLUME_KEY, String(volume));
  }, [volume]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  return { isMuted, setIsMuted, volume, setVolume, toggleMute };
}
