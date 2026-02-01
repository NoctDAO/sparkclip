export interface Ad {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  image_url: string | null;
  click_url: string;
  advertiser_name: string;
  advertiser_logo_url: string | null;
  status: 'draft' | 'active' | 'paused' | 'scheduled' | 'ended';
  start_date: string | null;
  end_date: string | null;
  priority: number;
  impressions_count: number;
  clicks_count: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Targeting options
  target_hashtags: string[] | null;
  target_creators: string[] | null;
  target_interests: string[] | null;
}

export type InterestCategory = 
  | 'entertainment'
  | 'music'
  | 'sports'
  | 'gaming'
  | 'fashion'
  | 'food'
  | 'travel'
  | 'tech'
  | 'education'
  | 'lifestyle';

export const INTEREST_CATEGORIES: { value: InterestCategory; label: string }[] = [
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'music', label: 'Music' },
  { value: 'sports', label: 'Sports' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'fashion', label: 'Fashion & Beauty' },
  { value: 'food', label: 'Food & Cooking' },
  { value: 'travel', label: 'Travel' },
  { value: 'tech', label: 'Technology' },
  { value: 'education', label: 'Education' },
  { value: 'lifestyle', label: 'Lifestyle' },
];

export interface AdSettings {
  id: string;
  ad_frequency: number;
  adsense_enabled: boolean;
  adsense_client_id: string | null;
  adsense_slot_id: string | null;
  custom_ads_enabled: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface AdAnalytics {
  id: string;
  ad_id: string;
  user_id: string | null;
  event_type: 'impression' | 'click' | 'skip' | 'view_complete';
  view_duration_ms: number | null;
  created_at: string;
}

export type FeedItem = 
  | { type: 'video'; data: any }
  | { type: 'ad'; data: Ad }
  | { type: 'adsense'; slotId: string };
