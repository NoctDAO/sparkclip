import { Link, useLocation } from "react-router-dom";
import { Home, Search, Plus, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

interface BottomNavProps {
  isVisible?: boolean;
}

export function BottomNav({ isVisible = true }: BottomNavProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Search, label: "Search", path: "/search" },
    { icon: MessageCircle, label: "Inbox", path: "/inbox", badge: unreadCount },
    { icon: User, label: "Profile", path: user ? `/profile/${user.id}` : "/auth" },
  ];

  // Split nav items for left and right of FAB
  const leftItems = navItems.slice(0, 2);
  const rightItems = navItems.slice(2);

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-t border-white/10 transition-transform duration-300",
        !isVisible && "translate-y-full"
      )}
      style={{ paddingBottom: "var(--safe-bottom)", paddingLeft: "var(--safe-left)", paddingRight: "var(--safe-right)" }}
    >
      {/* Floating FAB */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10">
        <Link
          to={user ? "/upload" : "/auth"}
          className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-transform"
          aria-label="Upload"
        >
          <Plus className="w-6 h-6 text-white" />
        </Link>
      </div>

      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {/* Left nav items */}
        {leftItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path === "/" && location.pathname === "/");
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center px-4 py-2 transition-all min-w-[56px]",
                isActive ? "gap-0.5" : ""
              )}
              aria-label={item.label}
            >
              <div className="relative">
                <item.icon 
                  className={cn(
                    "w-6 h-6 transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )} 
                />
              </div>
              {isActive && (
                <span className="text-[10px] font-medium text-foreground animate-fade-in">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}

        {/* Spacer for FAB */}
        <div className="w-16" />

        {/* Right nav items */}
        {rightItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center px-4 py-2 transition-all min-w-[56px]",
                isActive ? "gap-0.5" : ""
              )}
              aria-label={item.label}
            >
              <div className="relative">
                <item.icon 
                  className={cn(
                    "w-6 h-6 transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )} 
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              {isActive && (
                <span className="text-[10px] font-medium text-foreground animate-fade-in">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
