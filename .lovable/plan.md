

# VidShare Platform Enhancement - Comprehensive Development Plan

This plan covers five major features to transform VidShare into a more engaging, creator-focused platform with monetization capabilities.

---

## Overview

| Feature | Priority | Complexity | Estimated Effort |
|---------|----------|------------|------------------|
| Direct Messaging | High | Medium | 2-3 days |
| Video Duets | High | High | 3-4 days |
| Video Effects & Filters | Medium | High | 3-4 days |
| Creator Monetization | High | Medium | 2-3 days |
| Analytics Dashboard Enhancement | Medium | Low | 1-2 days |

---

## Feature 1: Direct Messaging (DMs)

### What It Does
Users can send private messages to each other with real-time updates, read receipts, and message notifications.

### Database Changes

**New Tables:**

| Table | Columns | Purpose |
|-------|---------|---------|
| `conversations` | id, participant_1, participant_2, last_message_at, created_at | Stores 1:1 conversations |
| `messages` | id, conversation_id, sender_id, content, read_at, created_at | Individual messages |

**RLS Policies:**
- Users can only view/send messages in conversations they're part of
- Privacy settings integration (message_permission: everyone/followers/none)

### Implementation Steps

1. **Database Migration**
   - Create `conversations` and `messages` tables
   - Add indexes for efficient querying
   - Enable realtime for `messages` table
   - Create RLS policies respecting user privacy settings

2. **Create Core Hooks**
   - `useConversations` - List all user conversations with last message preview
   - `useMessages` - Fetch messages for a conversation with pagination
   - `useSendMessage` - Send messages with optimistic updates

3. **Build UI Components**
   - `ConversationList` - Shows all chats with avatars, names, last message
   - `ChatView` - Full message thread with input
   - `MessageBubble` - Individual message display with read status
   - `NewMessageSheet` - Start conversation with user search

4. **Update Existing Pages**
   - Add "Messages" tab to Inbox page or create dedicated `/messages` route
   - Update Profile "Message" button to open DM with that user
   - Add message notification type to notification system

5. **Real-time Features**
   - Subscribe to new messages in active conversation
   - Show typing indicators (optional)
   - Update conversation list when new message arrives

### Files to Create/Modify

| File | Action |
|------|--------|
| Database migration | Create |
| `src/hooks/useConversations.ts` | Create |
| `src/hooks/useMessages.ts` | Create |
| `src/pages/Messages.tsx` | Create |
| `src/components/messages/ConversationList.tsx` | Create |
| `src/components/messages/ChatView.tsx` | Create |
| `src/components/messages/MessageBubble.tsx` | Create |
| `src/pages/Inbox.tsx` | Modify (add messages tab) |
| `src/pages/Profile.tsx` | Modify (connect Message button) |
| `src/types/video.ts` | Modify (add Message types) |

---

## Feature 2: Video Duets

### What It Does
Users can record their own video alongside an existing video, creating split-screen content for reactions, collaborations, and responses.

### Database Changes

**Modify `videos` table:**

| New Column | Type | Purpose |
|------------|------|---------|
| `duet_source_id` | uuid (nullable) | References original video being duetted |
| `duet_layout` | text (nullable) | Layout type: 'side-by-side', 'top-bottom', 'green-screen' |
| `allow_duets` | boolean | Whether this video allows duets (default: true) |

### Implementation Steps

1. **Database Migration**
   - Add duet columns to videos table
   - Create index on duet_source_id for efficient querying
   - Add privacy column for duet permissions

2. **Create Duet Recording Flow**
   - `DuetRecordingPage` - Split-screen recording interface
   - Use MediaRecorder API for camera capture
   - Play original video in sync with recording
   - Merge videos client-side or use canvas for preview

3. **Build UI Components**
   - `DuetButton` - Action button on videos (in VideoActions)
   - `DuetLayoutPicker` - Choose side-by-side or top-bottom
   - `DuetPreview` - Split-screen preview before posting

4. **Update Video Display**
   - Show duet indicator on videos that are duets
   - Link to original video from duet
   - Show "Duets" count on original video

5. **Privacy Controls**
   - Add "Allow Duets" toggle in video privacy settings
   - Check permission before showing duet button

### Files to Create/Modify

| File | Action |
|------|--------|
| Database migration | Create |
| `src/pages/DuetRecording.tsx` | Create |
| `src/components/video/DuetButton.tsx` | Create |
| `src/components/video/DuetLayoutPicker.tsx` | Create |
| `src/components/video/DuetIndicator.tsx` | Create |
| `src/hooks/useDuetRecording.ts` | Create |
| `src/components/video/VideoActions.tsx` | Modify (add duet button) |
| `src/types/video.ts` | Modify (add duet fields) |

