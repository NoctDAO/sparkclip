import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HashtagData {
  tag: string;
  count: number;
}

export function TrendingHashtags() {
  const navigate = useNavigate();
  const [hashtags, setHashtags] = useState<HashtagData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTrendingHashtags();
  }, []);

  const fetchTrendingHashtags = async () => {
    setIsLoading(true);
    
    // Get all videos with hashtags from the last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { data } = await supabase
      .from("videos")
      .select("hashtags, likes_count")
      .not("hashtags", "is", null)
      .gte("created_at", weekAgo.toISOString())
      .limit(500);

    if (data) {
      // Count hashtags weighted by likes
      const hashtagScores: Record<string, number> = {};
      data.forEach(video => {
        video.hashtags?.forEach((tag: string) => {
          hashtagScores[tag] = (hashtagScores[tag] || 0) + 1 + (video.likes_count || 0) * 0.1;
        });
      });

      const sorted = Object.entries(hashtagScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([tag, count]) => ({ tag, count: Math.round(count) }));

      setHashtags(sorted);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-lg">Trending Hashtags</h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-9 w-24 bg-secondary rounded-full animate-pulse shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (hashtags.length === 0) {
    return null;
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-lg">Trending Hashtags</h2>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {hashtags.map((hashtag, index) => (
          <button
            key={hashtag.tag}
            onClick={() => navigate(`/hashtag/${encodeURIComponent(hashtag.tag)}`)}
            className="flex items-center gap-1.5 px-4 py-2 bg-secondary rounded-full text-sm font-medium hover:bg-secondary/80 transition-colors shrink-0"
          >
            {index < 3 && <span className="text-primary">🔥</span>}
            <Hash className="w-3.5 h-3.5 text-primary" />
            {hashtag.tag}
          </button>
        ))}
      </div>
    </div>
  );
}
