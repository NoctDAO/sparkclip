import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Search, Eye } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { TrendingSection } from "@/components/trending/TrendingSection";
import { TrendingSeries } from "@/components/trending/TrendingSeries";
import { TrendingSounds } from "@/components/sounds/TrendingSounds";
import { ContinueWatching } from "@/components/discover/ContinueWatching";
import { VideoGridSkeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Video } from "@/types/video";

export default function Discover() {
  const navigate = useNavigate();
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTrendingVideos();
  }, []);

  const fetchTrendingVideos = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("videos")
      .select("*")
      .order("likes_count", { ascending: false })
      .limit(12);

    if (data) {
      setTrendingVideos(data as Video[]);
    }
    setIsLoading(false);
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

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
      </Helmet>

    <div className="min-h-[var(--app-height)] bg-background text-foreground pb-safe-nav">
      {/* Search Bar - Premium glassmorphic design */}
      <div className="sticky top-0 z-40 glass-premium p-4 border-b border-border/30">
        <button 
          onClick={() => navigate("/search")}
          className="w-full relative flex items-center group"
        >
          <Search className="absolute left-3 w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
          <div className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-border/50 rounded-lg text-left text-muted-foreground transition-all duration-200 group-hover:border-primary/30 group-hover:bg-secondary/70 group-hover:shadow-sm">
            Search videos, users, sounds...
          </div>
        </button>
      </div>

      {/* Continue Watching - for logged in users */}
      <ContinueWatching />

      {/* Trending Section */}
      <TrendingSection />

      {/* Popular Series */}
      <TrendingSeries />

      {/* Trending Sounds */}
      <TrendingSounds />

      {/* Explore Videos Grid */}
      <div className="px-4 pb-4">
        <h2 className="font-bold text-lg mb-3 text-display">Explore</h2>
        {isLoading ? (
          <VideoGridSkeleton count={12} />
        ) : (
          <div className="grid grid-cols-3 gap-1">
          {trendingVideos.map((video) => (
            <div
              key={video.id}
              className="aspect-[9/16] bg-secondary cursor-pointer overflow-hidden rounded-sm relative group grid-item-hover"
              onClick={() => navigate(`/?video=${video.id}`)}
            >
              {video.thumbnail_url ? (
                <img
                  src={video.thumbnail_url}
                  alt={video.caption || "Video"}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <video
                  src={video.video_url}
                  className="w-full h-full object-cover"
                  muted
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-xs font-semibold drop-shadow-lg">
                <Eye className="w-3 h-3" />
                <span>{formatCount(video.views_count)}</span>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
    </>
  );
}