### Technical Considerations
- Browser MediaRecorder API compatibility
- Video synchronization during recording
- Canvas-based video merging for preview
- Storage considerations (duets create new video files)

---

## Feature 3: Video Effects & Filters

### What It Does
Creators can apply visual effects and filters during upload, including beauty filters, color grading, and AR-style overlays.

### Database Changes

**New table:**

| Table | Columns | Purpose |
|-------|---------|---------|
| `video_effects` | id, name, type, parameters, thumbnail_url, is_premium | Available effects catalog |

**Modify `videos` table:**

| New Column | Type | Purpose |
|------------|------|---------|
| `applied_effects` | jsonb | Array of effect IDs and parameters applied |

### Implementation Steps

1. **Database Migration**
   - Create `video_effects` table with seed data for built-in effects
   - Add applied_effects column to videos

2. **Build Effects Engine**
   - Use Canvas API or WebGL for real-time filter preview
   - Implement common filters: brightness, contrast, saturation, blur, vintage, etc.
   - Create effect parameter controls (sliders)

3. **Create UI Components**
   - `EffectsPicker` - Grid of available effects with previews
   - `EffectControls` - Sliders for effect intensity
   - `FilterPreview` - Real-time preview on video

4. **Update Upload Flow**
   - Add "Effects" step between video selection and posting
   - Apply effects to video preview in real-time
   - Store applied effects metadata with video

5. **Effect Categories**
   - Color filters (warm, cool, vintage, B&W)
   - Beauty filters (smooth, brighten)
   - Fun filters (vignette, grain, glitch)

### Files to Create/Modify

| File | Action |
|------|--------|
| Database migration | Create |
| `src/hooks/useVideoEffects.ts` | Create |
| `src/components/effects/EffectsPicker.tsx` | Create |
| `src/components/effects/EffectControls.tsx` | Create |
| `src/components/effects/FilterPreview.tsx` | Create |
| `src/lib/effects/filters.ts` | Create (filter algorithms) |
| `src/pages/Upload.tsx` | Modify (add effects step) |

### Technical Considerations
- WebGL shaders for performant filter application
- Effects applied at playback time vs baked into video
- Mobile device performance optimization

---

## Feature 4: Creator Monetization (Stripe Integration)

### What It Does
Viewers can send tips/donations to creators. Creators can track earnings and request payouts.

### Implementation Approach

This requires enabling Stripe integration for payment processing.

### Database Changes

**New Tables:**

| Table | Columns | Purpose |
|-------|---------|---------|
| `creator_wallets` | id, user_id, balance, total_earned, stripe_account_id, created_at | Track creator earnings |
| `tips` | id, from_user_id, to_user_id, video_id, amount, message, stripe_payment_id, created_at | Individual tip transactions |
| `payouts` | id, user_id, amount, status, stripe_payout_id, created_at | Payout requests |

### Implementation Steps

1. **Enable Stripe Integration**
   - Use Lovable's Stripe connector to set up payments
   - Configure Stripe Connect for creator payouts

2. **Database Migration**
   - Create monetization tables
   - Add RLS policies for secure access

3. **Create Stripe Edge Functions**
   - `create-tip-payment` - Process tip payments
   - `create-connected-account` - Onboard creators to Stripe Connect
   - `process-payout` - Handle creator payout requests
   - `stripe-webhook` - Handle Stripe events

4. **Build UI Components**
   - `TipButton` - Quick tip amounts on video
   - `TipSheet` - Custom amount and message
   - `CreatorEarnings` - Dashboard showing earnings
   - `PayoutRequest` - Request withdrawal
   - `StripeOnboarding` - Connect creator's bank account

5. **Update Profile & Video Pages**
   - Add tip button to video actions
   - Add earnings section to creator profile
   - Show supporter badges on tippers

### Files to Create/Modify

| File | Action |
|------|--------|
| Database migration | Create |
| `supabase/functions/create-tip-payment/index.ts` | Create |
| `supabase/functions/stripe-webhook/index.ts` | Create |
| `src/hooks/useTipping.ts` | Create |
| `src/hooks/useCreatorEarnings.ts` | Create |
| `src/components/monetization/TipButton.tsx` | Create |
| `src/components/monetization/TipSheet.tsx` | Create |
| `src/components/monetization/EarningsDashboard.tsx` | Create |
| `src/pages/CreatorStudio.tsx` | Create |
| `src/components/video/VideoActions.tsx` | Modify |

