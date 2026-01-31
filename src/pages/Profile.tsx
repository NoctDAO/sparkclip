import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Settings, Grid3X3, Bookmark, Heart, ArrowLeft, Eye, Lock, Ban, MoreHorizontal, Layers, Pencil, Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BottomNav } from "@/components/layout/BottomNav";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { VideoThumbnail } from "@/components/video/VideoThumbnail";
import { VideoGridSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useRateLimit } from "@/hooks/useRateLimit";
import { useUserPrivacy } from "@/hooks/useUserPrivacy";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { useVideoSeries } from "@/hooks/useVideoSeries";
import { supabase } from "@/integrations/supabase/client";
import { SeriesManager } from "@/components/video/SeriesManager";
import { CreateSeriesSheet } from "@/components/video/CreateSeriesSheet";
import { Profile as ProfileType, Video, VideoSeries } from "@/types/video";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { isVerified } = useUserRoles(userId);
  const { checkRateLimit: checkFollowLimit } = useRateLimit("follow");
  const { 
    canViewLikedVideos, 
    canViewFollowingList, 
    canViewFollowersList,
    isFollowing: privacyIsFollowing,
    refetch: refetchPrivacy 
  } = useUserPrivacy(userId);
  const { blockUser, unblockUser, isUserBlocked } = useBlockedUsers();
  const { getUserSeries } = useVideoSeries();
  
  const isBlocked = userId ? isUserBlocked(userId) : false;
  
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [likedVideos, setLikedVideos] = useState<Video[]>([]);
  const [savedVideos, setSavedVideos] = useState<Video[]>([]);
  const [userSeries, setUserSeries] = useState<VideoSeries[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [managingSeries, setManagingSeries] = useState<VideoSeries | null>(null);
  const [showCreateSeries, setShowCreateSeries] = useState(false);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchUserVideos();
      fetchUserSeries();
      if (user) {
        checkFollowing();
        if (isOwnProfile) {
          fetchSavedVideos();
        }
      }
    }
  }, [userId, user]);

  // Fetch liked videos when tab becomes visible (own profile or privacy allows)
  useEffect(() => {
    if (userId && (isOwnProfile || canViewLikedVideos())) {
      fetchLikedVideos();
    }
  }, [userId, isOwnProfile, privacyIsFollowing]);

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

  const fetchUserSeries = async () => {
    if (!userId) return;
    const series = await getUserSeries(userId);
    setUserSeries(series);
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

    if (!checkFollowLimit()) return;
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
    // Refetch privacy to update follow status for permission checks
    refetchPrivacy();
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
      <div className="min-h-[var(--app-height)] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[var(--app-height)] bg-background flex flex-col items-center justify-center text-foreground">
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

      <div className="min-h-[var(--app-height)] bg-background text-foreground pb-safe-nav">
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

        <h2 className="mt-3 font-bold text-lg flex items-center gap-1.5">
          {profile.display_name || profile.username}
          {isVerified && <VerifiedBadge size="md" />}
        </h2>

        {/* Stats */}
        <div className="flex items-center gap-8 mt-4">
          <button
            onClick={() => canViewFollowingList() && navigate(`/follow-list/${userId}?tab=following`)}
            className={`text-center transition-opacity ${canViewFollowingList() ? 'hover:opacity-70' : 'cursor-default'}`}
          >
            <p className="font-bold text-lg">{formatCount(profile.following_count)}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
              Following
              {!canViewFollowingList() && <Lock className="w-3 h-3" />}
            </p>
          </button>
          <button
            onClick={() => canViewFollowersList() && navigate(`/follow-list/${userId}?tab=followers`)}
            className={`text-center transition-opacity ${canViewFollowersList() ? 'hover:opacity-70' : 'cursor-default'}`}
          >
            <p className="font-bold text-lg">{formatCount(profile.followers_count)}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
              Followers
              {!canViewFollowersList() && <Lock className="w-3 h-3" />}
            </p>
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
              <Button 
                variant="secondary" 
                className="flex-1 font-semibold"
                onClick={async () => {
                  if (!userId) return;
                  // Navigate to messages - we'll use a query param to start conversation
                  navigate(`/messages?startWith=${userId}`);
                }}
              >
                Message
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={async () => {
                      if (!userId) return;
                      if (isBlocked) {
                        const success = await unblockUser(userId);
                        if (success) {
                          toast({ title: "User unblocked" });
                        } else {
                          toast({ title: "Failed to unblock user", variant: "destructive" });
                        }
                      } else {
                        const success = await blockUser(userId);
                        if (success) {
                          toast({ title: "User blocked" });
                        } else {
                          toast({ title: "Failed to block user", variant: "destructive" });
                        }
                      }
                    }}
                    className={isBlocked ? "" : "text-destructive focus:text-destructive"}
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    {isBlocked ? "Unblock" : "Block"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
          {/* Series tab - always visible */}
          <TabsTrigger 
            value="series" 
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none"
          >
            <Layers className="w-5 h-5" />
          </TabsTrigger>
          {/* Show liked videos tab if own profile OR if privacy allows */}
          {(isOwnProfile || canViewLikedVideos()) && (
            <TabsTrigger 
              value="liked" 
              className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none"
            >
              <Heart className="w-5 h-5" />
            </TabsTrigger>
          )}
          {isOwnProfile && (
            <TabsTrigger 
              value="saved" 
              className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none"
            >
              <Bookmark className="w-5 h-5" />
            </TabsTrigger>
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
              {videos.map((video, index) => (
                <div 
                  key={video.id} 
                  className="relative group grid-item-hover"
                >
                  <VideoThumbnail
                    thumbnailUrl={video.thumbnail_url}
                    videoUrl={video.video_url}
                    alt={video.caption || "Video"}
                    onClick={() => navigate(`/?video=${video.id}`)}
                    className="rounded-sm"
                    priority={index < 6}
                  />
                  {/* View count overlay */}
                  <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-xs font-semibold drop-shadow-lg pointer-events-none">
                    <Eye className="w-3 h-3" />
                    <span>{formatCount(video.views_count)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Series tab */}
        <TabsContent value="series" className="mt-0">
          {/* Create Series Button - only for own profile */}
          {isOwnProfile && (
            <div className="p-2 pb-0">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowCreateSeries(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Series
              </Button>
            </div>
          )}
          
          {userSeries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Layers className="w-12 h-12 mb-2" />
              <p>No series yet</p>
              {isOwnProfile && (
                <p className="text-xs mt-1">Create a series to group your videos</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 p-2">
              {userSeries.map((series) => (
                <div 
                  key={series.id} 
                  className="bg-secondary rounded-lg p-4 text-left hover:bg-secondary/80 transition-colors relative"
                >
                  <button
                    className="w-full text-left"
                    onClick={() => {
                      // Navigate to series detail page
                      navigate(`/series/${series.id}`);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center overflow-hidden">
                        {series.cover_image_url ? (
                          <img src={series.cover_image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Layers className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{series.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {series.videos_count} {series.videos_count === 1 ? "part" : "parts"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="w-3 h-3" />
                      <span>{formatCount(series.total_views)} views</span>
                    </div>
                  </button>
                  {/* Edit button for own profile */}
                  {isOwnProfile && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setManagingSeries(series);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Liked videos tab - show for own profile or when privacy allows */}
        {(isOwnProfile || canViewLikedVideos()) && (
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
        )}

        {/* Saved videos tab - only for own profile */}
        {isOwnProfile && (
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
        )}
      </Tabs>

      {/* Series Manager Sheet */}
      {managingSeries && (
        <SeriesManager
          series={managingSeries}
          open={!!managingSeries}
          onOpenChange={(open) => !open && setManagingSeries(null)}
          onSeriesUpdated={() => fetchUserSeries()}
        />
      )}

      {/* Create Series Sheet */}
      <CreateSeriesSheet
        open={showCreateSeries}
        onOpenChange={setShowCreateSeries}
        onSeriesCreated={() => fetchUserSeries()}
      />

      <BottomNav />
    </div>
    </>
  );
}