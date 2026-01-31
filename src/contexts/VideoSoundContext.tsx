import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

const MUTED_KEY = "video-muted";
const VOLUME_KEY = "video-volume";

interface VideoSoundContextType {
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
}

const VideoSoundContext = createContext<VideoSoundContextType | undefined>(undefined);

export function VideoSoundProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMutedState] = useState(() => {
    const stored = localStorage.getItem(MUTED_KEY);
    return stored === null ? true : stored === "true";
  });

  const [volume, setVolumeState] = useState(() => {
    const stored = localStorage.getItem(VOLUME_KEY);
    return stored === null ? 1 : parseFloat(stored);
  });

  useEffect(() => {
    localStorage.setItem(MUTED_KEY, String(isMuted));
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem(VOLUME_KEY, String(volume));
  }, [volume]);

  const setIsMuted = useCallback((muted: boolean) => {
    setIsMutedState(muted);
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMutedState((prev) => !prev);
  }, []);

  return (
    <VideoSoundContext.Provider value={{ isMuted, setIsMuted, volume, setVolume, toggleMute }}>
      {children}
    </VideoSoundContext.Provider>
  );
}

export function useVideoSound() {
  const context = useContext(VideoSoundContext);
  if (context === undefined) {
    throw new Error("useVideoSound must be used within a VideoSoundProvider");
  }
  return context;
}
