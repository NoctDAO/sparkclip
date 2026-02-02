export interface Sound {
  id: string;
  title: string;
  artist: string | null;
  audio_url: string;
  cover_url: string | null;
  duration_seconds: number | null;
  uses_count: number;
  is_original: boolean;
  original_video_id: string | null;
  created_by: string | null;
  created_at: string;
  isFavorite?: boolean;
}

export interface VideoSeries {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_video_id: string | null;
  cover_image_url: string | null;
  videos_count: number;
  total_views: number;
  created_at: string;
  updated_at: string;
  cover_video?: Video;
  status?: string;
  notifications_enabled?: boolean;
}

export interface Video {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  hashtags: string[] | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  sound_id: string | null;
  series_id: string | null;
  series_order: number | null;
  duet_source_id: string | null;
  duet_layout: string | null;
  allow_duets: boolean;
  created_at: string;
  profiles?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  sound?: Sound;
  series?: VideoSeries;
}

export interface Comment {
  id: string;
  user_id: string;
  video_id: string;
  parent_id: string | null;
  content: string;
  likes_count: number;
  created_at: string;
  profiles?: {
    user_id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  replies?: Comment[];
  isLiked?: boolean;
}

export interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
  likes_count: number;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'mention' | 'comment_like' | 'reply' | 'like' | 'follow' | 'new_series_part';
  video_id: string | null;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
  actor?: {
    user_id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  video?: {
    id: string;
    thumbnail_url: string | null;
    series_id?: string | null;
    series?: {
      id: string;
      title: string;
    } | null;
  };
  comment?: {
    id: string;
    content: string;
  };
}
