import { Link } from "react-router-dom";
import { Music } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Sound } from "@/types/video";

interface VideoInfoProps {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  caption: string | null;
  hashtags: string[] | null;
  isFollowing?: boolean;
  sound?: Sound | null;
}

export function VideoInfo({
  userId,
  username,
  displayName,
  avatarUrl,
  caption,
  hashtags,
  isFollowing = false,
  sound,
}: VideoInfoProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [following, setFollowing] = useState(isFollowing);
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    if (!user) {
      toast({ title: "Please sign in to follow users", variant: "destructive" });
      return;
    }

    if (user.id === userId) return;

    setLoading(true);
    
    if (following) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", userId);

      if (!error) {
        setFollowing(false);
      }
    } else {
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: userId });

      if (!error) {
        setFollowing(true);
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-2 max-w-[85%]">
      {/* User info */}
      <div className="flex items-center gap-2">
        <Link to={`/profile/${userId}`}>
          <Avatar className="w-9 h-9 border border-foreground/50">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-secondary text-foreground text-sm">
              {(displayName || username || "U")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        
        <Link to={`/profile/${userId}`} className="font-semibold text-sm text-foreground hover:underline drop-shadow-sm">
          @{username || "user"}
        </Link>
        
        {user && user.id !== userId && (
          <Button
            onClick={handleFollow}
            disabled={loading}
            variant={following ? "secondary" : "default"}
            size="sm"
            className="h-6 px-3 text-[11px] font-semibold"
          >
            {following ? "Following" : "Follow"}
          </Button>
        )}
      </div>

      {/* Caption & Hashtags inline */}
      {(caption || (hashtags && hashtags.length > 0)) && (
        <p className="text-[13px] text-foreground leading-snug drop-shadow-sm">
          {caption && <span>{caption} </span>}
          {hashtags && hashtags.map((tag, index) => (
            <Link
              key={index}
              to={`/tag/${tag.replace("#", "")}`}
              className="font-semibold text-foreground hover:underline"
            >
              #{tag.replace("#", "")}{" "}
            </Link>
          ))}
        </p>
      )}

      {/* Sound info - ensure it doesn't overflow */}
      {sound ? (
        <Link 
          to={`/sounds/${sound.id}`}
          className="flex items-center gap-1.5 group overflow-hidden"
        >
          <div className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center animate-spin" style={{ animationDuration: "3s" }}>
            <Music className="w-3.5 h-3.5 text-foreground/80" />
          </div>
          <span className="text-xs text-foreground/80 truncate group-hover:underline">
            {sound.title} - {sound.artist || "Unknown"}
          </span>
        </Link>
      ) : (
        <div className="flex items-center gap-1.5 overflow-hidden">
          <Music className="w-3.5 h-3.5 flex-shrink-0 text-foreground/80" />
          <span className="text-xs text-foreground/80 truncate">
            Original sound - {displayName || username || "user"}
          </span>
        </div>
      )}
    </div>
  );
}
