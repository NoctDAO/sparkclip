import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Play, Pause, Heart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/layout/BottomNav";
import { Sound, Video } from "@/types/video";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function SoundDetail() {
  const { soundId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);

  const [sound, setSound] = useState<Sound | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (soundId) {
      fetchSound();
      fetchVideos();
      if (user) checkFavorite();
    }
  }, [soundId, user]);

  const fetchSound = async () => {
    const { data, error } = await supabase
      .from("sounds")
      .select("*")
      .eq("id", soundId)
      .single();

    if (error) {
      toast({ title: "Sound not found", variant: "destructive" });
      navigate(-1);
      return;
    }

    setSound(data as Sound);
    setLoading(false);
  };

  const fetchVideos = async () => {
    const { data } = await supabase
      .from("videos")
      .select("*")
      .eq("sound_id", soundId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (data) {
      // Fetch profiles separately
      const userIds = [...new Set(data.map(v => v.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
      
      const videosWithProfiles = data.map(v => ({
        ...v,
        profiles: profileMap.get(v.user_id) || null
      }));
      
      setVideos(videosWithProfiles as Video[]);
    }
  };

  const checkFavorite = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("sound_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("sound_id", soundId)
      .maybeSingle();

    setIsFavorite(!!data);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast({ title: "Please sign in to save sounds", variant: "destructive" });
      return;
    }

    if (isFavorite) {
      await supabase
        .from("sound_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("sound_id", soundId);
      setIsFavorite(false);
    } else {
      await supabase
        .from("sound_favorites")
        .insert({ user_id: user.id, sound_id: soundId });
      setIsFavorite(true);
    }
  };

  const handleUseSound = () => {
    navigate(`/upload?soundId=${soundId}`);
  };

  const formatUses = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!sound) return null;

  // SEO metadata
  const artistName = sound.artist || "Unknown artist";
  const pageTitle = `${sound.title} by ${artistName} | Sound`;
  const pageDescription = `Listen to "${sound.title}" by ${artistName}. Used in ${sound.uses_count} videos. Discover trending sounds and create your own videos.`;
  const pageUrl = `${window.location.origin}/sounds/${sound.id}`;
  const coverUrl = sound.cover_url || `${window.location.origin}/placeholder.svg`;

  // Format duration for ISO 8601 (PT#M#S format)
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return undefined;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `PT${mins}M${secs}S`;
  };

  // JSON-LD structured data for MusicRecording
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    "name": sound.title,
    "url": pageUrl,
    "image": coverUrl,
    "datePublished": sound.created_at,
    ...(sound.duration_seconds && {
      "duration": formatDuration(sound.duration_seconds)
    }),
    ...(sound.artist && {
      "byArtist": {
        "@type": "MusicGroup",
        "name": sound.artist
      }
    }),
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": "https://schema.org/UseAction",
      "userInteractionCount": sound.uses_count
    },
    ...(sound.audio_url && {
      "audio": {
        "@type": "AudioObject",
        "contentUrl": sound.audio_url,
        "encodingFormat": "audio/mpeg"
      }
    })
  };

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        
        {/* Open Graph */}
        <meta property="og:type" content="music.song" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={coverUrl} />
        <meta property="og:audio" content={sound.audio_url} />
        <meta property="music:musician" content={artistName} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={coverUrl} />
        
        {/* Canonical URL */}
        <link rel="canonical" href={pageUrl} />
        
        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>

    <div className="min-h-screen bg-background pb-safe-nav">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
      </header>

      {/* Sound Info */}
      <div className="p-4 space-y-4">
        <div className="flex gap-4">
          {/* Cover */}
          <div className="relative w-24 h-24 flex-shrink-0">
            <div className="w-full h-full bg-muted rounded-xl overflow-hidden">
              {sound.cover_url ? (
                <img 
                  src={sound.cover_url} 
                  alt={sound.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                  <span className="text-3xl">♪</span>
                </div>
              )}
            </div>
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white fill-white" />
              ) : (
                <Play className="w-8 h-8 text-white fill-white" />
              )}
            </button>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{sound.title}</h1>
            <p className="text-muted-foreground">{sound.artist || "Unknown artist"}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {formatUses(sound.uses_count)} videos
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={handleUseSound} className="flex-1 gap-2">
            <Plus className="w-4 h-4" />
            Use this sound
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFavorite}
            className={isFavorite ? "text-red-500 border-red-500" : ""}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? "fill-red-500" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Videos using this sound */}
      <div className="p-4">
        <h2 className="font-semibold mb-4">Videos using this sound</h2>
        
        {videos.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No videos yet. Be the first to use this sound!
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {videos.map((video) => (
              <Link
                key={video.id}
                to={`/?videoId=${video.id}`}
                className="aspect-[9/16] bg-muted rounded-md overflow-hidden relative group"
              >
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.caption || "Video"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={video.video_url}
                    className="w-full h-full object-cover"
                    muted
                    preload="metadata"
                  />
                )}
                <div className="absolute bottom-1 left-1 text-xs text-white font-medium drop-shadow-lg">
                  {formatUses(video.views_count)} views
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <audio
        ref={audioRef}
        src={sound.audio_url}
        onEnded={() => setIsPlaying(false)}
      />

      <BottomNav />
    </div>
    </>
  );
}
