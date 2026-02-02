import { Play, Pause, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface HostControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSyncAll: () => void;
}

export function HostControls({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  onSyncAll,
}: HostControlsProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-3 bg-background/80 backdrop-blur-sm rounded-2xl p-4 min-w-[280px]">
      {/* Progress bar */}
      <div className="w-full flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-10 text-right">
          {formatTime(currentTime)}
        </span>
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={([value]) => onSeek(value)}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground w-10">
          {formatTime(duration)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onSyncAll}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sync All
        </Button>

        <Button
          size="lg"
          onClick={onPlayPause}
          className={cn(
            "rounded-full w-14 h-14",
            isPlaying ? "bg-primary" : "bg-primary"
          )}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </Button>

        <div className="w-[72px]" /> {/* Spacer for balance */}
      </div>

      <p className="text-xs text-muted-foreground">
        You control playback for everyone
      </p>
    </div>
  );
}
