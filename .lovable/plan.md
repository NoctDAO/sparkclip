
# In-Feed Ads Monetization System

This plan implements a native ad system that displays sponsored content seamlessly within the video feed, looking and behaving like regular videos. The system supports both Google AdSense and custom self-served ads with an admin management interface.

---

## Overview

Ads will appear as full-screen cards in the vertical scroll feed at configurable intervals (e.g., every 5 videos). Users can skip/swipe past ads just like regular videos. The system includes:

- **In-Feed Ad Cards**: Native-looking sponsored content slots
- **Admin Ad Management**: Create, schedule, and manage custom ad campaigns
- **Google AdSense Integration**: Fallback to programmatic ads when no custom ads available
- **Analytics Tracking**: Impressions, clicks, and view duration metrics

---

## Implementation Details

### 1. Database Schema

**New table: `ads`**
Stores custom advertisement campaigns with targeting and scheduling:
- `id`, `title`, `description`, `video_url` or `image_url`
- `click_url` (destination when tapped)
- `advertiser_name`, `advertiser_logo_url`
- `status` (active, paused, scheduled, ended)
- `start_date`, `end_date`
- `priority` (for ordering multiple active ads)
- `impressions_count`, `clicks_count`
- `created_at`, `updated_at`

**New table: `ad_settings`**
Global configuration for the ad system:
- `ad_frequency` (show ad every N videos, default: 5)
- `adsense_enabled` (boolean)
- `adsense_client_id` (ca-pub-xxx)
- `adsense_slot_id`
- `custom_ads_enabled` (boolean)

**New table: `ad_analytics`**
Detailed tracking for each ad interaction:
- `ad_id`, `user_id` (nullable for anonymous)
- `event_type` (impression, click, skip, view_complete)
- `view_duration_ms`
- `created_at`

### 2. Ad Card Component

**New file: `src/components/video/AdCard.tsx`**

A full-screen ad card matching the VideoCard design:
- "Sponsored" badge in corner
- Advertiser name/logo display
- Video or image content player
- Call-to-action button overlay
- Click tracking with analytics
- Swipe gestures work identically to videos

```text
+---------------------------+
|   [Sponsored]             |
|                           |
|      AD VIDEO/IMAGE       |
|      (full screen)        |
|                           |
|   Advertiser Logo         |
|   Ad Title/Description    |
|   [Learn More CTA]        |
+---------------------------+
```

### 3. AdSense Integration Component

**New file: `src/components/ads/AdSenseUnit.tsx`**

For programmatic ads when custom ads are unavailable:
- Loads the AdSense script dynamically
- Renders responsive in-feed ad unit
- Handles ad-blocker detection gracefully
- Falls back to empty state if blocked

### 4. Video Feed Modification

**Modified file: `src/components/video/VideoFeed.tsx`**

Inject ads at configured intervals:
- Fetch active ads from database
- Insert ad cards at positions based on `ad_frequency`
- Track which ads have been shown to avoid repeats
- Handle mixed content (videos + ads) in snap scroll

### 5. Admin Dashboard - Ads Tab

**New file: `src/components/admin/AdsManagement.tsx`**

Admin interface for managing advertisements:
- Create/edit custom ad campaigns
- Upload video or image creative
- Set scheduling and priority
- View performance metrics (impressions, clicks, CTR)
- Toggle AdSense integration on/off
- Configure ad frequency

**Modified file: `src/pages/AdminDashboard.tsx`**
- Add "Ads" tab to existing admin navigation

### 6. Analytics Hook

**New file: `src/hooks/useAdAnalytics.ts`**

Track ad performance:
- Log impressions when ad enters viewport
- Track click events
- Measure view duration
- Send data to `ad_analytics` table

### 7. Security Considerations

- RLS policies on ads table: public read for active ads, admin-only write
- Rate limiting on click tracking to prevent fraud
- Validate click URLs are HTTPS
- Sanitize ad content for XSS prevention

---

## File Changes Summary

| Action | File |
|--------|------|
| Create | `src/components/video/AdCard.tsx` |
| Create | `src/components/ads/AdSenseUnit.tsx` |
| Create | `src/components/admin/AdsManagement.tsx` |
| Create | `src/hooks/useAdAnalytics.ts` |
| Create | `src/types/ad.ts` |
| Modify | `src/components/video/VideoFeed.tsx` |
| Modify | `src/pages/AdminDashboard.tsx` |
| Create | Database migration for ads tables |

---

## User Experience

1. **Viewers**: See sponsored content every 5 videos (configurable), clearly labeled as "Sponsored"
2. **Admins**: Full control over ad campaigns, scheduling, and monetization settings
3. **Advertisers**: Can provide video/image creatives with click-through URLs
4. **Fallback**: Google AdSense fills empty slots when no custom ads are available
