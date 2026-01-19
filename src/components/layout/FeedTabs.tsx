import { cn } from "@/lib/utils";

interface FeedTabsProps {
  activeTab: "foryou" | "following";
  onTabChange: (tab: "foryou" | "following") => void;
}

export function FeedTabs({ activeTab, onTabChange }: FeedTabsProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pt-4 pb-2">
      <div className="flex items-center gap-4">
        <button
          onClick={() => onTabChange("following")}
          className={cn(
            "text-base font-semibold transition-colors",
            activeTab === "following" 
              ? "text-foreground" 
              : "text-muted-foreground"
          )}
        >
          Following
        </button>
        
        <div className="w-px h-4 bg-muted-foreground/50" />
        
        <button
          onClick={() => onTabChange("foryou")}
          className={cn(
            "text-base font-semibold transition-colors",
            activeTab === "foryou" 
              ? "text-foreground" 
              : "text-muted-foreground"
          )}
        >
          For You
        </button>
      </div>
      
      {/* Active indicator */}
      <div 
        className={cn(
          "absolute bottom-0 h-0.5 w-10 bg-foreground transition-transform duration-200",
          activeTab === "following" ? "-translate-x-12" : "translate-x-10"
        )}
      />
    </div>
  );
}