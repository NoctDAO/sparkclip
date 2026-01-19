import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/layout/BottomNav";
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

  const trendingHashtags = [
    "fyp", "viral", "trending", "funny", "dance", 
    "music", "comedy", "lifestyle", "food", "travel"
  ];

  return (
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
                  className="aspect-[9/16] bg-secondary cursor-pointer overflow-hidden rounded-sm"
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
                        className="aspect-[9/16] bg-secondary cursor-pointer overflow-hidden rounded-sm"
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
  );
}