import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Conversation, Message } from "@/types/message";
import { isValidUUID } from "@/lib/sanitize";

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Get all conversations for the user
    const { data: convos, error } = await supabase
      .from("conversations")
      .select("*")
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      setLoading(false);
      return;
    }

    if (!convos || convos.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Get unique other user IDs
    const otherUserIds = convos.map((c) =>
      c.participant_1 === user.id ? c.participant_2 : c.participant_1
    );

    // Fetch profiles for other users
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url")
      .in("user_id", otherUserIds);

    // Fetch last message for each conversation
    const { data: lastMessages } = await supabase
      .from("messages")
      .select("*")
      .in(
        "conversation_id",
        convos.map((c) => c.id)
      )
      .order("created_at", { ascending: false });

    // Fetch unread counts
    const { data: unreadCounts } = await supabase
      .from("messages")
      .select("conversation_id")
      .in(
        "conversation_id",
        convos.map((c) => c.id)
      )
      .neq("sender_id", user.id)
      .is("read_at", null);

    // Create a map for quick lookup
    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
    
    // Group messages by conversation to get last message
    const lastMessageMap = new Map<string, Message>();
    lastMessages?.forEach((msg) => {
      if (!lastMessageMap.has(msg.conversation_id)) {
        lastMessageMap.set(msg.conversation_id, msg as Message);
      }
    });

    // Count unreads per conversation
    const unreadMap = new Map<string, number>();
    unreadCounts?.forEach((item) => {
      unreadMap.set(
        item.conversation_id,
        (unreadMap.get(item.conversation_id) || 0) + 1
      );
    });

    // Combine all data
    const enrichedConversations: Conversation[] = convos.map((convo) => {
      const otherUserId =
        convo.participant_1 === user.id
          ? convo.participant_2
          : convo.participant_1;
      const otherUser = profileMap.get(otherUserId);

      return {
        ...convo,
        other_user: otherUser
          ? {
              user_id: otherUser.user_id,
              username: otherUser.username,
              display_name: otherUser.display_name,
              avatar_url: otherUser.avatar_url,
            }
          : undefined,
        last_message: lastMessageMap.get(convo.id),
        unread_count: unreadMap.get(convo.id) || 0,
      };
    });

    setConversations(enrichedConversations);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Subscribe to new messages for real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("conversations-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          // Refetch conversations when a new message arrives
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  const getOrCreateConversation = useCallback(
    async (otherUserId: string): Promise<string | null> => {
      if (!user) return null;

      // Validate UUID to prevent injection
      if (!isValidUUID(otherUserId)) {
        console.error("Invalid user ID format");
        return null;
      }

      // Check if conversation already exists
      // Use .eq() filters instead of string interpolation in .or() for safety
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`
        )
        .single();

      if (existing) {
        return existing.id;
      }

      // Create new conversation
      const { data: newConvo, error } = await supabase
        .from("conversations")
        .insert({
          participant_1: user.id,
          participant_2: otherUserId,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating conversation:", error);
        return null;
      }

      // Refresh conversations list
      fetchConversations();

      return newConvo?.id || null;
    },
    [user, fetchConversations]
  );

  const totalUnreadCount = conversations.reduce(
    (acc, c) => acc + (c.unread_count || 0),
    0
  );

  return {
    conversations,
    loading,
    refetch: fetchConversations,
    getOrCreateConversation,
    totalUnreadCount,
  };
}
