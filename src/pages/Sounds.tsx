import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, TrendingUp, Clock, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SoundCard } from "@/components/sounds/SoundCard";
import { BottomNav } from "@/components/layout/BottomNav";
import { Sound } from "@/types/video";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function Sounds() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [trendingSounds, setTrendingSounds] = useState<Sound[]>([]);
  const [recentSounds, setRecentSounds] = useState<Sound[]>([]);
  const [favorites, setFavorites] = useState<Sound[]>([]);
  const [searchResults, setSearchResults] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSounds();
  }, [user]);

  const fetchSounds = async () => {
    setLoading(true);

    // Fetch trending sounds
    const { data: trending } = await supabase
      .from("sounds")
      .select("*")
      .order("uses_count", { ascending: false })
      .limit(20);

    if (trending) {
      setTrendingSounds(trending as Sound[]);
    }

    // Fetch recent sounds
    const { data: recent } = await supabase
      .from("sounds")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (recent) {
      setRecentSounds(recent as Sound[]);
    }

    // Fetch user favorites if logged in
    if (user) {
      const { data: favData } = await supabase
        .from("sound_favorites")
        .select("sound_id, sounds(*)")
        .eq("user_id", user.id);

      if (favData) {
        const favSounds = favData
          .map((f: any) => ({ ...f.sounds, isFavorite: true }))
          .filter(Boolean) as Sound[];
        setFavorites(favSounds);
      }
    }

    setLoading(false);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from("sounds")
      .select("*")
      .or(`title.ilike.%${query}%,artist.ilike.%${query}%`)
      .order("uses_count", { ascending: false })
      .limit(30);

    if (data) {
      setSearchResults(data as Sound[]);
    }
  };

  return (
    <div className="min-h-[var(--app-height)] bg-background pb-safe-nav">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Sounds</h1>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search sounds..."
              className="pl-10 bg-secondary border-none"
            />
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : searchQuery ? (
        /* Search Results */
        <div className="p-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Results for "{searchQuery}"
          </h2>
          {searchResults.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No sounds found
            </p>
          ) : (
            <div className="space-y-2">
              {searchResults.map((sound) => (
                <SoundCard key={sound.id} sound={sound} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Tabs */
        <Tabs defaultValue="trending" className="p-4">
          <TabsList className="w-full bg-secondary">
            <TabsTrigger value="trending" className="flex-1 gap-1">
              <TrendingUp className="w-4 h-4" />
              Trending
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex-1 gap-1">
              <Clock className="w-4 h-4" />
              Recent
            </TabsTrigger>
            {user && (
              <TabsTrigger value="favorites" className="flex-1 gap-1">
                <Heart className="w-4 h-4" />
                Saved
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="trending" className="mt-4 space-y-2">
            {trendingSounds.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No trending sounds yet
              </p>
            ) : (
              trendingSounds.map((sound) => (
                <SoundCard key={sound.id} sound={sound} />
              ))
            )}
          </TabsContent>

          <TabsContent value="recent" className="mt-4 space-y-2">
            {recentSounds.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No sounds added yet
              </p>
            ) : (
              recentSounds.map((sound) => (
                <SoundCard key={sound.id} sound={sound} />
              ))
            )}
          </TabsContent>

          {user && (
            <TabsContent value="favorites" className="mt-4 space-y-2">
              {favorites.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No saved sounds yet
                </p>
              ) : (
                favorites.map((sound) => (
                  <SoundCard key={sound.id} sound={sound} />
                ))
              )}
            </TabsContent>
          )}
        </Tabs>
      )}

      <BottomNav />
    </div>
  );
}
