import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Hash, Eye, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/layout/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Video } from "@/types/video";

export default function HashtagPage() {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"recent" | "popular">("popular");
  const [relatedHashtags, setRelatedHashtags] = useState<string[]>([]);

  const decodedTag = tag ? decodeURIComponent(tag) : "";

  useEffect(() => {
    if (decodedTag) {
      fetchVideos();
      fetchRelatedHashtags();
    }
  }, [decodedTag, sortBy]);

  const fetchVideos = async () => {
    setIsLoading(true);
    
    const query = supabase
      .from("videos")
      .select("*")
      .contains("hashtags", [decodedTag]);

    if (sortBy === "popular") {
      query.order("likes_count", { ascending: false });
    } else {
      query.order("created_at", { ascending: false });
    }

    const { data } = await query.limit(50);
    
    if (data) {
      setVideos(data as Video[]);
    }
    setIsLoading(false);
  };

  const fetchRelatedHashtags = async () => {
    // Get videos with this hashtag and extract other hashtags they use
    const { data } = await supabase
      .from("videos")
      .select("hashtags")
      .contains("hashtags", [decodedTag])
      .not("hashtags", "is", null)
      .limit(100);

    if (data) {
      const hashtagCounts: Record<string, number> = {};
      data.forEach(video => {
        video.hashtags?.forEach((h: string) => {
          if (h.toLowerCase() !== decodedTag.toLowerCase()) {
            hashtagCounts[h] = (hashtagCounts[h] || 0) + 1;
          }
        });
      });

      const sorted = Object.entries(hashtagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([h]) => h);

      setRelatedHashtags(sorted);
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const pageTitle = `#${decodedTag} | Trending Videos & Content`;
  const pageDescription = `Explore ${videos.length} videos with #${decodedTag}. Discover trending content and popular creators.`;
  const pageUrl = `${window.location.origin}/hashtag/${encodeURIComponent(decodedTag)}`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={pageUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <link rel="canonical" href={pageUrl} />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex items-center gap-3 p-4">
            <button onClick={() => navigate(-1)} className="p-1">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h1 className="font-bold text-xl flex items-center gap-1">
                <Hash className="w-5 h-5 text-primary" />
                {decodedTag}
              </h1>
              <p className="text-sm text-muted-foreground">
                {formatCount(videos.length)} videos
              </p>
            </div>
          </div>
        </div>

        {/* Related Hashtags */}
        {relatedHashtags.length > 0 && (
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Related
            </h2>
            <div className="flex flex-wrap gap-2">
              {relatedHashtags.map((relatedTag) => (
                <button
                  key={relatedTag}
                  onClick={() => navigate(`/hashtag/${encodeURIComponent(relatedTag)}`)}
                  className="px-3 py-1.5 bg-secondary rounded-full text-sm hover:bg-secondary/80 transition-colors"
                >
                  #{relatedTag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sort Tabs */}
        <div className="flex gap-2 p-4 border-b border-border">
          <Button
            variant={sortBy === "popular" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("popular")}
          >
            Popular
          </Button>
          <Button
            variant={sortBy === "recent" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("recent")}
          >
            Recent
          </Button>
        </div>

        {/* Video Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Hash className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No videos yet</p>
            <p className="text-sm">Be the first to use #{decodedTag}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 p-1">
            {videos.map((video) => (
              <div
                key={video.id}
                className="aspect-[9/16] bg-secondary cursor-pointer overflow-hidden rounded-sm relative group"
                onClick={() => navigate(`/?video=${video.id}`)}
              >
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.caption || "Video thumbnail"}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <video
                    src={video.video_url}
                    className="w-full h-full object-cover"
                    muted
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-xs font-semibold drop-shadow-lg">
                  <Eye className="w-3 h-3" />
                  <span>{formatCount(video.views_count)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <BottomNav />
      </div>
    </>
  );
}
