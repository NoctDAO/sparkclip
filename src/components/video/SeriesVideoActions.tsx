import { MoreVertical, Star, Pencil, ArrowUpToLine, ArrowDownToLine, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Video } from "@/types/video";
import { cn } from "@/lib/utils";

interface SeriesVideoActionsProps {
  video: Video;
  isFirst: boolean;
  isLast: boolean;
  isCoverVideo: boolean;
  onSetAsCover: () => void;
  onEditCaption: () => void;
  onMoveToTop: () => void;
  onMoveToBottom: () => void;
  onRemove: () => void;
}

export function SeriesVideoActions({
  video,
  isFirst,
  isLast,
  isCoverVideo,
  onSetAsCover,
  onEditCaption,
  onMoveToTop,
  onMoveToBottom,
  onRemove,
}: SeriesVideoActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-lg border-border/50">
        <DropdownMenuItem
          onClick={onSetAsCover}
          disabled={isCoverVideo}
          className={cn(
            "cursor-pointer",
            isCoverVideo && "text-[hsl(var(--gold))]"
          )}
        >
          {isCoverVideo ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Current Cover
            </>
          ) : (
            <>
              <Star className="w-4 h-4 mr-2" />
              Set as Cover
            </>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={onEditCaption} className="cursor-pointer">
          <Pencil className="w-4 h-4 mr-2" />
          Edit Caption
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={onMoveToTop}
          disabled={isFirst}
          className="cursor-pointer"
        >
          <ArrowUpToLine className="w-4 h-4 mr-2" />
          Move to Top
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={onMoveToBottom}
          disabled={isLast}
          className="cursor-pointer"
        >
          <ArrowDownToLine className="w-4 h-4 mr-2" />
          Move to Bottom
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={onRemove}
          className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Remove from Series
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
