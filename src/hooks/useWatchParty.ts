import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WatchParty, WatchPartyParticipant, WatchPartyWithVideo } from "@/types/watchparty";
import { useToast } from "@/hooks/use-toast";

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generatePartyCode = () => 
  Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');

export function useWatchParty(partyCode?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [party, setParty] = useState<WatchPartyWithVideo | null>(null);
  const [participants, setParticipants] = useState<WatchPartyParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playbackUpdateRef = useRef<NodeJS.Timeout | null>(null);

  const isHost = party?.host_id === user?.id;

  // Fetch party by code
  const fetchParty = useCallback(async (code: string) => {
    const { data, error } = await supabase
      .from("watch_parties")
      .select(`
        *,
        video:videos(id, video_url, thumbnail_url, caption, user_id)
      `)
      .eq("party_code", code)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      setError("Failed to load party");
      setLoading(false);
      return null;
    }

    if (!data) {
      setError("Party not found or has ended");
      setLoading(false);
      return null;
    }

    const partyData = {
      ...data,
      status: data.status as 'active' | 'ended',
      playback_time: Number(data.playback_time),
      video: Array.isArray(data.video) ? data.video[0] : data.video
    } as WatchPartyWithVideo;

    setParty(partyData);
    setLoading(false);
    return partyData;
  }, []);

  // Fetch participants
  const fetchParticipants = useCallback(async (partyId: string) => {
    const { data } = await supabase
      .from("watch_party_participants")
      .select("*")
      .eq("party_id", partyId)
      .is("left_at", null);

    if (data) {
      // Fetch profiles for participants
      const userIds = data.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);

      const participantsWithProfiles = data.map(p => ({
        ...p,
        profile: profiles?.find(prof => prof.user_id === p.user_id) || undefined
      }));

      setParticipants(participantsWithProfiles);
    }
  }, []);

  // Create a new party
  const createParty = useCallback(async (videoId: string): Promise<string | null> => {
    if (!user) {
      toast({ title: "Please sign in to start a watch party", variant: "destructive" });
      return null;
    }

    const code = generatePartyCode();

    const { data, error } = await supabase
      .from("watch_parties")
      .insert({
        host_id: user.id,
        video_id: videoId,
        party_code: code,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Failed to create party", variant: "destructive" });
      return null;
    }

    // Auto-join the party as host
    await supabase
      .from("watch_party_participants")
      .insert({
        party_id: data.id,
        user_id: user.id,
      });

    return code;
  }, [user, toast]);

  // Join an existing party
  const joinParty = useCallback(async (partyId: string) => {
    if (!user) return false;

    // Check if already a participant
    const { data: existing } = await supabase
      .from("watch_party_participants")
      .select("id, left_at")
      .eq("party_id", partyId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing && !existing.left_at) {
      // Already in party
      return true;
    }

    if (existing) {
      // Rejoin
      await supabase
        .from("watch_party_participants")
        .update({ left_at: null, last_ping_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      // New participant
      const { error } = await supabase
        .from("watch_party_participants")
        .insert({
          party_id: partyId,
          user_id: user.id,
        });

      if (error) {
        toast({ title: "Failed to join party", variant: "destructive" });
        return false;
      }
    }

    return true;
  }, [user, toast]);

  // Leave the party
  const leaveParty = useCallback(async () => {
    if (!user || !party) return;

    await supabase
      .from("watch_party_participants")
      .update({ left_at: new Date().toISOString() })
      .eq("party_id", party.id)
      .eq("user_id", user.id);
  }, [user, party]);

  // End the party (host only)
  const endParty = useCallback(async () => {
    if (!user || !party || !isHost) return;

    await supabase
      .from("watch_parties")
      .update({ 
        status: "ended",
        ended_at: new Date().toISOString()
      })
      .eq("id", party.id);
  }, [user, party, isHost]);

  // Update playback state (host only, throttled)
  const updatePlaybackState = useCallback((time: number, isPlaying: boolean) => {
    if (!party || !isHost) return;

    // Throttle updates to once per second
    if (playbackUpdateRef.current) return;

    playbackUpdateRef.current = setTimeout(() => {
      supabase
        .from("watch_parties")
        .update({ 
          playback_time: time,
          is_playing: isPlaying
        })
        .eq("id", party.id)
        .then(() => {
          playbackUpdateRef.current = null;
        });
    }, 1000);
  }, [party, isHost]);

  // Force sync all participants
  const syncAll = useCallback(async (time: number, isPlaying: boolean) => {
    if (!party || !isHost) return;

    await supabase
      .from("watch_parties")
      .update({ 
        playback_time: time,
        is_playing: isPlaying
      })
      .eq("id", party.id);
  }, [party, isHost]);

  // Ping presence
  const pingPresence = useCallback(async () => {
    if (!user || !party) return;

    await supabase
      .from("watch_party_participants")
      .update({ last_ping_at: new Date().toISOString() })
      .eq("party_id", party.id)
      .eq("user_id", user.id);
  }, [user, party]);

  // Initialize party subscription
  useEffect(() => {
    if (!partyCode) {
      setLoading(false);
      return;
    }

    let partyId: string | null = null;

    const init = async () => {
      const fetchedParty = await fetchParty(partyCode);
      if (!fetchedParty) return;

      partyId = fetchedParty.id;

      // Join the party if not already
      const joined = await joinParty(fetchedParty.id);
      if (!joined) return;

      // Fetch initial participants
      await fetchParticipants(fetchedParty.id);

      // Set up realtime subscription for party state
      const partyChannel = supabase
        .channel(`watch_party_${fetchedParty.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'watch_parties',
            filter: `id=eq.${fetchedParty.id}`
          },
          (payload) => {
            const updated = payload.new as WatchParty;
            setParty(prev => prev ? { ...prev, ...updated, playback_time: Number(updated.playback_time) } : null);
          }
        )
        .subscribe();

      // Subscribe to participant changes
      const participantsChannel = supabase
        .channel(`watch_party_participants_${fetchedParty.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'watch_party_participants',
            filter: `party_id=eq.${fetchedParty.id}`
          },
          () => {
            // Refetch participants on any change
            fetchParticipants(fetchedParty.id);
          }
        )
        .subscribe();

      // Start presence ping
      pingIntervalRef.current = setInterval(pingPresence, 30000);

      return () => {
        supabase.removeChannel(partyChannel);
        supabase.removeChannel(participantsChannel);
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
      };
    };

    init();

    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (playbackUpdateRef.current) {
        clearTimeout(playbackUpdateRef.current);
      }
    };
  }, [partyCode, fetchParty, joinParty, fetchParticipants, pingPresence]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (party && user) {
        // Mark as left when unmounting
        supabase
          .from("watch_party_participants")
          .update({ left_at: new Date().toISOString() })
          .eq("party_id", party.id)
          .eq("user_id", user.id);
      }
    };
  }, [party?.id, user?.id]);

  return {
    party,
    participants,
    loading,
    error,
    isHost,
    createParty,
    joinParty,
    leaveParty,
    endParty,
    updatePlaybackState,
    syncAll,
  };
}
