import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Pause, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sound } from "@/types/video";
import { cn } from "@/lib/utils";

export function TrendingSounds() {
  const navigate = useNavigate();
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchTrendingSounds();
  }, []);

  const fetchTrendingSounds = async () => {
    const { data } = await supabase
      .from("sounds")
      .select("*")
      .order("uses_count", { ascending: false })
      .limit(10);

    if (data) {
      setSounds(data as Sound[]);
    }
  };

  const togglePlay = (sound: Sound, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (playingId === sound.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(sound.audio_url);
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingId(null);
      setPlayingId(sound.id);
    }
  };

  const formatUses = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (sounds.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="font-bold text-lg mb-3 flex items-center gap-2 px-4">
        <Music className="w-5 h-5 text-primary" />
        Trending Sounds
      </h2>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {sounds.map((sound) => (
          <div
            key={sound.id}
            className="flex-shrink-0 w-32 cursor-pointer group"
            onClick={() => navigate(`/sounds/${sound.id}`)}
          >
            {/* Cover with play button */}
            <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-muted mb-2">
              {sound.cover_url ? (
                <img
                  src={sound.cover_url}
                  alt={sound.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center">
                  <span className="text-4xl">♪</span>
                </div>
              )}
              <button
                onClick={(e) => togglePlay(sound, e)}
                className={cn(
                  "absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity",
                  playingId === sound.id && "opacity-100"
                )}
              >
                {playingId === sound.id ? (
                  <Pause className="w-8 h-8 text-white fill-white" />
                ) : (
                  <Play className="w-8 h-8 text-white fill-white" />
                )}
              </button>
            </div>
            
            {/* Info */}
            <p className="font-semibold text-sm truncate">{sound.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {formatUses(sound.uses_count)} videos
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
