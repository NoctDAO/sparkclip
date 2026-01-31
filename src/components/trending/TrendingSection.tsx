import { TrendingHashtags } from "./TrendingHashtags";
import { TrendingVideos } from "./TrendingVideos";
import { TrendingCreators } from "./TrendingCreators";

export function TrendingSection() {
  return (
    <div className="space-y-6">
      <TrendingHashtags />
      <TrendingVideos />
      <TrendingCreators />
    </div>
  );
}
