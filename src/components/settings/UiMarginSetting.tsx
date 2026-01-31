import { Smartphone, Heart, MessageCircle, Share2, Music } from "lucide-react";
import { useUiSafeMargin, UiMarginSize } from "@/hooks/useUiSafeMargin";
import { cn } from "@/lib/utils";

const LABELS: Record<UiMarginSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

// Preview offset values (in pixels) for the mini preview
const PREVIEW_OFFSETS: Record<UiMarginSize, number> = {
  small: 8,
  medium: 16,
  large: 28,
};

export function UiMarginSetting() {
  const { marginSize, setSize, options } = useUiSafeMargin();

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Smartphone className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">UI Safe Margin</p>
            <p className="text-xs text-muted-foreground">
              Adjust spacing above bottom nav
            </p>
          </div>
        </div>

        <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
          {options.map((size) => (
            <button
              key={size}
              onClick={() => setSize(size)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                marginSize === size
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {LABELS[size]}
            </button>
          ))}
        </div>
      </div>

      {/* Live Preview */}
      <div className="relative w-full h-28 bg-gradient-to-b from-muted/30 to-muted/60 rounded-lg overflow-hidden border border-border">
        {/* Mock video area */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground">Video Preview</span>
        </div>

        {/* Mock bottom nav */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-background/90 border-t border-border flex items-center justify-around px-2">
          {["Home", "Search", "+", "Inbox", "Me"].map((label, i) => (
            <span key={i} className="text-[7px] text-muted-foreground">{label}</span>
          ))}
        </div>

        {/* Mock action buttons (right side) - animated position */}
        <div 
          className="absolute right-2 flex flex-col items-center gap-1.5 transition-all duration-300 ease-out"
          style={{ bottom: `${24 + PREVIEW_OFFSETS[marginSize]}px` }}
        >
          <Heart className="w-4 h-4 text-primary" />
          <MessageCircle className="w-4 h-4 text-foreground/70" />
          <Share2 className="w-4 h-4 text-foreground/70" />
        </div>

        {/* Mock info area (bottom left) - animated position */}
        <div 
          className="absolute left-2 right-10 transition-all duration-300 ease-out"
          style={{ bottom: `${24 + PREVIEW_OFFSETS[marginSize]}px` }}
        >
          <div className="flex items-center gap-1 mb-0.5">
            <div className="w-4 h-4 rounded-full bg-muted" />
            <span className="text-[8px] font-medium text-foreground">@user</span>
          </div>
          <p className="text-[7px] text-foreground/80 truncate">Caption text here...</p>
          <div className="flex items-center gap-0.5 mt-0.5">
            <Music className="w-2.5 h-2.5 text-foreground/60" />
            <span className="text-[6px] text-foreground/60">Original sound</span>
          </div>
        </div>

        {/* Margin indicator line */}
        <div 
          className="absolute left-0 right-0 border-t border-dashed border-primary/50 transition-all duration-300 ease-out"
          style={{ bottom: `${24 + PREVIEW_OFFSETS[marginSize]}px` }}
        />
      </div>
    </div>
  );
}
