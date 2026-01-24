import { useState, useRef } from "react";
import { Play, Pause, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { Sound } from "@/types/video";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SoundCardProps {
  sound: Sound;
  onSelect?: (sound: Sound) => void;
  showFavorite?: boolean;
  compact?: boolean;
}

export function SoundCard({ sound, onSelect, showFavorite = true, compact = false }: SoundCardProps) {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFavorite, setIsFavorite] = useState(sound.isFavorite || false);

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) return;

    if (isFavorite) {
      await supabase
        .from("sound_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("sound_id", sound.id);
      setIsFavorite(false);
    } else {
      await supabase
        .from("sound_favorites")
        .insert({ user_id: user.id, sound_id: sound.id });
      setIsFavorite(true);
    }
  };

  const handleSelect = () => {
    if (onSelect) {
      onSelect(sound);
    }
  };

  const formatUses = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const content = (
    <div 
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer",
        compact && "p-2"
      )}
      onClick={handleSelect}
    >
      {/* Cover / Play button */}
      <div className="relative flex-shrink-0">
        <div className={cn(
          "bg-muted rounded-lg overflow-hidden flex items-center justify-center",
          compact ? "w-12 h-12" : "w-14 h-14"
        )}>
          {sound.cover_url ? (
            <img 
              src={sound.cover_url} 
              alt={sound.title} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
              <span className="text-lg">♪</span>
            </div>
          )}
        </div>
        <button
          onClick={togglePlay}
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg opacity-0 hover:opacity-100 transition-opacity",
            isPlaying && "opacity-100"
          )}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white fill-white" />
          ) : (
            <Play className="w-5 h-5 text-white fill-white" />
          )}
        </button>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-semibold text-foreground truncate",
          compact ? "text-sm" : "text-base"
        )}>
          {sound.title}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {sound.artist || "Unknown"} · {formatUses(sound.uses_count)} videos
        </p>
      </div>

      {/* Favorite button */}
      {showFavorite && user && (
        <button
          onClick={toggleFavorite}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <Heart 
            className={cn(
              "w-5 h-5 transition-colors",
              isFavorite ? "text-red-500 fill-red-500" : "text-muted-foreground"
            )} 
          />
        </button>
      )}

      <audio
        ref={audioRef}
        src={sound.audio_url}
        onEnded={() => setIsPlaying(false)}
        preload="none"
      />
    </div>
  );

  if (onSelect) {
    return content;
  }

  return (
    <Link to={`/sounds/${sound.id}`}>
      {content}
    </Link>
  );
}
