import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SoundCard } from "./SoundCard";
import { Sound } from "@/types/video";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SoundPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSound: (sound: Sound) => void;
  selectedSound?: Sound | null;
}

export function SoundPicker({ open, onOpenChange, onSelectSound, selectedSound }: SoundPickerProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [trendingSounds, setTrendingSounds] = useState<Sound[]>([]);
  const [searchResults, setSearchResults] = useState<Sound[]>([]);
  const [favorites, setFavorites] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchSounds();
    }
  }, [open, user]);

  const fetchSounds = async () => {
    setLoading(true);

    // Fetch trending sounds
    const { data: trending } = await supabase
      .from("sounds")
      .select("*")
      .order("uses_count", { ascending: false })
      .limit(10);

    if (trending) {
      setTrendingSounds(trending as Sound[]);
    }

    // Fetch user favorites if logged in
    if (user) {
      const { data: favData } = await supabase
        .from("sound_favorites")
        .select("sound_id, sounds(*)")
        .eq("user_id", user.id)
        .limit(10);

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
      .limit(20);

    if (data) {
      setSearchResults(data as Sound[]);
    }
  };

  const handleSelect = (sound: Sound) => {
    onSelectSound(sound);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
        <SheetHeader className="pb-4">
          <SheetTitle>Add Sound</SheetTitle>
        </SheetHeader>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search sounds..."
            className="pl-10 bg-secondary border-none"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Currently selected */}
        {selectedSound && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Selected</h3>
            <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex-1">
                <SoundCard sound={selectedSound} compact showFavorite={false} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectSound(null as any)}
                className="text-destructive hover:text-destructive"
              >
                Remove
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-6 overflow-y-auto max-h-[calc(85vh-180px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : searchQuery ? (
            /* Search Results */
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Results for "{searchQuery}"
              </h3>
              {searchResults.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  No sounds found
                </p>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((sound) => (
                    <SoundCard 
                      key={sound.id} 
                      sound={sound} 
                      onSelect={handleSelect}
                      compact
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Favorites */}
              {favorites.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Your Favorites
                  </h3>
                  <div className="space-y-2">
                    {favorites.map((sound) => (
                      <SoundCard 
                        key={sound.id} 
                        sound={sound} 
                        onSelect={handleSelect}
                        compact
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Trending */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Trending Sounds
                </h3>
                {trendingSounds.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    No sounds available yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {trendingSounds.map((sound) => (
                      <SoundCard 
                        key={sound.id} 
                        sound={sound} 
                        onSelect={handleSelect}
                        compact
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
