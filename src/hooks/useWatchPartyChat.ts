import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WatchPartyMessage } from "@/types/watchparty";
import { useToast } from "@/hooks/use-toast";

export function useWatchPartyChat(partyId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<WatchPartyMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!partyId) return;

    const { data, error } = await supabase
      .from("watch_party_messages")
      .select("*")
      .eq("party_id", partyId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Failed to fetch messages:", error);
      setLoading(false);
      return;
    }

    // Fetch profiles for message senders
    const userIds = [...new Set(data.map(m => m.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url")
      .in("user_id", userIds);

    const messagesWithProfiles = data.map(m => ({
      ...m,
      profile: profiles?.find(p => p.user_id === m.user_id) || undefined
    }));

    setMessages(messagesWithProfiles);
    setLoading(false);
  }, [partyId]);

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    if (!user || !partyId || !content.trim()) return false;

    const { error } = await supabase
      .from("watch_party_messages")
      .insert({
        party_id: partyId,
        user_id: user.id,
        content: content.trim(),
      });

    if (error) {
      toast({ title: "Failed to send message", variant: "destructive" });
      return false;
    }

    return true;
  }, [user, partyId, toast]);

  // Subscribe to new messages
  useEffect(() => {
    if (!partyId) {
      setLoading(false);
      return;
    }

    fetchMessages();

    const channel = supabase
      .channel(`watch_party_messages_${partyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'watch_party_messages',
          filter: `party_id=eq.${partyId}`
        },
        async (payload) => {
          const newMessage = payload.new as WatchPartyMessage;
          
          // Fetch profile for new message sender
          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id, username, display_name, avatar_url")
            .eq("user_id", newMessage.user_id)
            .maybeSingle();

          setMessages(prev => [...prev, {
            ...newMessage,
            profile: profile || undefined
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partyId, fetchMessages]);

  return {
    messages,
    loading,
    sendMessage,
  };
}
