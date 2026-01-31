import { useNavigate } from "react-router-dom";
import { Music, Play } from "lucide-react";
import { Sound } from "@/types/video";

interface SoundResultsProps {
  sounds: Sound[];
}

export function SoundResults({ sounds }: SoundResultsProps) {
  const navigate = useNavigate();

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (sounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>No sounds found</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {sounds.map((sound) => (
        <div
          key={sound.id}
          onClick={() => navigate(`/sounds/${sound.id}`)}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary cursor-pointer transition-colors"
        >
          <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden shrink-0 relative group">
            {sound.cover_url ? (
              <img
                src={sound.cover_url}
                alt={sound.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Music className="w-6 h-6 text-primary" />
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-6 h-6 text-white fill-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{sound.title}</p>
            {sound.artist && (
              <p className="text-sm text-muted-foreground truncate">
                {sound.artist}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {formatCount(sound.uses_count)} videos
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
