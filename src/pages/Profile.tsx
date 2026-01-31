import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Settings, Grid3X3, Bookmark, Heart, ArrowLeft, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Profile as ProfileType, Video } from "@/types/video";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [likedVideos, setLikedVideos] = useState<Video[]>([]);
  const [savedVideos, setSavedVideos] = useState<Video[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchUserVideos();
      if (user) {
        checkFollowing();
        if (isOwnProfile) {
          fetchLikedVideos();
          fetchSavedVideos();
        }
      }
    }
  }, [userId, user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!error && data) {
      setProfile(data as ProfileType);
    }
    setLoading(false);
  };

  const fetchUserVideos = async () => {
    const { data } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      setVideos(data as Video[]);
    }
  };

  const fetchLikedVideos = async () => {
    const { data } = await supabase
      .from("likes")
      .select(`
        video_id,
        videos:video_id (*)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      setLikedVideos(data.map((item: any) => item.videos) as Video[]);
    }
  };

  const fetchSavedVideos = async () => {
    const { data } = await supabase
      .from("bookmarks")
      .select(`
        video_id,
        videos:video_id (*)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      setSavedVideos(data.map((item: any) => item.videos).filter(Boolean) as Video[]);
    }
  };

  const checkFollowing = async () => {
    if (!user || isOwnProfile) return;
    
    const { data } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", userId)
      .single();

    setIsFollowing(!!data);
  };

  const handleFollow = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", userId);
      setIsFollowing(false);
      if (profile) {
        setProfile({ ...profile, followers_count: profile.followers_count - 1 });
      }
    } else {
      await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: userId });
      setIsFollowing(true);
      if (profile) {
        setProfile({ ...profile, followers_count: profile.followers_count + 1 });
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out successfully" });
    navigate("/");
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground">
        <p className="text-lg font-semibold">User not found</p>
        <Button onClick={() => navigate("/")} variant="link" className="mt-4">
          Go back home
        </Button>
      </div>
    );
  }

  // SEO metadata
  const displayName = profile.display_name || profile.username || "User";
  const pageTitle = `${displayName} (@${profile.username || "user"}) | Creator Profile`;
  const pageDescription = profile.bio 
    ? `${profile.bio.slice(0, 150)}${profile.bio.length > 150 ? '...' : ''}`
    : `Check out ${displayName}'s profile - ${profile.followers_count} followers, ${videos.length} videos`;
  const pageUrl = `${window.location.origin}/profile/${userId}`;
  const avatarUrl = profile.avatar_url || `${window.location.origin}/placeholder.svg`;

  // JSON-LD structured data for Person
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": displayName,
    "alternateName": profile.username ? `@${profile.username}` : undefined,
    "url": pageUrl,
    "image": avatarUrl,
    "description": profile.bio || undefined,
    "interactionStatistic": [
      {
        "@type": "InteractionCounter",
        "interactionType": "https://schema.org/FollowAction",
        "userInteractionCount": profile.followers_count
      },
      {
        "@type": "InteractionCounter",
        "interactionType": "https://schema.org/LikeAction",
        "userInteractionCount": profile.likes_count
      }
    ],
    "sameAs": pageUrl
  };

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        
        {/* Open Graph */}
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={avatarUrl} />
        <meta property="profile:username" content={profile.username || "user"} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={avatarUrl} />
        
        {/* Canonical URL */}
        <link rel="canonical" href={pageUrl} />
        
        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background text-foreground pb-safe-nav">
        {/* Header */}
        <header className="flex items-center justify-between p-4">
          <button onClick={() => navigate(-1)} className="p-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-lg">@{profile.username || "user"}</h1>
          {isOwnProfile ? (
            <button onClick={() => navigate("/settings")} className="p-2">
              <Settings className="w-6 h-6" />
            </button>
          ) : (
            <div className="w-10" />
          )}
        </header>

      {/* Profile Info */}
      <div className="flex flex-col items-center px-4 pb-4">
        <Avatar className="w-24 h-24 border-2 border-foreground">
          <AvatarImage src={profile.avatar_url || undefined} />
          <AvatarFallback className="bg-secondary text-foreground text-2xl">
            {(profile.display_name || profile.username || "U")[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <h2 className="mt-3 font-bold text-lg">{profile.display_name || profile.username}</h2>

        {/* Stats */}
        <div className="flex items-center gap-8 mt-4">
          <button
            onClick={() => navigate(`/follow-list/${userId}?tab=following`)}
            className="text-center hover:opacity-70 transition-opacity"
          >
            <p className="font-bold text-lg">{formatCount(profile.following_count)}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </button>
          <button
            onClick={() => navigate(`/follow-list/${userId}?tab=followers`)}
            className="text-center hover:opacity-70 transition-opacity"
          >
            <p className="font-bold text-lg">{formatCount(profile.followers_count)}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </button>
          <div className="text-center">
            <p className="font-bold text-lg">{formatCount(profile.likes_count)}</p>
            <p className="text-xs text-muted-foreground">Likes</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4 w-full max-w-xs">
          {isOwnProfile ? (
            <Button 
              variant="secondary" 
              className="flex-1 font-semibold"
              onClick={() => navigate("/edit-profile")}
            >
              Edit profile
            </Button>
          ) : (
            <>
              <Button
                onClick={handleFollow}
                variant={isFollowing ? "secondary" : "default"}
                className="flex-1 font-semibold"
              >
                {isFollowing ? "Following" : "Follow"}
              </Button>
              <Button variant="secondary" className="flex-1 font-semibold">
                Message
              </Button>
            </>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-4 text-sm text-center text-muted-foreground max-w-xs">
            {profile.bio}
          </p>
        )}
      </div>

      {/* Videos Grid */}
      <Tabs defaultValue="videos" className="w-full">
        <TabsList className="w-full bg-transparent border-b border-border rounded-none h-12">
          <TabsTrigger 
            value="videos" 
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none"
          >
            <Grid3X3 className="w-5 h-5" />
          </TabsTrigger>
          {isOwnProfile && (
            <>
              <TabsTrigger 
                value="liked" 
                className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none"
              >
                <Heart className="w-5 h-5" />
              </TabsTrigger>
              <TabsTrigger 
                value="saved" 
                className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none"
              >
                <Bookmark className="w-5 h-5" />
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="videos" className="mt-0">
          {videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Grid3X3 className="w-12 h-12 mb-2" />
              <p>No videos yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5">
              {videos.map((video) => (
                <div 
                  key={video.id} 
                  className="aspect-[9/16] bg-secondary cursor-pointer relative group"
                  onClick={() => navigate(`/?video=${video.id}`)}
                >
                  {video.thumbnail_url ? (
                    <img 
                      src={video.thumbnail_url} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <video 
                      src={video.video_url} 
                      className="w-full h-full object-cover"
                      muted
                    />
                  )}
                  {/* View count overlay */}
                  <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-xs font-semibold drop-shadow-lg">
                    <Eye className="w-3 h-3" />
                    <span>{formatCount(video.views_count)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {isOwnProfile && (
          <>
            <TabsContent value="liked" className="mt-0">
              {likedVideos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Heart className="w-12 h-12 mb-2" />
                  <p>No liked videos yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-0.5">
                  {likedVideos.map((video) => (
                    <div 
                      key={video.id} 
                      className="aspect-[9/16] bg-secondary cursor-pointer relative"
                      onClick={() => navigate(`/?video=${video.id}`)}
                    >
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <video src={video.video_url} className="w-full h-full object-cover" muted />
                      )}
                      <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-xs font-semibold drop-shadow-lg">
                        <Eye className="w-3 h-3" />
                        <span>{formatCount(video.views_count)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="saved" className="mt-0">
              {savedVideos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Bookmark className="w-12 h-12 mb-2" />
                  <p>No saved videos yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-0.5">
                  {savedVideos.map((video) => (
                    <div 
                      key={video.id} 
                      className="aspect-[9/16] bg-secondary cursor-pointer relative"
                      onClick={() => navigate(`/?video=${video.id}`)}
                    >
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <video src={video.video_url} className="w-full h-full object-cover" muted />
                      )}
                      <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-xs font-semibold drop-shadow-lg">
                        <Eye className="w-3 h-3" />
                        <span>{formatCount(video.views_count)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>

      <BottomNav />
    </div>
    </>
  );
}