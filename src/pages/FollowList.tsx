import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Search, X, Lock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useUserPrivacy } from "@/hooks/useUserPrivacy";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types/video";

interface FollowUser extends Profile {
  isFollowing: boolean;
}

export default function FollowList() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canViewFollowingList, canViewFollowersList, loading: privacyLoading } = useUserPrivacy(userId);

  const initialTab = searchParams.get("tab") === "following" ? "following" : "followers";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Filter users based on search query
  const filteredFollowers = useMemo(() => {
    if (!searchQuery.trim()) return followers;
    const query = searchQuery.toLowerCase();
    return followers.filter(
      (p) =>
        p.display_name?.toLowerCase().includes(query) ||
        p.username?.toLowerCase().includes(query)
    );
  }, [followers, searchQuery]);

  const filteredFollowing = useMemo(() => {
    if (!searchQuery.trim()) return following;
    const query = searchQuery.toLowerCase();
    return following.filter(
      (p) =>
        p.display_name?.toLowerCase().includes(query) ||
        p.username?.toLowerCase().includes(query)
    );
  }, [following, searchQuery]);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId, user]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchFollowers(),
      fetchFollowing(),
      fetchCurrentUserFollowing(),
    ]);
    setLoading(false);
  };

  const fetchCurrentUserFollowing = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    if (data) {
      setFollowingIds(new Set(data.map((f) => f.following_id)));
    }
  };

  const fetchFollowers = async () => {
    // Get users who follow this profile
    const { data } = await supabase
      .from("follows")
      .select(`
        follower_id,
        profiles:follower_id (*)
      `)
      .eq("following_id", userId);

    if (data) {
      const followerProfiles = data
        .map((item: any) => item.profiles)
        .filter(Boolean) as Profile[];
      
      setFollowers(
        followerProfiles.map((p) => ({
          ...p,
          isFollowing: followingIds.has(p.user_id),
        }))
      );
    }
  };

  const fetchFollowing = async () => {
    // Get users this profile follows
    const { data } = await supabase
      .from("follows")
      .select(`
        following_id,
        profiles:following_id (*)
      `)
      .eq("follower_id", userId);

    if (data) {
      const followingProfiles = data
        .map((item: any) => item.profiles)
        .filter(Boolean) as Profile[];
      
      setFollowing(
        followingProfiles.map((p) => ({
          ...p,
          isFollowing: followingIds.has(p.user_id),
        }))
      );
    }
  };

  // Update lists when followingIds changes
  useEffect(() => {
    setFollowers((prev) =>
      prev.map((p) => ({ ...p, isFollowing: followingIds.has(p.user_id) }))
    );
    setFollowing((prev) =>
      prev.map((p) => ({ ...p, isFollowing: followingIds.has(p.user_id) }))
    );
  }, [followingIds]);

  const handleFollow = async (targetUserId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const isCurrentlyFollowing = followingIds.has(targetUserId);

    if (isCurrentlyFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);

      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    } else {
      await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: targetUserId });

      setFollowingIds((prev) => new Set(prev).add(targetUserId));
    }
  };

  const UserItem = ({ profile }: { profile: FollowUser }) => {
    const isOwnProfile = user?.id === profile.user_id;
    const isFollowing = followingIds.has(profile.user_id);

    return (
      <div className="flex items-center justify-between p-4">
        <div
          className="flex items-center gap-3 flex-1 cursor-pointer"
          onClick={() => navigate(`/profile/${profile.user_id}`)}
        >
          <Avatar className="w-12 h-12">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="bg-secondary text-foreground">
              {(profile.display_name || profile.username || "U")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">
              {profile.display_name || profile.username}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              @{profile.username || "user"}
            </p>
          </div>
        </div>

        {!isOwnProfile && (
          <Button
            variant={isFollowing ? "secondary" : "default"}
            size="sm"
            onClick={() => handleFollow(profile.user_id)}
            className="ml-2 min-w-[90px]"
          >
            {isFollowing ? "Following" : "Follow"}
          </Button>
        )}
      </div>
    );
  };

  const EmptyState = ({ type }: { type: "followers" | "following" }) => (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <p className="text-lg font-medium">
        {type === "followers" ? "No followers yet" : "Not following anyone"}
      </p>
      <p className="text-sm mt-1">
        {type === "followers"
          ? "When people follow this account, they'll appear here."
          : "When this account follows people, they'll appear here."}
      </p>
    </div>
  );

  const PrivateState = ({ type }: { type: "followers" | "following" }) => (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Lock className="w-12 h-12 mb-4" />
      <p className="text-lg font-medium">
        This list is private
      </p>
      <p className="text-sm mt-1 text-center px-4">
        {type === "followers"
          ? "This user has chosen to keep their followers list private."
          : "This user has chosen to keep their following list private."}
      </p>
    </div>
  );

  if (loading || privacyLoading) {
    return (
      <div className="min-h-[var(--app-height)] bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-[var(--app-height)] bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-bold text-lg ml-2">
          {activeTab === "followers" ? "Followers" : "Following"}
        </h1>
      </header>

      {/* Search Bar */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="bg-secondary border-none h-10 pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full bg-transparent border-b border-border rounded-none h-12">
          <TabsTrigger
            value="followers"
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none"
          >
            Followers ({followers.length})
          </TabsTrigger>
          <TabsTrigger
            value="following"
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none"
          >
            Following ({following.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="followers" className="mt-0">
          {!canViewFollowersList() ? (
            <PrivateState type="followers" />
          ) : followers.length === 0 ? (
            <EmptyState type="followers" />
          ) : filteredFollowers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-lg font-medium">No results found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredFollowers.map((profile) => (
                <UserItem key={profile.user_id} profile={profile} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="following" className="mt-0">
          {!canViewFollowingList() ? (
            <PrivateState type="following" />
          ) : following.length === 0 ? (
            <EmptyState type="following" />
          ) : filteredFollowing.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-lg font-medium">No results found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredFollowing.map((profile) => (
                <UserItem key={profile.user_id} profile={profile} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
