import { useState, useRef, useEffect, useCallback } from "react";
import { VideoCard } from "./VideoCard";
import { Video } from "@/types/video";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface VideoFeedProps {
  feedType?: "foryou" | "following";
  onScrollDirectionChange?: (isScrollingUp: boolean) => void;
}

export function VideoFeed({ feedType = "foryou", onScrollDirectionChange }: VideoFeedProps) {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userInteractions, setUserInteractions] = useState<{
    likes: Set<string>;
    bookmarks: Set<string>;
    following: Set<string>;
  }>({ likes: new Set(), bookmarks: new Set(), following: new Set() });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);
  const lastTouchY = useRef(0);
  const fetchVideos = useCallback(async () => {
    setLoading(true);
    
    let userIds: string[] = [];
    
    if (feedType === "following" && user) {
      const { data: followingData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      userIds = followingData?.map((f) => f.following_id) || [];
    }

    let query = supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (feedType === "following" && userIds.length > 0) {
      query = query.in("user_id", userIds);
    }

    const { data, error } = await query;

    if (!error && data) {
      // Fetch profiles separately
      const videoUserIds = [...new Set(data.map(v => v.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", videoUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      // Fetch sounds for videos that have sound_id
      const soundIds = [...new Set(data.filter(v => v.sound_id).map(v => v.sound_id))];
      let soundMap = new Map();
      
      if (soundIds.length > 0) {
        const { data: sounds } = await supabase
          .from("sounds")
          .select("*")
          .in("id", soundIds);
        
        soundMap = new Map(sounds?.map(s => [s.id, s]) || []);
      }
      
      const videosWithData = data.map(video => ({
        ...video,
        profiles: profileMap.get(video.user_id) || null,
        sound: video.sound_id ? soundMap.get(video.sound_id) || null : null,
      }));
      
      setVideos(videosWithData as Video[]);
    }
    
    setLoading(false);
  }, [feedType, user]);

  const fetchUserInteractions = useCallback(async () => {
    if (!user) return;

    const [likesRes, bookmarksRes, followsRes] = await Promise.all([
      supabase.from("likes").select("video_id").eq("user_id", user.id),
      supabase.from("bookmarks").select("video_id").eq("user_id", user.id),
      supabase.from("follows").select("following_id").eq("follower_id", user.id),
    ]);

    setUserInteractions({
      likes: new Set(likesRes.data?.map((l) => l.video_id) || []),
      bookmarks: new Set(bookmarksRes.data?.map((b) => b.video_id) || []),
      following: new Set(followsRes.data?.map((f) => f.following_id) || []),
    });
  }, [user]);

  useEffect(() => {
    fetchVideos();
    fetchUserInteractions();
  }, [fetchVideos, fetchUserInteractions]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / itemHeight);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
      setCurrentIndex(newIndex);
    }

    // Detect scroll direction
    if (onScrollDirectionChange) {
      const isScrollingUp = scrollTop < lastScrollTop.current;
      onScrollDirectionChange(isScrollingUp);
    }
    lastScrollTop.current = scrollTop;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    lastTouchY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!onScrollDirectionChange) return;
    
    const currentY = e.touches[0].clientY;
    const diff = lastTouchY.current - currentY;
    
    // Threshold to avoid micro-movements
    if (Math.abs(diff) > 20) {
      // Swiping up (scrolling down content) = hide bars
      // Swiping down (scrolling up content) = show bars
      onScrollDirectionChange(diff < 0);
      lastTouchY.current = currentY;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background text-foreground">
        <p className="text-lg font-semibold">No videos yet</p>
        <p className="text-muted-foreground text-sm mt-1">
          {feedType === "following" 
            ? "Follow some creators to see their videos here" 
            : "Be the first to upload a video!"
          }
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
    >
      {videos.map((video, index) => (
        <div key={video.id} className="h-full w-full">
          <VideoCard
            video={video}
            isActive={index === currentIndex}
            isLiked={userInteractions.likes.has(video.id)}
            isBookmarked={userInteractions.bookmarks.has(video.id)}
            isFollowing={userInteractions.following.has(video.user_id)}
          />
        </div>
      ))}
    </div>
  );
}