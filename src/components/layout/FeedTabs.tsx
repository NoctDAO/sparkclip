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
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pb-1.5 glass-premium border-b border-border/20 transition-transform duration-300",
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
            "text-sm font-semibold transition-all duration-200 tracking-wide",
            activeTab === "following" 
              ? "text-foreground drop-shadow-[0_0_10px_hsl(var(--foreground)/0.3)]" 
              : "text-foreground/50 hover:text-foreground/70"
          )}
        >
          Following
        </button>
        
        <div className="w-px h-3.5 bg-foreground/20" />
        
        <button
          onClick={() => onTabChange("foryou")}
          className={cn(
            "text-sm font-semibold transition-all duration-200 tracking-wide",
            activeTab === "foryou" 
              ? "text-foreground drop-shadow-[0_0_10px_hsl(var(--foreground)/0.3)]" 
              : "text-foreground/50 hover:text-foreground/70"
          )}
        >
          For You
        </button>

        {/* Active indicator with glow */}
        <div 
          className={cn(
            "absolute -bottom-1.5 h-0.5 w-8 bg-foreground rounded-full transition-transform duration-200 shadow-[0_0_8px_hsl(var(--foreground)/0.4)]",
            activeTab === "following" ? "-translate-x-[2.75rem]" : "translate-x-[2.25rem]"
          )}
          style={{ left: "50%", marginLeft: "-1rem" }}
        />
      </div>

      {/* Search button */}
      <button
        onClick={() => navigate("/search")}
        className="w-10 h-10 flex items-center justify-center text-foreground/70 hover:text-foreground transition-colors duration-200"
        aria-label="Search"
      >
        <Search className="w-5 h-5 drop-shadow-sm" />
      </button>
    </div>
  );
}