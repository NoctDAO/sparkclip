import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "./MessageBubble";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { Conversation } from "@/types/message";

interface ChatViewProps {
  conversation: Conversation | null;
  onBack?: () => void;
}

export function ChatView({ conversation, onBack }: ChatViewProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { messages, loading, sending, sendMessage } = useMessages({
    conversationId: conversation?.id || null,
  });
  
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    const success = await sendMessage(newMessage);
    if (success) {
      setNewMessage("");
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/messages");
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Select a conversation to start messaging</p>
      </div>
    );
  }

  const displayName =
    conversation.other_user?.display_name ||
    conversation.other_user?.username ||
    "User";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 border-b border-border shrink-0">
        <button onClick={handleBack} className="p-1 md:hidden">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button
          onClick={() => navigate(`/profile/${conversation.other_user?.user_id}`)}
          className="flex items-center gap-3 flex-1 min-w-0"
        >
          <Avatar className="w-10 h-10">
            <AvatarImage src={conversation.other_user?.avatar_url || undefined} />
            <AvatarFallback className="bg-muted text-foreground">
              {displayName[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold truncate">{displayName}</p>
            {conversation.other_user?.username && (
              <p className="text-xs text-muted-foreground truncate">
                @{conversation.other_user.username}
              </p>
            )}
          </div>
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
              >
                <Skeleton className="h-10 w-48 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Avatar className="w-16 h-16 mb-4">
              <AvatarImage src={conversation.other_user?.avatar_url || undefined} />
              <AvatarFallback className="bg-muted text-foreground text-2xl">
                {displayName[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold text-foreground">{displayName}</p>
            <p className="text-sm mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.sender_id === user?.id;
            const showTime =
              index === messages.length - 1 ||
              messages[index + 1]?.sender_id !== message.sender_id;

            return (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={isOwn}
                showTime={showTime}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border shrink-0">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
