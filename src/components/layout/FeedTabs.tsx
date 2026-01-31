import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedTabsProps {
  activeTab: "foryou" | "following";
  onTabChange: (tab: "foryou" | "following") => void;
  isVisible?: boolean;
}

export function FeedTabs({ activeTab, onTabChange, isVisible = true }: FeedTabsProps) {
  const navigate = useNavigate();

  return (
    <div 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pb-1.5 bg-gradient-to-b from-background/80 to-transparent backdrop-blur-sm transition-transform duration-300",
        !isVisible && "-translate-y-full"
      )}
      style={{ paddingTop: "calc(var(--safe-top) + 0.75rem)" }}
    >
      {/* Spacer for balance */}
      <div className="w-10" />

      {/* Tabs */}
      <div className="flex items-center gap-3 relative">
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

        {/* Active indicator */}
        <div 
          className={cn(
            "absolute -bottom-1.5 h-0.5 w-8 bg-foreground transition-transform duration-200",
            activeTab === "following" ? "-translate-x-[2.75rem]" : "translate-x-[2.25rem]"
          )}
          style={{ left: "50%", marginLeft: "-1rem" }}
        />
      </div>

      {/* Search button */}
      <button
        onClick={() => navigate("/search")}
        className="w-10 h-10 flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors"
        aria-label="Search"
      >
        <Search className="w-5 h-5 drop-shadow-sm" />
      </button>
    </div>
  );
}