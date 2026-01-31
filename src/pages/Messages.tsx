import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, PenSquare, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/layout/BottomNav";
import { ConversationList } from "@/components/messages/ConversationList";
import { ChatView } from "@/components/messages/ChatView";
import { NewMessageSheet } from "@/components/messages/NewMessageSheet";
import { useConversations } from "@/hooks/useConversations";
import { useAuth } from "@/hooks/useAuth";
import { Conversation } from "@/types/message";

export default function Messages() {
  const { conversationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, loading, refetch, getOrCreateConversation } = useConversations();
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  // Handle startWith query param - start conversation with specific user
  useEffect(() => {
    const startWithUserId = searchParams.get("startWith");
    if (startWithUserId && user) {
      getOrCreateConversation(startWithUserId).then((convoId) => {
        if (convoId) {
          navigate(`/messages/${convoId}`, { replace: true });
        }
      });
    }
  }, [searchParams, user, getOrCreateConversation, navigate]);

  // Find selected conversation when ID changes
  useEffect(() => {
    if (conversationId) {
      const found = conversations.find((c) => c.id === conversationId);
      setSelectedConversation(found || null);
    } else {
      setSelectedConversation(null);
    }
  }, [conversationId, conversations]);

  // Refetch when navigating to messages
  useEffect(() => {
    refetch();
  }, []);

  if (!user) {
    return (
      <div className="min-h-[var(--app-height)] bg-background text-foreground flex flex-col items-center justify-center pb-safe-nav">
        <MessageSquare className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">Messages</h2>
        <p className="text-muted-foreground text-center mb-6 max-w-xs">
          Sign in to send and receive messages
        </p>
        <Button onClick={() => navigate("/auth")} className="px-8">
          Sign in
        </Button>
        <BottomNav />
      </div>
    );
  }

  // Mobile: show chat view if conversation is selected
  const showChatOnMobile = !!conversationId && selectedConversation;

  return (
    <div className="min-h-[var(--app-height)] bg-background text-foreground flex flex-col">
      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col flex-1 pb-safe-nav">
        {showChatOnMobile ? (
          <ChatView
            conversation={selectedConversation}
            onBack={() => navigate("/messages")}
          />
        ) : (
          <>
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <button onClick={() => navigate(-1)} className="p-2">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="font-bold text-lg">Messages</h1>
              <button onClick={() => setShowNewMessage(true)} className="p-2">
                <PenSquare className="w-6 h-6" />
              </button>
            </header>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              <ConversationList
                conversations={conversations}
                loading={loading}
              />
            </div>
          </>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex flex-1">
        {/* Sidebar */}
        <div className="w-80 border-r border-border flex flex-col">
          <header className="flex items-center justify-between p-4 border-b border-border">
            <button onClick={() => navigate(-1)} className="p-2">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="font-bold text-lg">Messages</h1>
            <button onClick={() => setShowNewMessage(true)} className="p-2">
              <PenSquare className="w-6 h-6" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              conversations={conversations}
              loading={loading}
              selectedId={conversationId}
              onSelect={(c) => navigate(`/messages/${c.id}`)}
            />
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <ChatView conversation={selectedConversation} />
        </div>
      </div>

      <BottomNav />

      <NewMessageSheet open={showNewMessage} onOpenChange={setShowNewMessage} />
    </div>
  );
}
