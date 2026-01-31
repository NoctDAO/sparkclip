import { SkipForward } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useSeriesAutoPlay } from "@/hooks/useSeriesAutoPlay";

export function SeriesAutoPlayToggle() {
  const { autoPlayEnabled, toggleAutoPlay } = useSeriesAutoPlay();

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-secondary">
          <SkipForward className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Series auto-play</p>
          <p className="text-sm text-muted-foreground">
            Automatically play next part when video ends
          </p>
        </div>
      </div>
      <Switch checked={autoPlayEnabled} onCheckedChange={toggleAutoPlay} />
    </div>
  );
}
