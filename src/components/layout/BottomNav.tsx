import { Link, useLocation } from "react-router-dom";
import { Home, Search, Plus, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Search, label: "Discover", path: "/discover" },
    { icon: Plus, label: "Upload", path: "/upload", isUpload: true },
    { icon: MessageCircle, label: "Inbox", path: "/inbox" },
    { icon: User, label: "Profile", path: user ? `/profile/${user.id}` : "/auth" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path === "/" && location.pathname === "/");
          
          if (item.isUpload) {
            return (
              <Link
                key={item.path}
                to={user ? item.path : "/auth"}
                className="flex items-center justify-center"
              >
                <div className="w-11 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-foreground" />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("w-6 h-6", isActive && "text-foreground")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}