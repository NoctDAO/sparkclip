import { Link, useLocation } from "react-router-dom";
import { Home, Compass, Plus, MessageCircle, User } from "lucide-react";
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
    { icon: Compass, label: "Discover", path: "/discover" },
    { icon: Plus, label: "Upload", path: "/upload", isUpload: true },
    { icon: MessageCircle, label: "Inbox", path: "/inbox", badge: unreadCount },
    { icon: User, label: "Profile", path: user ? `/profile/${user.id}` : "/auth" },
  ];

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 glass-premium border-t border-border/40 transition-all duration-300 ease-out",
        !isVisible && "translate-y-full"
      )}
      style={{ paddingBottom: "var(--safe-bottom)", paddingLeft: "var(--safe-left)", paddingRight: "var(--safe-right)" }}
    >
      {/* Top glow line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path === "/" && location.pathname === "/");
          
          if (item.isUpload) {
            return (
              <Link
                key={item.path}
                to={user ? item.path : "/auth"}
                className="flex items-center justify-center active:scale-90 transition-transform duration-150"
              >
                <div className="relative w-10 h-7 bg-gradient-primary rounded-md flex items-center justify-center shadow-lg glow-primary-sm hover:glow-primary transition-shadow duration-200">
                  <Plus className="w-4 h-4 text-foreground" />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 transition-all duration-200 relative spring-bounce",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
              )}
            >
              <div className="relative">
                <item.icon className={cn(
                  "w-5 h-5 transition-all duration-200",
                  isActive && "text-foreground drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                )} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 animate-pulse-soft shadow-md glow-primary-sm">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[9px] font-medium transition-all duration-200",
                isActive && "font-semibold"
              )}>{item.label}</span>
              {/* Active indicator with glow */}
              {isActive && (
                <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}