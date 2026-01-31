import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Star, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types/video";

export function TrendingCreators() {
  const navigate = useNavigate();
  const [creators, setCreators] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTrendingCreators();
  }, []);

  const fetchTrendingCreators = async () => {
    setIsLoading(true);
    
    // Get profiles with most followers
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("followers_count", { ascending: false })
      .limit(10);

    if (data) {
      setCreators(data as Profile[]);
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
            <Star className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">Rising Creators</h2>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-16 h-16 bg-secondary rounded-full animate-pulse" />
              <div className="h-3 w-16 bg-secondary rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (creators.length === 0) {
    return null;
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-lg">Rising Creators</h2>
        </div>
        <button
          onClick={() => navigate("/search")}
          className="text-sm text-primary flex items-center gap-1 hover:underline"
        >
          See all <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {creators.map((creator) => (
          <div
            key={creator.id}
            onClick={() => navigate(`/profile/${creator.user_id}`)}
            className="flex flex-col items-center gap-2 cursor-pointer shrink-0 group"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/50 p-0.5">
                <div className="w-full h-full rounded-full bg-background p-0.5">
                  <div className="w-full h-full rounded-full bg-secondary overflow-hidden">
                    {creator.avatar_url ? (
                      <img
                        src={creator.avatar_url}
                        alt={creator.username || "Creator"}
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                        {(creator.display_name || creator.username || "U")[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center max-w-[80px]">
              <p className="text-xs font-medium truncate">
                {creator.display_name || creator.username}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {formatCount(creator.followers_count)} followers
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
