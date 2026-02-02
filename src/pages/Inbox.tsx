import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Bell, MessageSquare, Heart, UserPlus, AtSign, Check, Layers, Mail } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BottomNav } from "@/components/layout/BottomNav";
import { SwipeAction } from "@/components/ui/swipe-action";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { Notification } from "@/types/video";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

function getNotificationMessage(notification: Notification): string {
  const actorName = notification.actor?.display_name || notification.actor?.username || "Someone";
  
  switch (notification.type) {
    case "mention":
      return `${actorName} mentioned you in a comment`;
    case "comment_like":
      return `${actorName} liked your comment`;
    case "reply":
      return `${actorName} replied to your comment`;
    case "like":
      return `${actorName} liked your video`;
    case "follow":
      return `${actorName} started following you`;
    case "new_series_part":
      const seriesTitle = notification.video?.series?.title || "a series";
      return `${actorName} added a new part to ${seriesTitle}`;
    default:
      return `${actorName} interacted with you`;
  }
}

function getNotificationIcon(type: Notification["type"]) {
  switch (type) {
    case "mention":
      return AtSign;
    case "comment_like":
    case "like":
      return Heart;
    case "reply":
      return MessageSquare;
    case "follow":
      return UserPlus;
    case "new_series_part":
      return Layers;
    default:
      return Bell;
  }
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: () => void;
}) {
  const navigate = useNavigate();
  const Icon = getNotificationIcon(notification.type);

  const handleClick = () => {
    if (!notification.is_read) {
      onRead();
    }

    // Navigate based on notification type
    if (notification.type === "follow" && notification.actor?.user_id) {
      navigate(`/profile/${notification.actor.user_id}`);
    } else if (notification.video_id) {
      navigate(`/?video=${notification.video_id}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-start gap-3 w-full p-4 text-left transition-colors hover:bg-secondary/50",
        !notification.is_read && "bg-secondary/30"
      )}
    >
      <Avatar className="w-10 h-10 shrink-0">
        <AvatarImage src={notification.actor?.avatar_url || undefined} />
        <AvatarFallback className="bg-muted text-foreground">
          {(notification.actor?.display_name || notification.actor?.username || "U")[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className={cn("text-sm", !notification.is_read && "font-semibold")}>
          {getNotificationMessage(notification)}
        </p>
        {notification.comment?.content && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            "{notification.comment.content}"
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {notification.video?.thumbnail_url && (
          <img
            src={notification.video.thumbnail_url}
            alt=""
            className="w-10 h-14 object-cover rounded"
          />
        )}
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            notification.type === "like" || notification.type === "comment_like"
              ? "bg-primary/20 text-primary"
              : notification.type === "follow"
              ? "bg-accent/20 text-accent"
              : notification.type === "new_series_part"
              ? "bg-blue-500/20 text-blue-500"
              : "bg-muted text-foreground"
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </button>
  );
}

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="w-8 h-8 rounded-full" />
    </div>
  );
}

export default function Inbox() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();

  if (!user) {
    return (
      <div className="min-h-[var(--app-height)] bg-background text-foreground flex flex-col items-center justify-center pb-safe-nav">
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

  const filterNotifications = (type: string) => {
    if (type === "all") return notifications;
    if (type === "likes") return notifications.filter((n) => n.type === "like" || n.type === "comment_like");
    if (type === "comments") return notifications.filter((n) => n.type === "reply" || n.type === "mention");
    if (type === "followers") return notifications.filter((n) => n.type === "follow");
    return notifications;
  };

  const filteredNotifications = filterNotifications(activeTab);

  return (
    <div className="min-h-[var(--app-height)] bg-background text-foreground pb-safe-nav">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-bold text-lg">Inbox</h1>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-primary hover:text-primary/80"
            >
              <Check className="w-4 h-4 mr-1" />
              Read all
            </Button>
          )}
          <Link to="/messages" className="p-2">
            <Mail className="w-6 h-6" />
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full bg-transparent border-b border-border rounded-none h-12 px-4">
          <TabsTrigger
            value="all"
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            All
          </TabsTrigger>
          <TabsTrigger
            value="likes"
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            Likes
          </TabsTrigger>
          <TabsTrigger
            value="comments"
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            Comments
          </TabsTrigger>
          <TabsTrigger
            value="followers"
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            Followers
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {loading ? (
            <div className="divide-y divide-border">
              {[...Array(5)].map((_, i) => (
                <NotificationSkeleton key={i} />
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="w-12 h-12 mb-4" />
              <p className="font-semibold">No notifications yet</p>
              <p className="text-sm text-center mt-1">
                When someone interacts with your content, you'll see it here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredNotifications.map((notification) => (
                <SwipeAction
                  key={notification.id}
                  onSwipeLeft={() => {
                    if (!notification.is_read) markAsRead(notification.id);
                  }}
                  onSwipeRight={async () => {
                    const success = await deleteNotification(notification.id);
                    if (success) {
                      toast({ title: "Notification deleted" });
                    }
                  }}
                  leftAction={{ label: "Read", color: "bg-green-500" }}
                  rightAction={{ label: "Delete", color: "bg-destructive" }}
                >
                  <NotificationItem
                    notification={notification}
                    onRead={() => markAsRead(notification.id)}
                  />
                </SwipeAction>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <BottomNav />
    </div>
  );
}
