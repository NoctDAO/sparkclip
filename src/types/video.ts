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
  created_at: string;
  profiles?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
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
  type: 'mention' | 'comment_like' | 'reply' | 'like' | 'follow';
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
  };
  comment?: {
    id: string;
    content: string;
  };
}
