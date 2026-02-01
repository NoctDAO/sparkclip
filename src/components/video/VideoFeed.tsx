import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { VideoCard } from "./VideoCard";
import { AdCard } from "./AdCard";
import { AdSenseUnit } from "@/components/ads/AdSenseUnit";
import { Video } from "@/types/video";
import { FeedItem, Ad, AdSettings } from "@/types/ad";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { Loader2 } from "lucide-react";

interface VideoFeedProps {
  feedType?: "foryou" | "following";
  initialVideoId?: string;
  onScrollDirectionChange?: (isScrollingUp: boolean) => void;
  bottomNavVisible?: boolean;
}

export function VideoFeed({
  feedType = "foryou",
  initialVideoId,
  onScrollDirectionChange,
  bottomNavVisible = true,
}: VideoFeedProps) {
  const { user } = useAuth();
  const { blockedUsers } = useBlockedUsers();
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userInteractions, setUserInteractions] = useState<{
    likes: Set<string>;
    bookmarks: Set<string>;
    following: Set<string>;
  }>({ likes: new Set(), bookmarks: new Set(), following: new Set() });
  const [ads, setAds] = useState<Ad[]>([]);
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);
  const shownAdIds = useRef<Set<string>>(new Set());
  
  const blockedUserIds = blockedUsers.map(b => b.blocked_user_id);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);
  const lastTouchY = useRef(0);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    
    // If we have an initialVideoId, fetch it first
    let initialVideo: Video | null = null;
    if (initialVideoId) {
      const { data: initialData } = await supabase
        .from("videos")
        .select("*")
        .eq("id", initialVideoId)
        .single();
      
      if (initialData) {
        // Fetch profile for initial video
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .eq("user_id", initialData.user_id)
          .single();
        
        // Fetch sound if exists
        let sound = null;
        if (initialData.sound_id) {
          const { data: soundData } = await supabase
            .from("sounds")
            .select("*")
            .eq("id", initialData.sound_id)
            .single();
          sound = soundData;
        }
        
        // Fetch series if exists
        let series = null;
        if (initialData.series_id) {
          const { data: seriesData } = await supabase
            .from("video_series")
            .select("*")
            .eq("id", initialData.series_id)
            .single();
          series = seriesData;
        }
        
        initialVideo = {
          ...initialData,
          profiles: profile || null,
          sound,
          series,
        } as Video;
      }
    }

    try {
      // Use the optimized database function for feed videos
      const { data, error } = await supabase.rpc("get_feed_videos", {
        p_user_id: user?.id || null,
        p_feed_type: feedType,
        p_limit: 20,
        p_offset: 0,
        p_blocked_user_ids: blockedUserIds,
      });

      if (error) throw error;

      // Transform the flat result into Video objects with user interactions
      let videosWithData: Video[] = (data || []).map((v: any) => ({
        id: v.id,
        user_id: v.user_id,
        video_url: v.video_url,
        thumbnail_url: v.thumbnail_url,
        caption: v.caption,
        hashtags: v.hashtags,
        likes_count: v.likes_count,
        comments_count: v.comments_count,
        shares_count: v.shares_count,
        views_count: v.views_count,
        sound_id: v.sound_id,
        series_id: v.series_id,
        series_order: v.series_order,
        duet_source_id: v.duet_source_id,
        duet_layout: v.duet_layout,
        allow_duets: v.allow_duets,
        created_at: v.created_at,
        profiles: v.profile_username ? {
          username: v.profile_username,
          display_name: v.profile_display_name,
          avatar_url: v.profile_avatar_url,
        } : null,
        sound: v.sound_title ? {
          id: v.sound_id,
          title: v.sound_title,
          artist: v.sound_artist,
          audio_url: v.sound_audio_url,
          cover_url: v.sound_cover_url,
          duration_seconds: null,
          uses_count: 0,
          is_original: false,
          original_video_id: null,
          created_by: null,
          created_at: v.created_at,
        } : null,
        series: v.series_title ? {
          id: v.series_id,
          user_id: v.user_id,
          title: v.series_title,
          description: v.series_description,
          cover_video_id: null,
          cover_image_url: null,
          videos_count: v.series_videos_count,
          total_views: 0,
          created_at: v.created_at,
          updated_at: v.created_at,
        } : null,
      }));

      // Update user interactions from the response
      if (user) {
        const likes = new Set<string>();
        const bookmarks = new Set<string>();
        const following = new Set<string>();
        
        data?.forEach((v: any) => {
          if (v.is_liked) likes.add(v.id);
          if (v.is_bookmarked) bookmarks.add(v.id);
          if (v.is_following) following.add(v.user_id);
        });
        
        setUserInteractions({ likes, bookmarks, following });
      }
      
      // If we have an initial video, put it first and remove any duplicate
      if (initialVideo) {
        videosWithData = videosWithData.filter(v => v.id !== initialVideo!.id);
        videosWithData = [initialVideo, ...videosWithData];
      }
      
      setVideos(videosWithData);
    } catch (error) {
      console.error("Error fetching videos with optimized query, falling back:", error);
      // Fallback to old query pattern if the function fails
      await fetchVideosFallback(initialVideo);
    }
    
    setLoading(false);
  }, [feedType, user, blockedUserIds.length, initialVideoId]);

  // Fallback function using the old query pattern
  const fetchVideosFallback = async (initialVideo: Video | null) => {
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
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(20);

    if (feedType === "following" && userIds.length > 0) {
      query = query.in("user_id", userIds);
    }

    const { data, error } = await query;

    if (!error && data) {
      const videoUserIds = [...new Set(data.map(v => v.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", videoUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const soundIds = [...new Set(data.filter(v => v.sound_id).map(v => v.sound_id))];
      let soundMap = new Map();
      
      if (soundIds.length > 0) {
        const { data: sounds } = await supabase
          .from("sounds")
          .select("*")
          .in("id", soundIds);
        
        soundMap = new Map(sounds?.map(s => [s.id, s]) || []);
      }
      
      const seriesIds = [...new Set(data.filter(v => v.series_id).map(v => v.series_id))];
      let seriesMap = new Map();
      
      if (seriesIds.length > 0) {
        const { data: seriesData } = await supabase
          .from("video_series")
          .select("*")
          .in("id", seriesIds);
        
        seriesMap = new Map(seriesData?.map(s => [s.id, s]) || []);
      }
      
      let videosWithData = data
        .filter(video => !blockedUserIds.includes(video.user_id))
        .map(video => ({
          ...video,
          profiles: profileMap.get(video.user_id) || null,
          sound: video.sound_id ? soundMap.get(video.sound_id) || null : null,
          series: video.series_id ? seriesMap.get(video.series_id) || null : null,
        })) as Video[];
      
      if (initialVideo) {
        videosWithData = videosWithData.filter(v => v.id !== initialVideo.id);
        videosWithData = [initialVideo, ...videosWithData];
      }
      
      setVideos(videosWithData);
    }
  };

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

  // Fetch ads and settings
  const fetchAds = useCallback(async () => {
    const [adsRes, settingsRes] = await Promise.all([
      supabase
        .from("ads")
        .select("*")
        .eq("status", "active")
        .order("priority", { ascending: false }),
      supabase
        .from("ad_settings")
        .select("*")
        .limit(1)
        .single(),
    ]);

    if (adsRes.data) {
      // Filter by date range
      const now = new Date();
      const activeAds = (adsRes.data as Ad[]).filter((ad) => {
        if (ad.start_date && new Date(ad.start_date) > now) return false;
        if (ad.end_date && new Date(ad.end_date) < now) return false;
        return true;
      });
      setAds(activeAds);
    }
    if (settingsRes.data) {
      setAdSettings(settingsRes.data as AdSettings);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
    fetchAds();
    // Only fetch user interactions separately if not using optimized query
    // The optimized query returns interaction flags directly
    if (!user) {
      fetchUserInteractions();
    }
  }, [fetchVideos, fetchAds]);

  // Handle in-feed series navigation
  const handleSeriesNavigation = useCallback((newVideo: Video) => {
    const container = containerRef.current;
    if (!container) return;

    const existingIndex = videos.findIndex(v => v.id === newVideo.id);
    
    if (existingIndex !== -1) {
      const targetScrollTop = existingIndex * container.clientHeight;
      container.scrollTo({ top: targetScrollTop, behavior: "smooth" });
      setCurrentIndex(existingIndex);
    } else {
      const insertIndex = currentIndex + 1;
      const newVideos = [...videos];
      newVideos.splice(insertIndex, 0, newVideo);
      setVideos(newVideos);
      
      requestAnimationFrame(() => {
        const targetScrollTop = insertIndex * container.clientHeight;
        container.scrollTo({ top: targetScrollTop, behavior: "smooth" });
        setCurrentIndex(insertIndex);
      });
    }
  }, [videos, currentIndex]);

  // Build feed items with ads injected at intervals
  const feedItems = useMemo((): FeedItem[] => {
    const items: FeedItem[] = [];
    const frequency = adSettings?.ad_frequency || 5;
    const customAdsEnabled = adSettings?.custom_ads_enabled ?? true;
    const adsenseEnabled = adSettings?.adsense_enabled ?? false;
    
    let adIndex = 0;

    videos.forEach((video, index) => {
      items.push({ type: "video", data: video });

      // Insert ad after every N videos (but not after the last one)
      const position = index + 1;
      if (position % frequency === 0 && index < videos.length - 1) {
        if (customAdsEnabled && ads.length > 0) {
          // Rotate through available ads
          const ad = ads[adIndex % ads.length];
          if (!shownAdIds.current.has(ad.id)) {
            shownAdIds.current.add(ad.id);
          }
          items.push({ type: "ad", data: ad });
          adIndex++;
        } else if (adsenseEnabled && adSettings?.adsense_slot_id) {
          items.push({ type: "adsense", slotId: adSettings.adsense_slot_id });
        }
      }
    });

    return items;
  }, [videos, ads, adSettings]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / itemHeight);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < feedItems.length) {
      setCurrentIndex(newIndex);
    }

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
    
    if (Math.abs(diff) > 20) {
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
      {feedItems.map((item, index) => {
        if (item.type === "video") {
          const video = item.data as Video;
          return (
            <div key={`video-${video.id}`} className="h-full w-full snap-start snap-always">
              <VideoCard
                video={video}
                isActive={index === currentIndex}
                isLiked={userInteractions.likes.has(video.id)}
                isBookmarked={userInteractions.bookmarks.has(video.id)}
                isFollowing={userInteractions.following.has(video.user_id)}
                bottomNavVisible={bottomNavVisible}
                onSeriesNavigate={handleSeriesNavigation}
              />
            </div>
          );
        } else if (item.type === "ad") {
          const ad = item.data as Ad;
          return (
            <div key={`ad-${ad.id}-${index}`} className="h-full w-full snap-start snap-always">
              <AdCard
                ad={ad}
                isActive={index === currentIndex}
                bottomNavVisible={bottomNavVisible}
              />
            </div>
          );
        } else if (item.type === "adsense") {
          return (
            <div key={`adsense-${index}`} className="h-full w-full snap-start snap-always">
              <AdSenseUnit
                clientId={adSettings?.adsense_client_id || ""}
                slotId={item.slotId}
                isActive={index === currentIndex}
                bottomNavVisible={bottomNavVisible}
              />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
