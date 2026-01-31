import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Heart, Link2, Check } from "lucide-react";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { VideoActions } from "@/components/video/VideoActions";
import { VideoInfo } from "@/components/video/VideoInfo";
import { CommentsSheet } from "@/components/video/CommentsSheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Video, Profile, Sound } from "@/types/video";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function VideoPage() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [video, setVideo] = useState<Video | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sound, setSound] = useState<Sound | null>(null);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [heartPosition, setHeartPosition] = useState({ x: 0, y: 0 });

  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    if (videoId) {
      fetchVideo();
    }
  }, [videoId]);

  useEffect(() => {
    if (video && user) {
      checkUserInteractions();
    }
  }, [video, user]);

  const fetchVideo = async () => {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("id", videoId)
      .maybeSingle();

    if (error || !data) {
      setLoading(false);
      return;
    }

    setVideo(data as Video);
    setLikesCount(data.likes_count || 0);

    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", data.user_id)
      .maybeSingle();

    if (profileData) {
      setProfile(profileData as Profile);
    }

    // Fetch sound if exists
    if (data.sound_id) {
      const { data: soundData } = await supabase
        .from("sounds")
        .select("*")
        .eq("id", data.sound_id)
        .maybeSingle();

      if (soundData) {
        setSound(soundData as Sound);
      }
    }

    setLoading(false);
  };

  const checkUserInteractions = async () => {
    if (!user || !video) return;

    const [likeRes, bookmarkRes, followRes] = await Promise.all([
      supabase
        .from("likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("video_id", video.id)
        .maybeSingle(),
      supabase
        .from("bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("video_id", video.id)
        .maybeSingle(),
      supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", video.user_id)
        .maybeSingle(),
    ]);

    setLiked(!!likeRes.data);
    setIsBookmarked(!!bookmarkRes.data);
    setIsFollowing(!!followRes.data);
  };

  const handleCopyLink = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Link copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDoubleTap = useCallback(async (e: React.MouseEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setHeartPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });

      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 1000);

      if (!liked && user && video) {
        const { error } = await supabase
          .from("likes")
          .insert({ user_id: user.id, video_id: video.id });

        if (!error) {
          setLiked(true);
          setLikesCount((prev) => prev + 1);
        }
      }
    }

    lastTapRef.current = now;
  }, [liked, user, video]);

  const handleLikeChange = useCallback((newLiked: boolean, newCount: number) => {
    setLiked(newLiked);
    setLikesCount(newCount);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground">
        <p className="text-lg font-semibold">Video not found</p>
        <Button onClick={() => navigate("/")} variant="link" className="mt-4">
          Go back home
        </Button>
      </div>
    );
  }

  // SEO metadata
  const pageTitle = profile?.username 
    ? `${profile.display_name || profile.username} on Clips${video.caption ? `: "${video.caption.slice(0, 50)}${video.caption.length > 50 ? '...' : ''}"` : ''}`
    : "Watch this video on Clips";
  
  const pageDescription = video.caption 
    ? `${video.caption.slice(0, 150)}${video.caption.length > 150 ? '...' : ''}`
    : `Watch this video by @${profile?.username || 'creator'} on Clips`;
  
  const pageUrl = `${window.location.origin}/video/${video.id}`;
  const thumbnailUrl = video.thumbnail_url || video.video_url;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="video.other" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={thumbnailUrl} />
        <meta property="og:video" content={video.video_url} />
        <meta property="og:video:type" content="video/mp4" />
        <meta property="og:site_name" content="Clips" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="player" />
        <meta name="twitter:url" content={pageUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={thumbnailUrl} />
        <meta name="twitter:player" content={video.video_url} />
        
        {/* Additional SEO */}
        <link rel="canonical" href={pageUrl} />
      </Helmet>

      <div className="fixed inset-0 bg-black">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <button
          onClick={handleCopyLink}
          className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
        >
          {copied ? (
            <Check className="w-6 h-6 text-green-400" />
          ) : (
            <Link2 className="w-6 h-6 text-white" />
          )}
        </button>
      </header>

      {/* Video Player with double-tap detection */}
      <div 
        className="absolute inset-0"
        onClick={handleDoubleTap}
      >
        <VideoPlayer src={video.video_url} isActive={true} />
      </div>

      {/* Double-tap heart animation */}
      {showHeartAnimation && (
        <div
          className="absolute pointer-events-none z-50"
          style={{
            left: heartPosition.x,
            top: heartPosition.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <Heart
            className={cn(
              "w-24 h-24 text-heart fill-heart",
              "animate-double-tap-heart"
            )}
          />
        </div>
      )}

      {/* Video Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/60" />

      {/* Actions (right side) */}
      <div className="absolute right-3 bottom-24 pointer-events-auto z-10">
        <VideoActions
          videoId={video.id}
          initialLikes={likesCount}
          initialComments={video.comments_count}
          initialShares={video.shares_count}
          isLiked={liked}
          isBookmarked={isBookmarked}
          onCommentClick={() => setShowComments(true)}
          onLikeChange={handleLikeChange}
        />
      </div>

      {/* Info (bottom) */}
      <div className="absolute left-3 bottom-24 right-20 pointer-events-auto z-10">
        <VideoInfo
          userId={video.user_id}
          username={profile?.username || null}
          displayName={profile?.display_name || null}
          avatarUrl={profile?.avatar_url || null}
          caption={video.caption}
          hashtags={video.hashtags}
          isFollowing={isFollowing}
          sound={sound || undefined}
        />
      </div>

      {/* Comments Sheet */}
      <CommentsSheet
        videoId={video.id}
        open={showComments}
        onOpenChange={setShowComments}
      />
      </div>
    </>
  );
}
