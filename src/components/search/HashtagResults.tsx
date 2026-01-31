import { useNavigate } from "react-router-dom";
import { Hash, TrendingUp } from "lucide-react";
import { HashtagResult } from "@/hooks/useSearch";

interface HashtagResultsProps {
  hashtags: HashtagResult[];
}

export function HashtagResults({ hashtags }: HashtagResultsProps) {
  const navigate = useNavigate();

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (hashtags.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>No hashtags found</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {hashtags.map((hashtag, index) => (
        <div
          key={hashtag.tag}
          onClick={() => navigate(`/hashtag/${encodeURIComponent(hashtag.tag)}`)}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary cursor-pointer transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
            {index < 3 ? (
              <TrendingUp className="w-5 h-5 text-primary" />
            ) : (
              <Hash className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">#{hashtag.tag}</p>
            <p className="text-sm text-muted-foreground">
              {formatCount(hashtag.videoCount)} videos
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
