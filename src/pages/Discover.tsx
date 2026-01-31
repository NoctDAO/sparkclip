import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Search, TrendingUp, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/layout/BottomNav";
import { TrendingSounds } from "@/components/sounds/TrendingSounds";
import { supabase } from "@/integrations/supabase/client";
import { Video, Profile } from "@/types/video";

export default function Discover() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [searchResults, setSearchResults] = useState<{
    videos: Video[];
    users: Profile[];
  }>({ videos: [], users: [] });
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchTrendingVideos();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    } else {
      setSearchResults({ videos: [], users: [] });
    }
  }, [searchQuery]);

  const fetchTrendingVideos = async () => {
    const { data } = await supabase
      .from("videos")
      .select("*")
      .order("likes_count", { ascending: false })
      .limit(12);

    if (data) {
      setTrendingVideos(data as Video[]);
    }
  };

  const performSearch = async () => {
    setIsSearching(true);

    const [videosRes, usersRes] = await Promise.all([
      supabase
        .from("videos")
        .select("*")
        .or(`caption.ilike.%${searchQuery}%,hashtags.cs.{${searchQuery}}`)
        .limit(10),
      supabase
        .from("profiles")
        .select("*")
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(10),
    ]);

    setSearchResults({
      videos: (videosRes.data || []) as Video[],
      users: (usersRes.data || []) as Profile[],
    });
    setIsSearching(false);
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const trendingHashtags = [
    "fyp", "viral", "trending", "funny", "dance", 
    "music", "comedy", "lifestyle", "food", "travel"
  ];

  // SEO metadata
  const pageTitle = "Discover | Explore Trending Videos, Sounds & Creators";
  const pageDescription = "Discover trending videos, sounds, and creators. Explore viral content, popular hashtags, and find your next favorite creator.";
  const pageUrl = `${window.location.origin}/discover`;

  // JSON-LD structured data for ItemList
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Trending Videos",
    "description": "Explore trending and popular videos",
    "url": pageUrl,
    "numberOfItems": trendingVideos.length,
    "itemListElement": trendingVideos.map((video, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "VideoObject",
        "url": `${window.location.origin}/video/${video.id}`,
        "name": video.caption || `Video ${video.id}`,
        "thumbnailUrl": video.thumbnail_url || video.video_url,
        "uploadDate": video.created_at,
        "interactionStatistic": {
          "@type": "InteractionCounter",
          "interactionType": "https://schema.org/LikeAction",
          "userInteractionCount": video.likes_count || 0
        }
      }
    }))
  };

  // Hashtags structured data
  const hashtagsJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Trending Hashtags",
    "description": "Popular hashtags and topics",
    "itemListElement": trendingHashtags.map((tag, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Thing",
        "name": `#${tag}`,
        "url": `${pageUrl}?q=${tag}`
      }
    }))
  };

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={pageUrl} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        
        {/* Canonical URL */}
        <link rel="canonical" href={pageUrl} />
        
        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(hashtagsJsonLd)}
        </script>
      </Helmet>

    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Search Bar */}
      <div className="sticky top-0 z-40 bg-background p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search videos and users"
            className="pl-10 bg-secondary border-none h-10"
          />
        </div>
      </div>

      {!searchQuery.trim() ? (
        <>
          {/* Trending Sounds */}
          <TrendingSounds />

          {/* Trending Hashtags */}
          <div className="p-4">
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Trending
            </h2>
            <div className="flex flex-wrap gap-2">
              {trendingHashtags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  className="px-4 py-2 bg-secondary rounded-full text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Trending Videos Grid */}
          <div className="px-4 pb-4">
            <h2 className="font-bold text-lg mb-3">Explore</h2>
            <div className="grid grid-cols-3 gap-1">
              {trendingVideos.map((video) => (
                <div
                  key={video.id}
                  className="aspect-[9/16] bg-secondary cursor-pointer overflow-hidden rounded-sm relative"
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
                  <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-xs font-semibold drop-shadow-lg">
                    <Eye className="w-3 h-3" />
                    <span>{formatCount(video.views_count)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Search Results */
        <div className="p-4">
          {isSearching ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Users */}
              {searchResults.users.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-muted-foreground mb-3">Users</h3>
                  <div className="space-y-3">
                    {searchResults.users.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => navigate(`/profile/${user.user_id}`)}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt=""
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-semibold">
                              {(user.display_name || user.username || "U")[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">@{user.username}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.followers_count} followers
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Videos */}
              {searchResults.videos.length > 0 && (
                <div>
                  <h3 className="font-semibold text-muted-foreground mb-3">Videos</h3>
                  <div className="grid grid-cols-3 gap-1">
                    {searchResults.videos.map((video) => (
                      <div
                        key={video.id}
                        className="aspect-[9/16] bg-secondary cursor-pointer overflow-hidden rounded-sm relative"
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
                        <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-xs font-semibold drop-shadow-lg">
                          <Eye className="w-3 h-3" />
                          <span>{formatCount(video.views_count)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.videos.length === 0 && searchResults.users.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No results found for "{searchQuery}"</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <BottomNav />
    </div>
    </>
  );
}