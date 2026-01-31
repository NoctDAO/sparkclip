import { cn } from "@/lib/utils";

interface FeedTabsProps {
  activeTab: "foryou" | "following";
  onTabChange: (tab: "foryou" | "following") => void;
  isVisible?: boolean;
}

export function FeedTabs({ activeTab, onTabChange, isVisible = true }: FeedTabsProps) {
  return (
    <div 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-center pb-1.5 bg-gradient-to-b from-background/80 to-transparent backdrop-blur-sm transition-transform duration-300",
        !isVisible && "-translate-y-full"
      )}
      style={{ paddingTop: "calc(var(--safe-top) + 0.75rem)" }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => onTabChange("following")}
          className={cn(
            "text-sm font-semibold transition-colors drop-shadow-sm",
            activeTab === "following" 
              ? "text-foreground" 
              : "text-foreground/60"
          )}
        >
          Following
        </button>
        
        <div className="w-px h-3.5 bg-foreground/30" />
        
        <button
          onClick={() => onTabChange("foryou")}
          className={cn(
            "text-sm font-semibold transition-colors drop-shadow-sm",
            activeTab === "foryou" 
              ? "text-foreground" 
              : "text-foreground/60"
          )}
        >
          For You
        </button>
      </div>
      
      {/* Active indicator */}
      <div 
        className={cn(
          "absolute bottom-0 h-0.5 w-8 bg-foreground transition-transform duration-200",
          activeTab === "following" ? "-translate-x-11" : "translate-x-9"
        )}
      />
    </div>
  );
}