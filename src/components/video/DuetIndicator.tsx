import { Link } from "react-router-dom";
import { Users } from "lucide-react";

interface DuetIndicatorProps {
  sourceVideoId: string;
  layout?: string | null;
  className?: string;
}

export function DuetIndicator({ sourceVideoId, layout, className }: DuetIndicatorProps) {
  const layoutLabel = layout === "top-bottom" 
    ? "Top/Bottom" 
    : layout === "picture-in-picture" 
    ? "PiP" 
    : "Side by Side";

  return (
    <Link
      to={`/video/${sourceVideoId}`}
      className={`inline-flex items-center gap-1.5 px-2 py-1 bg-background/60 backdrop-blur-sm rounded-full text-xs font-medium text-foreground hover:bg-background/80 transition-colors ${className}`}
    >
      <Users className="w-3 h-3" />
      <span>Duet • {layoutLabel}</span>
    </Link>
  );
}
