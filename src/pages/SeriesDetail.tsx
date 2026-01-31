import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Eye, Heart, MessageCircle, Share2, Play, Layers, Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/layout/BottomNav";
import { SeriesManager } from "@/components/video/SeriesManager";
import { useAuth } from "@/hooks/useAuth";
import { useVideoSeries } from "@/hooks/useVideoSeries";
import { supabase } from "@/integrations/supabase/client";
import { VideoSeries, Video, Profile } from "@/types/video";

export default function SeriesDetail() {
  const { seriesId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getSeriesById, getSeriesVideos } = useVideoSeries();

  const [series, setSeries] = useState<VideoSeries | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [creator, setCreator] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showManager, setShowManager] = useState(false);

  // Combined stats
  const [totalLikes, setTotalLikes] = useState(0);
  const [totalComments, setTotalComments] = useState(0);
  const [totalShares, setTotalShares] = useState(0);

  const isOwner = user?.id === series?.user_id;

  useEffect(() => {
    if (seriesId) {
      loadSeriesData();
    }
  }, [seriesId]);

  const loadSeriesData = async () => {
    if (!seriesId) return;

    setLoading(true);

    // Fetch series details
    const seriesData = await getSeriesById(seriesId);
    if (!seriesData) {
      navigate("/404");
      return;
    }
    setSeries(seriesData);

    // Fetch videos
    const seriesVideos = await getSeriesVideos(seriesId);
    setVideos(seriesVideos);

    // Calculate combined stats
    const likes = seriesVideos.reduce((sum, v) => sum + (v.likes_count || 0), 0);
    const comments = seriesVideos.reduce((sum, v) => sum + (v.comments_count || 0), 0);
    const shares = seriesVideos.reduce((sum, v) => sum + (v.shares_count || 0), 0);
    setTotalLikes(likes);
    setTotalComments(comments);
    setTotalShares(shares);

    // Fetch creator profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", seriesData.user_id)
      .single();

    if (profileData) {
      setCreator(profileData as Profile);
    }

    setLoading(false);
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!series) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{series.title} - Series</title>
        <meta name="description" content={series.description || `Watch all ${series.videos_count} parts of ${series.title}`} />
      </Helmet>

      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-semibold truncate mx-4">Series</h1>
            {isOwner && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowManager(true)}
              >
                <Pencil className="w-5 h-5" />
              </Button>
            )}
            {!isOwner && <div className="w-10" />}
          </div>
        </header>

        {/* Series Info */}
        <div className="p-4 border-b border-border">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Layers className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">{series.title}</h2>
              {series.description && (
                <p className="text-muted-foreground mt-1 text-sm">{series.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Created {formatDate(series.created_at)}
              </p>
            </div>
          </div>

          {/* Creator info */}
          {creator && (
            <Link
              to={`/profile/${creator.user_id}`}
              className="flex items-center gap-3 mt-4 p-3 bg-secondary rounded-lg"
            >
              <Avatar className="w-10 h-10">
                <AvatarImage src={creator.avatar_url || undefined} />
                <AvatarFallback>
                  {creator.display_name?.[0] || creator.username?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {creator.display_name || creator.username || "Unknown"}
                </p>
                <p className="text-sm text-muted-foreground">
                  @{creator.username || "user"}
                </p>
              </div>
            </Link>
          )}

          {/* Combined Stats */}
          <div className="grid grid-cols-4 gap-4 mt-4 p-4 bg-secondary rounded-lg">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Layers className="w-4 h-4" />
              </div>
              <p className="font-bold">{series.videos_count}</p>
              <p className="text-xs text-muted-foreground">Parts</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Eye className="w-4 h-4" />
              </div>
              <p className="font-bold">{formatCount(series.total_views)}</p>
              <p className="text-xs text-muted-foreground">Views</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Heart className="w-4 h-4" />
              </div>
              <p className="font-bold">{formatCount(totalLikes)}</p>
              <p className="text-xs text-muted-foreground">Likes</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <MessageCircle className="w-4 h-4" />
              </div>
              <p className="font-bold">{formatCount(totalComments)}</p>
              <p className="text-xs text-muted-foreground">Comments</p>
            </div>
          </div>

          {/* Play All Button */}
          {videos.length > 0 && (
            <Button
              onClick={() => navigate(`/video/${videos[0].id}`)}
              className="w-full mt-4 gap-2"
              size="lg"
            >
              <Play className="w-5 h-5 fill-current" />
              Play from Part 1
            </Button>
          )}
        </div>

        {/* Videos List */}
        <div className="p-4">
          <h3 className="font-semibold mb-4">All Parts ({videos.length})</h3>
          
          {videos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Layers className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No videos in this series yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {videos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => navigate(`/video/${video.id}`)}
                  className="w-full flex gap-3 p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-left"
                >
                  {/* Thumbnail */}
                  <div className="w-24 h-36 bg-muted rounded-lg overflow-hidden relative flex-shrink-0">
                    {video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url}
                        alt={`Part ${video.series_order}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={video.video_url}
                        className="w-full h-full object-cover"
                        muted
                      />
                    )}
                    {/* Part badge */}
                    <div className="absolute top-1 left-1 px-2 py-0.5 bg-background/90 rounded text-xs font-semibold">
                      Part {video.series_order}
                    </div>
                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-background/80 flex items-center justify-center">
                        <Play className="w-5 h-5 fill-current" />
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 py-1">
                    <p className="font-medium line-clamp-2">
                      {video.caption || `Part ${video.series_order}`}
                    </p>
                    
                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {formatCount(video.views_count)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {formatCount(video.likes_count)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {formatCount(video.comments_count)}
                      </span>
                    </div>

                    {/* Date */}
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(video.created_at)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Series Manager */}
        {series && (
          <SeriesManager
            series={series}
            open={showManager}
            onOpenChange={setShowManager}
            onSeriesUpdated={loadSeriesData}
          />
        )}

        <BottomNav />
      </div>
    </>
  );
}
