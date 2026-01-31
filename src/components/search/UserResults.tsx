import { useNavigate } from "react-router-dom";
import { Profile } from "@/types/video";

interface UserResultsProps {
  users: Profile[];
}

export function UserResults({ users }: UserResultsProps) {
  const navigate = useNavigate();

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>No users found</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {users.map((user) => (
        <div
          key={user.id}
          onClick={() => navigate(`/profile/${user.user_id}`)}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary cursor-pointer transition-colors"
        >
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.username || "User avatar"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl font-semibold text-muted-foreground">
                {(user.display_name || user.username || "U")[0].toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">
              {user.display_name || user.username}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              @{user.username}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCount(user.followers_count)} followers
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
