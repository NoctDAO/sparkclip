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
    <div className="flex flex-col gap-3 max-w-[80%]">
      {/* User info */}
      <div className="flex items-center gap-3">
        <Link to={`/profile/${userId}`}>
          <Avatar className="w-10 h-10 border-2 border-foreground">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-secondary text-foreground">
              {(displayName || username || "U")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        
        <Link to={`/profile/${userId}`} className="font-bold text-foreground hover:underline">
          @{username || "user"}
        </Link>
        
        {user && user.id !== userId && (
          <Button
            onClick={handleFollow}
            disabled={loading}
            variant={following ? "secondary" : "default"}
            size="sm"
            className="h-7 px-4 text-xs font-semibold"
          >
            {following ? "Following" : "Follow"}
          </Button>
        )}
      </div>

      {/* Caption */}
      {caption && (
        <p className="text-sm text-foreground leading-relaxed">
          {caption}
        </p>
      )}

      {/* Hashtags */}
      {hashtags && hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {hashtags.map((tag, index) => (
            <Link
              key={index}
              to={`/tag/${tag.replace("#", "")}`}
              className="text-sm font-semibold text-foreground hover:underline"
            >
              #{tag.replace("#", "")}
            </Link>
          ))}
        </div>
      )}

      {/* Sound info */}
      {sound ? (
        <Link 
          to={`/sounds/${sound.id}`}
          className="flex items-center gap-2 mt-1 group"
        >
          <div className="w-4 h-4 flex items-center justify-center animate-spin" style={{ animationDuration: "3s" }}>
            <Music className="w-4 h-4 text-foreground" />
          </div>
          <span className="text-sm text-foreground truncate max-w-[200px] group-hover:underline">
            {sound.title} - {sound.artist || "Unknown"}
          </span>
        </Link>
      ) : (
        <div className="flex items-center gap-2 mt-1">
          <Music className="w-4 h-4 text-foreground" />
          <span className="text-sm text-foreground truncate max-w-[200px]">
            Original sound - {displayName || username || "user"}
          </span>
        </div>
      )}
    </div>
  );
}
