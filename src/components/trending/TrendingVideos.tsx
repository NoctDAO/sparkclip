import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Eye, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Video } from "@/types/video";

export function TrendingVideos() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTrendingVideos();
  }, []);

  const fetchTrendingVideos = async () => {
    setIsLoading(true);
    
    // Get videos with highest engagement in the last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { data } = await supabase
      .from("videos")
      .select("*")
      .gte("created_at", weekAgo.toISOString())
      .order("likes_count", { ascending: false })
      .limit(10);

    if (data) {
      setVideos(data as Video[]);
    }
    setIsLoading(false);
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">Trending Videos</h2>
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-32 aspect-[9/16] bg-secondary rounded-lg animate-pulse shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return null;
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-lg">Trending Videos</h2>
        </div>
        <button
          onClick={() => navigate("/discover")}
          className="text-sm text-primary flex items-center gap-1 hover:underline"
        >
          See all <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {videos.map((video, index) => (
          <div
            key={video.id}
            onClick={() => navigate(`/?video=${video.id}`)}
            className="relative w-32 aspect-[9/16] bg-secondary rounded-lg overflow-hidden cursor-pointer shrink-0 group"
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            {index < 3 && (
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded">
                #{index + 1}
              </div>
            )}
            <div className="absolute bottom-2 left-2 right-2">
              <div className="flex items-center gap-1 text-white text-xs font-semibold">
                <Eye className="w-3 h-3" />
                <span>{formatCount(video.views_count)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
