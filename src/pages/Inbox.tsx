import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, MessageSquare, Heart, UserPlus } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";

export default function Inbox() {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center pb-20">
        <Bell className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">Activity</h2>
        <p className="text-muted-foreground text-center mb-6 max-w-xs">
          Sign in to see notifications about your account
        </p>
        <button
          onClick={() => navigate("/auth")}
          className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold"
        >
          Sign in
        </button>
        <BottomNav />
      </div>
    );
  }

  const notificationCategories = [
    { icon: Bell, label: "All activity", count: 0 },
    { icon: Heart, label: "Likes", count: 0 },
    { icon: MessageSquare, label: "Comments", count: 0 },
    { icon: UserPlus, label: "New followers", count: 0 },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-bold text-lg">Inbox</h1>
        <div className="w-10" />
      </header>

      {/* Categories */}
      <div className="p-4 space-y-2">
        {notificationCategories.map((category) => (
          <div
            key={category.label}
            className="flex items-center gap-4 p-4 bg-secondary rounded-lg cursor-pointer hover:bg-secondary/80 transition-colors"
          >
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              <category.icon className="w-6 h-6 text-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{category.label}</p>
            </div>
            {category.count > 0 && (
              <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                {category.count}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Bell className="w-12 h-12 mb-4" />
        <p className="font-semibold">No notifications yet</p>
        <p className="text-sm text-center mt-1">
          When someone likes or comments on your videos, you'll see it here
        </p>
      </div>

      <BottomNav />
    </div>
  );
}