### Prerequisites
- Stripe account and API keys
- Stripe Connect setup for marketplace payments

---

## Feature 5: Enhanced Analytics Dashboard

### What It Does
Expand the existing analytics with audience demographics, geographic data, traffic sources, and series performance metrics.

### Current State
The Analytics page already shows:
- Views, likes, engagement rate
- Average watch time and completion rate
- Views over time chart
- Audience retention buckets
- Top performing videos

### Enhancements

1. **Audience Demographics**
   - Viewer location (country/region) - requires storing viewer metadata
   - Peak viewing hours/days
   - New vs returning viewers

2. **Series Analytics**
   - Series-specific performance metrics
   - Drop-off between parts
   - Series completion rate

3. **Traffic Sources**
   - From feed, search, profile, external
   - Hashtag performance

4. **Comparison Tools**
   - Compare video performance
   - Period-over-period comparison

### Database Changes

**Modify `video_views` table:**

| New Column | Type | Purpose |
|------------|------|---------|
| `traffic_source` | text | Where viewer came from |
| `viewer_country` | text | Viewer's country (from headers) |

### Implementation Steps

1. **Database Migration**
   - Add traffic source and location columns to video_views
   - Update view logging to capture source

2. **Enhance Analytics Hook**
   - Add demographic aggregation queries
   - Add series analytics calculations
   - Add traffic source breakdown

3. **Build New UI Sections**
   - `AudienceInsights` - Demographics charts
   - `TrafficSources` - Pie chart of sources
   - `SeriesAnalytics` - Series-specific tab
   - `ComparisonView` - Side-by-side video stats

4. **Update View Logging**
   - Pass traffic source when logging views
   - Use request headers for country detection

### Files to Create/Modify

| File | Action |
|------|--------|
| Database migration | Create |
| `src/hooks/useVideoAnalytics.ts` | Modify |
| `src/components/analytics/AudienceInsights.tsx` | Create |
| `src/components/analytics/TrafficSources.tsx` | Create |
| `src/components/analytics/SeriesAnalytics.tsx` | Create |
| `src/pages/Analytics.tsx` | Modify |

---

## Implementation Order Recommendation

```text
Phase 1 - Core Social Features
+----------------------------------+
|  1. Direct Messaging (DMs)       |
|     - Most requested feature     |
|     - Builds on existing infra   |
+----------------------------------+
            |
            v
Phase 2 - Creator Tools
+----------------------------------+
|  2. Video Effects & Filters      |
|     - Enhances upload experience |
|  3. Enhanced Analytics           |
|     - Quick win, builds on       |
|       existing code              |
+----------------------------------+
            |
            v
Phase 3 - Advanced Features
+----------------------------------+
|  4. Creator Monetization         |
|     - Requires Stripe setup      |
|  5. Video Duets                  |
|     - Most complex feature       |
+----------------------------------+
```

---

## Technical Section

### Database Migrations Summary

```sql
-- Feature 1: Direct Messaging
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 UUID NOT NULL,
  participant_2 UUID NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Feature 2: Video Duets
ALTER TABLE videos 
ADD COLUMN duet_source_id UUID REFERENCES videos(id),
ADD COLUMN duet_layout TEXT,
ADD COLUMN allow_duets BOOLEAN DEFAULT true;

-- Feature 3: Video Effects
CREATE TABLE video_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  parameters JSONB,
  thumbnail_url TEXT,
  is_premium BOOLEAN DEFAULT false
);

ALTER TABLE videos ADD COLUMN applied_effects JSONB;

-- Feature 4: Monetization
CREATE TABLE creator_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC DEFAULT 0,
  total_earned NUMERIC DEFAULT 0,
  stripe_account_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  video_id UUID,
  amount NUMERIC NOT NULL,
  message TEXT,
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Feature 5: Enhanced Analytics
ALTER TABLE video_views
ADD COLUMN traffic_source TEXT,
ADD COLUMN viewer_country TEXT;
```

### New Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/messages` | Messages.tsx | Conversation list |
| `/messages/:conversationId` | ChatView.tsx | Individual chat |
| `/duet/:videoId` | DuetRecording.tsx | Record duet |
| `/creator-studio` | CreatorStudio.tsx | Monetization dashboard |

### Stripe Integration Notes

Monetization requires:
1. Stripe account configuration via Lovable connector
2. Stripe Connect for marketplace (creator payouts)
3. Webhook endpoint for payment confirmations
4. Edge functions for secure payment processing

