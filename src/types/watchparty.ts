export interface WatchParty {
  id: string;
  host_id: string;
  video_id: string;
  party_code: string;
  status: 'active' | 'ended';
  playback_time: number;
  is_playing: boolean;
  max_participants: number;
  created_at: string;
  ended_at: string | null;
}

export interface WatchPartyParticipant {
  id: string;
  party_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
  last_ping_at: string;
  // Joined profile data
  profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface WatchPartyMessage {
  id: string;
  party_id: string;
  user_id: string;
  content: string;
  created_at: string;
  // Joined profile data
  profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface WatchPartyWithVideo extends WatchParty {
  video: {
    id: string;
    video_url: string;
    thumbnail_url: string | null;
    caption: string | null;
    user_id: string;
  };
}
