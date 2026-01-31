export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string
          target_type: string
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id: string
          target_type: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      appeals: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_note: string | null
          status: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          status?: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      banned_users: {
        Row: {
          banned_at: string
          banned_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_at?: string
          banned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_at?: string
          banned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_user_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          blocked_user_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          blocked_user_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          likes_count: number | null
          parent_id: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          likes_count?: number | null
          parent_id?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          likes_count?: number | null
          parent_id?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      content_flags: {
        Row: {
          confidence: number
          content_id: string
          content_type: string
          created_at: string
          detected_issues: Json | null
          flag_type: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          confidence?: number
          content_id: string
          content_type: string
          created_at?: string
          detected_issues?: Json | null
          flag_type: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          confidence?: number
          content_id?: string
          content_type?: string
          created_at?: string
          detected_issues?: Json | null
          flag_type?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          participant_1: string
          participant_2: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_1: string
          participant_2: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_1?: string
          participant_2?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_keywords: {
        Row: {
          action: string
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_regex: boolean
          keyword: string
        }
        Insert: {
          action?: string
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_regex?: boolean
          keyword: string
        }
        Update: {
          action?: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_regex?: boolean
          keyword?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string
          comment_id: string | null
          created_at: string
          id: string
          is_read: boolean
          type: string
          user_id: string
          video_id: string | null
        }
        Insert: {
          actor_id: string
          comment_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          type: string
          user_id: string
          video_id?: string | null
        }
        Update: {
          actor_id?: string
          comment_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          type?: string
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          followers_count: number | null
          following_count: number | null
          id: string
          likes_count: number | null
          onboarding_completed: boolean
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          likes_count?: number | null
          onboarding_completed?: boolean
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          likes_count?: number | null
          onboarding_completed?: boolean
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_type: string
          id: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          action_type: string
          id?: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          action_type?: string
          id?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          query: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          user_id?: string
        }
        Relationships: []
      }
      series_follows: {
        Row: {
          created_at: string
          id: string
          series_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          series_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          series_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_follows_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "video_series"
            referencedColumns: ["id"]
          },
        ]
      }
      sound_favorites: {
        Row: {
          created_at: string
          id: string
          sound_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sound_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sound_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sound_favorites_sound_id_fkey"
            columns: ["sound_id"]
            isOneToOne: false
            referencedRelation: "sounds"
            referencedColumns: ["id"]
          },
        ]
      }
      sounds: {
        Row: {
          artist: string | null
          audio_url: string
          cover_url: string | null
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          id: string
          is_original: boolean
          original_video_id: string | null
          title: string
          uses_count: number
        }
        Insert: {
          artist?: string | null
          audio_url: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          is_original?: boolean
          original_video_id?: string | null
          title: string
          uses_count?: number
        }
        Update: {
          artist?: string | null
          audio_url?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          is_original?: boolean
          original_video_id?: string | null
          title?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "sounds_original_video_id_fkey"
            columns: ["original_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      trending_cache: {
        Row: {
          entity_id: string
          entity_type: string
          id: string
          period: string
          score: number
          updated_at: string
        }
        Insert: {
          entity_id: string
          entity_type: string
          id?: string
          period: string
          score?: number
          updated_at?: string
        }
        Update: {
          entity_id?: string
          entity_type?: string
          id?: string
          period?: string
          score?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_type: string
          user_id: string
          video_id: string
          watch_percentage: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_type: string
          user_id: string
          video_id: string
          watch_percentage?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          interaction_type?: string
          user_id?: string
          video_id?: string
          watch_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_interactions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_privacy_settings: {
        Row: {
          comment_permission: string
          created_at: string
          id: string
          is_private_account: boolean
          message_permission: string
          show_followers_list: boolean
          show_following_list: boolean
          show_liked_videos: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_permission?: string
          created_at?: string
          id?: string
          is_private_account?: boolean
          message_permission?: string
          show_followers_list?: boolean
          show_following_list?: boolean
          show_liked_videos?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_permission?: string
          created_at?: string
          id?: string
          is_private_account?: boolean
          message_permission?: string
          show_followers_list?: boolean
          show_following_list?: boolean
          show_liked_videos?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_recommendations: {
        Row: {
          affinity_creators: string[] | null
          affinity_hashtags: string[] | null
          computed_at: string
          expires_at: string
          id: string
          user_id: string
          video_ids: string[]
        }
        Insert: {
          affinity_creators?: string[] | null
          affinity_hashtags?: string[] | null
          computed_at?: string
          expires_at?: string
          id?: string
          user_id: string
          video_ids?: string[]
        }
        Update: {
          affinity_creators?: string[] | null
          affinity_hashtags?: string[] | null
          computed_at?: string
          expires_at?: string
          id?: string
          user_id?: string
          video_ids?: string[]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_series: {
        Row: {
          cover_image_url: string | null
          cover_video_id: string | null
          created_at: string
          description: string | null
          id: string
          title: string
          total_views: number
          updated_at: string
          user_id: string
          videos_count: number
        }
        Insert: {
          cover_image_url?: string | null
          cover_video_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title: string
          total_views?: number
          updated_at?: string
          user_id: string
          videos_count?: number
        }
        Update: {
          cover_image_url?: string | null
          cover_video_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          total_views?: number
          updated_at?: string
          user_id?: string
          videos_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_series_cover_video_id_fkey"
            columns: ["cover_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_views: {
        Row: {
          completion_percentage: number | null
          created_at: string
          id: string
          video_duration_seconds: number | null
          video_id: string
          viewer_id: string | null
          watch_duration_seconds: number
          watched_at: string
        }
        Insert: {
          completion_percentage?: number | null
          created_at?: string
          id?: string
          video_duration_seconds?: number | null
          video_id: string
          viewer_id?: string | null
          watch_duration_seconds?: number
          watched_at?: string
        }
        Update: {
          completion_percentage?: number | null
          created_at?: string
          id?: string
          video_duration_seconds?: number | null
          video_id?: string
          viewer_id?: string | null
          watch_duration_seconds?: number
          watched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_views_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          allow_duets: boolean | null
          caption: string | null
          comments_count: number | null
          created_at: string
          duet_layout: string | null
          duet_source_id: string | null
          hashtags: string[] | null
          id: string
          likes_count: number | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_note: string | null
          series_id: string | null
          series_order: number | null
          shares_count: number | null
          sound_id: string | null
          thumbnail_url: string | null
          user_id: string
          video_url: string
          views_count: number | null
          visibility: string
        }
        Insert: {
          allow_duets?: boolean | null
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          duet_layout?: string | null
          duet_source_id?: string | null
          hashtags?: string[] | null
          id?: string
          likes_count?: number | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          series_id?: string | null
          series_order?: number | null
          shares_count?: number | null
          sound_id?: string | null
          thumbnail_url?: string | null
          user_id: string
          video_url: string
          views_count?: number | null
          visibility?: string
        }
        Update: {
          allow_duets?: boolean | null
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          duet_layout?: string | null
          duet_source_id?: string | null
          hashtags?: string[] | null
          id?: string
          likes_count?: number | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          series_id?: string | null
          series_order?: number | null
          shares_count?: number | null
          sound_id?: string | null
          thumbnail_url?: string | null
          user_id?: string
          video_url?: string
          views_count?: number | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_duet_source_id_fkey"
            columns: ["duet_source_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "video_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_sound_id_fkey"
            columns: ["sound_id"]
            isOneToOne: false
            referencedRelation: "sounds"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      moderation_queue: {
        Row: {
          content_id: string | null
          content_type: string | null
          first_reported: string | null
          last_reported: string | null
          priority_score: number | null
          reasons: string[] | null
          report_count: number | null
          report_ids: string[] | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_follow: { Args: never; Returns: boolean }
      can_like: { Args: never; Returns: boolean }
      can_message_user: { Args: { target_user_id: string }; Returns: boolean }
      can_post_comment: { Args: never; Returns: boolean }
      can_send_message: { Args: never; Returns: boolean }
      can_submit_report: { Args: never; Returns: boolean }
      can_upload_video: { Args: never; Returns: boolean }
      check_rate_limit: {
        Args: {
          p_action_type: string
          p_max_requests: number
          p_user_id: string
          p_window_minutes: number
        }
        Returns: boolean
      }
      get_feed_videos: {
        Args: {
          p_blocked_user_ids?: string[]
          p_feed_type?: string
          p_limit?: number
          p_offset?: number
          p_user_id?: string
        }
        Returns: {
          allow_duets: boolean
          caption: string
          comments_count: number
          created_at: string
          duet_layout: string
          duet_source_id: string
          hashtags: string[]
          id: string
          is_bookmarked: boolean
          is_following: boolean
          is_liked: boolean
          likes_count: number
          profile_avatar_url: string
          profile_display_name: string
          profile_username: string
          series_description: string
          series_id: string
          series_order: number
          series_title: string
          series_videos_count: number
          shares_count: number
          sound_artist: string
          sound_audio_url: string
          sound_cover_url: string
          sound_id: string
          sound_title: string
          thumbnail_url: string
          user_id: string
          video_url: string
          views_count: number
          visibility: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_view_count: { Args: { video_id: string }; Returns: undefined }
      refresh_trending_cache: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "verified"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "verified"],
    },
  },
} as const
