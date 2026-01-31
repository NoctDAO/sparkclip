import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Conversation } from "@/types/message";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  selectedId?: string;
  onSelect?: (conversation: Conversation) => void;
}

export function ConversationList({
  conversations,
  loading,
  selectedId,
  onSelect,
}: ConversationListProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="divide-y divide-border">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="font-semibold">No messages yet</p>
        <p className="text-sm mt-1">Start a conversation from someone's profile</p>
      </div>
    );
  }

  const handleClick = (conversation: Conversation) => {
    if (onSelect) {
      onSelect(conversation);
    } else {
      navigate(`/messages/${conversation.id}`);
    }
  };

  return (
    <div className="divide-y divide-border">
      {conversations.map((conversation) => {
        const displayName =
          conversation.other_user?.display_name ||
          conversation.other_user?.username ||
          "User";
        const lastMessage = conversation.last_message?.content || "Start chatting";
        const hasUnread = (conversation.unread_count || 0) > 0;

        return (
          <button
            key={conversation.id}
            onClick={() => handleClick(conversation)}
            className={cn(
              "flex items-center gap-3 w-full p-4 text-left transition-colors hover:bg-secondary/50",
              selectedId === conversation.id && "bg-secondary/50",
              hasUnread && "bg-secondary/30"
            )}
          >
            <Avatar className="w-12 h-12 shrink-0">
              <AvatarImage src={conversation.other_user?.avatar_url || undefined} />
              <AvatarFallback className="bg-muted text-foreground">
                {displayName[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className={cn("font-semibold truncate", hasUnread && "text-foreground")}>
                  {displayName}
                </p>
                {conversation.last_message && (
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {formatDistanceToNow(new Date(conversation.last_message.created_at), {
                      addSuffix: false,
                    })}
                  </span>
                )}
              </div>
              <p
                className={cn(
                  "text-sm truncate",
                  hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {lastMessage}
              </p>
            </div>

            {hasUnread && (
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0">
                {conversation.unread_count}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
