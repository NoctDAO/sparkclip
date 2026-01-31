import { Volume2, VolumeX } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useVideoSoundPreference } from "@/hooks/useVideoSoundPreference";

export function SoundPreferenceToggle() {
  const { isMuted, toggleMute, volume, setVolume } = useVideoSoundPreference();

  return (
    <div className="px-4 py-3">
      <button
        onClick={toggleMute}
        className="w-full flex items-center justify-between hover:bg-secondary/50 transition-colors text-left rounded-md -mx-2 px-2 py-2"
      >
        <div className="flex items-center gap-3">
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          <div>
            <p className="font-medium">Start videos muted</p>
            <p className="text-sm text-muted-foreground">
              Mute audio when videos begin playing
            </p>
          </div>
        </div>
        <Switch
          checked={isMuted}
          onCheckedChange={toggleMute}
          onClick={(e) => e.stopPropagation()}
        />
      </button>
      
      {!isMuted && (
        <div className="mt-3 flex items-center gap-3 pl-8">
          <span className="text-sm text-muted-foreground min-w-16">Volume</span>
          <Slider
            value={[volume * 100]}
            onValueChange={([val]) => setVolume(val / 100)}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground w-8 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
