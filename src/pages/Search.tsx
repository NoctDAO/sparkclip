import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Search as SearchIcon, X, Clock, TrendingUp, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BottomNav } from "@/components/layout/BottomNav";
import { useSearch } from "@/hooks/useSearch";
import { VideoResults } from "@/components/search/VideoResults";
import { UserResults } from "@/components/search/UserResults";
import { SoundResults } from "@/components/search/SoundResults";
import { HashtagResults } from "@/components/search/HashtagResults";
import { SeriesResults } from "@/components/search/SeriesResults";

export default function Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState("videos");
  
  const { 
    results, 
    isLoading, 
    searchHistory, 
    saveSearchQuery, 
    clearSearchHistory 
  } = useSearch(query);

  useEffect(() => {
    if (query) {
      setSearchParams({ q: query });
    } else {
      setSearchParams({});
    }
  }, [query, setSearchParams]);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.trim()) {
      saveSearchQuery(searchQuery.trim());
    }
  };

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    saveSearchQuery(historyQuery);
  };

  const totalResults = 
    results.videos.length + 
    results.users.length + 
    results.sounds.length + 
    results.hashtags.length +
    results.series.length;

  const pageTitle = query 
    ? `Search "${query}" | Find Videos, Users & Sounds`
    : "Search | Find Videos, Users & Sounds";
  const pageDescription = query
    ? `Search results for "${query}" - Find videos, creators, sounds, and hashtags.`
    : "Search for videos, creators, sounds, and trending hashtags.";

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
      </Helmet>

      <div className="min-h-[var(--app-height)] bg-background text-foreground pb-safe-nav">
        {/* Search Header */}
        <div className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex items-center gap-3 p-4">
            <button onClick={() => navigate(-1)} className="p-1">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search videos, users, sounds..."
                className="pl-10 pr-10 bg-secondary border-none h-10"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {!query.trim() ? (
          /* Search History & Suggestions */
          <div className="p-4">
            {searchHistory.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Recent Searches
                  </h2>
                  <button
                    onClick={clearSearchHistory}
                    className="text-sm text-primary hover:underline"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((historyQuery, index) => (
                    <button
                      key={index}
                      onClick={() => handleHistoryClick(historyQuery)}
                      className="px-4 py-2 bg-secondary rounded-full text-sm hover:bg-secondary/80 transition-colors"
                    >
                      {historyQuery}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending suggestions */}
            <div>
              <h2 className="font-semibold text-muted-foreground flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4" />
                Trending Searches
              </h2>
              <div className="space-y-2">
                {["dance", "funny", "cooking", "music", "travel"].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSearch(suggestion)}
                    className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                  >
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Search Results */
          <div className="flex flex-col h-[calc(100vh-130px)]">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none px-4 shrink-0 overflow-x-auto">
                <TabsTrigger 
                  value="videos" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  Videos {results.videos.length > 0 && `(${results.videos.length})`}
                </TabsTrigger>
                <TabsTrigger 
                  value="users"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  Users {results.users.length > 0 && `(${results.users.length})`}
                </TabsTrigger>
                <TabsTrigger 
                  value="series"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  Series {results.series.length > 0 && `(${results.series.length})`}
                </TabsTrigger>
                <TabsTrigger 
                  value="sounds"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  Sounds {results.sounds.length > 0 && `(${results.sounds.length})`}
                </TabsTrigger>
                <TabsTrigger 
                  value="hashtags"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  Tags {results.hashtags.length > 0 && `(${results.hashtags.length})`}
                </TabsTrigger>
              </TabsList>

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : totalResults === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <SearchIcon className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No results found</p>
                  <p className="text-sm">Try searching for something else</p>
                </div>
              ) : (
                <>
                  <TabsContent value="videos" className="flex-1 overflow-auto mt-0">
                    <VideoResults videos={results.videos} />
                  </TabsContent>
                  <TabsContent value="users" className="flex-1 overflow-auto mt-0">
                    <UserResults users={results.users} />
                  </TabsContent>
                  <TabsContent value="series" className="flex-1 overflow-auto mt-0">
                    <SeriesResults series={results.series} />
                  </TabsContent>
                  <TabsContent value="sounds" className="flex-1 overflow-auto mt-0">
                    <SoundResults sounds={results.sounds} />
                  </TabsContent>
                  <TabsContent value="hashtags" className="flex-1 overflow-auto mt-0">
                    <HashtagResults hashtags={results.hashtags} />
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>
        )}

        <BottomNav />
      </div>
    </>
  );
}
