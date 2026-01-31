import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Message } from "@/types/message";

interface UseMessagesOptions {
  conversationId: string | null;
}

export function useMessages({ conversationId }: UseMessagesOptions) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      setLoading(false);
      return;
    }

    // Get sender profiles
    const senderIds = [...new Set(data?.map((m) => m.sender_id) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url")
      .in("user_id", senderIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    const enrichedMessages: Message[] = (data || []).map((msg) => {
      const sender = profileMap.get(msg.sender_id);
      return {
        ...msg,
        sender: sender
          ? {
              user_id: sender.user_id,
              username: sender.username,
              display_name: sender.display_name,
              avatar_url: sender.avatar_url,
            }
          : undefined,
      };
    });

    setMessages(enrichedMessages);
    setLoading(false);

    // Mark unread messages as read
    markAsRead();
  }, [conversationId, user]);

  const markAsRead = useCallback(async () => {
    if (!conversationId || !user) return;

    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .is("read_at", null);
  }, [conversationId, user]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!conversationId || !user) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;

          // Fetch sender profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id, username, display_name, avatar_url")
            .eq("user_id", newMessage.sender_id)
            .single();

          const enrichedMessage: Message = {
            ...newMessage,
            sender: profile
              ? {
                  user_id: profile.user_id,
                  username: profile.username,
                  display_name: profile.display_name,
                  avatar_url: profile.avatar_url,
                }
              : undefined,
          };

          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === enrichedMessage.id)) {
              return prev;
            }
            return [...prev, enrichedMessage];
          });

          // Mark as read if not from current user
          if (newMessage.sender_id !== user.id) {
            markAsRead();
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId, user, markAsRead]);

  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      if (!conversationId || !user || !content.trim()) return false;

      setSending(true);

      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
      });

      setSending(false);

      if (error) {
        console.error("Error sending message:", error);
        return false;
      }

      return true;
    },
    [conversationId, user]
  );

  return {
    messages,
    loading,
    sending,
    sendMessage,
    refetch: fetchMessages,
    markAsRead,
  };
}
