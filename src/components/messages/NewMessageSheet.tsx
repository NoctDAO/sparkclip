import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useConversations } from "@/hooks/useConversations";
import { useAuth } from "@/hooks/useAuth";

interface UserResult {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface NewMessageSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewMessageSheet({ open, onOpenChange }: NewMessageSheetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getOrCreateConversation } = useConversations();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);

    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url")
      .neq("user_id", user?.id || "")
      .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
      .limit(20);

    if (!error && data) {
      setResults(data);
    }

    setLoading(false);
  };

  const handleSelectUser = async (selectedUser: UserResult) => {
    setStarting(true);

    const conversationId = await getOrCreateConversation(selectedUser.user_id);

    setStarting(false);

    if (conversationId) {
      onOpenChange(false);
      navigate(`/messages/${conversationId}`);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="w-5 h-5" />
            </Button>
            <SheetTitle>New Message</SheetTitle>
            <div className="w-10" />
          </div>
        </SheetHeader>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search users..."
            className="pl-10"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : results.length === 0 && query.length >= 2 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="divide-y divide-border">
              {results.map((userResult) => (
                <button
                  key={userResult.user_id}
                  onClick={() => handleSelectUser(userResult)}
                  disabled={starting}
                  className="flex items-center gap-3 w-full p-3 text-left transition-colors hover:bg-secondary/50 disabled:opacity-50"
                >
                  <Avatar className="w-11 h-11">
                    <AvatarImage src={userResult.avatar_url || undefined} />
                    <AvatarFallback className="bg-muted text-foreground">
                      {(userResult.display_name || userResult.username || "U")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {userResult.display_name || userResult.username}
                    </p>
                    {userResult.username && (
                      <p className="text-sm text-muted-foreground truncate">
                        @{userResult.username}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
