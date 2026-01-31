import { Layers } from "lucide-react";
import { VideoSeries } from "@/types/video";

interface SeriesIndicatorProps {
  series: VideoSeries;
  currentOrder: number;
  onClick?: () => void;
}

export function SeriesIndicator({ series, currentOrder, onClick }: SeriesIndicatorProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="w-fit flex items-center gap-1.5 px-2.5 py-1 bg-background/80 backdrop-blur-sm rounded-full text-xs font-medium text-foreground hover:bg-background/90 transition-colors"
    >
      <Layers className="w-3.5 h-3.5" />
      <span>
        Part {currentOrder} of {series.videos_count}
      </span>
    </button>
  );
}
