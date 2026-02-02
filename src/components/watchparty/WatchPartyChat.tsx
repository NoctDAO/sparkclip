import { useState, useRef, useEffect } from "react";
import { Send, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WatchPartyMessage } from "@/types/watchparty";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface WatchPartyChatProps {
  messages: WatchPartyMessage[];
  onSendMessage: (content: string) => Promise<boolean>;
  currentUserId?: string;
}

export function WatchPartyChat({ 
  messages, 
  onSendMessage,
  currentUserId 
}: WatchPartyChatProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current && !isCollapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isCollapsed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    setSending(true);
    const success = await onSendMessage(message);
    if (success) {
      setMessage("");
    }
    setSending(false);
    inputRef.current?.focus();
  };

  return (
    <div className={cn(
      "bg-background/90 backdrop-blur-sm rounded-t-xl border border-b-0 border-border/50 transition-all duration-300",
      isCollapsed ? "h-12" : "h-64"
    )}>
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-border/30"
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Chat</span>
          {messages.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({messages.length})
            </span>
          )}
        </div>
        {isCollapsed ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {!isCollapsed && (
        <>
          {/* Messages */}
          <ScrollArea className="h-[calc(100%-6.5rem)] px-3 py-2" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No messages yet. Say hi! 👋
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isOwn = msg.user_id === currentUserId;
                  const initials = msg.profile?.display_name?.[0] || 
                                  msg.profile?.username?.[0] || 
                                  '?';

                  return (
                    <div 
                      key={msg.id}
                      className={cn(
                        "flex gap-2",
                        isOwn && "flex-row-reverse"
                      )}
                    >
                      <Avatar className="w-6 h-6 flex-shrink-0">
                        <AvatarImage src={msg.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {initials.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "flex flex-col max-w-[70%]",
                        isOwn && "items-end"
                      )}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-medium">
                            {msg.profile?.display_name || msg.profile?.username || 'User'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(msg.created_at), 'HH:mm')}
                          </span>
                        </div>
                        <div className={cn(
                          "px-3 py-1.5 rounded-2xl text-sm",
                          isOwn 
                            ? "bg-primary text-primary-foreground rounded-tr-sm" 
                            : "bg-muted rounded-tl-sm"
                        )}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-2 border-t border-border/30">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 h-9 text-sm"
                maxLength={200}
              />
              <Button 
                type="submit" 
                size="sm" 
                disabled={!message.trim() || sending}
                className="h-9 px-3"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
