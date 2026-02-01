# Complete Ads Monetization Enhancement Plan

**Status: ✅ IMPLEMENTED**

This plan implements five major features to enhance the advertising system: advanced targeting options, budget alert notifications, detailed performance reports, and a live ad preview feature.

## Implementation Summary

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Test Budget UI | ✅ Done |
| 2 | Ad Creative Preview | ✅ Done |
| 3 | Performance Reports | ✅ Done |
| 4 | Budget Alert Notifications | ✅ Done |
| 5 | Enhanced Targeting | ✅ Done |

---

## Feature 1: Enhanced Ad Targeting Options

Allow advertisers to target users by interests, location, and content categories for more effective ad delivery.

### Database Changes

**Modify `ads` table** - add new targeting fields:
- `target_locations` (text array) - geographic targeting by country/region codes
- `target_age_range` (jsonb) - min/max age range
- `target_device_types` (text array) - mobile, desktop, tablet

**Create `user_interests` table** - track user content preferences:
- `id`, `user_id`, `interest_category`, `weight` (engagement score), `updated_at`

**Create database function** `calculate_user_interests`:
- Analyzes user's liked videos, followed creators, and watch history
- Assigns weighted scores to each interest category
- Called periodically or on-demand

### Frontend Changes

**Modify `src/pages/AdvertiserDashboard.tsx`**:
- Add "Location Targeting" section with multi-select for countries/regions
- Add "Device Targeting" toggle group (Mobile, Desktop, Tablet)
- Add "Age Range" slider with min/max inputs
- Enhance existing interest targeting UI with better category organization

**Modify `src/components/video/VideoFeed.tsx`**:
- Update ad selection logic to consider user's interests
- Filter ads based on user's location (from browser/IP)
- Consider device type when selecting ads

### New Components

**Create `src/components/advertiser/LocationTargeting.tsx`**:
- Searchable dropdown for countries/regions
- Selected locations displayed as removable chips

**Create `src/components/advertiser/DeviceTargeting.tsx`**:
- Toggle group for device type selection
- Visual icons for each device type

---

## Feature 2: Budget Alert Email Notifications

Automatically notify advertisers when campaign budgets are running low or exhausted.

### Database Changes

**Create `notification_preferences` table**:
- `id`, `user_id`, `notification_type`, `email_enabled`, `in_app_enabled`, `threshold_percent`
- Stores per-user notification preferences

**Create `email_queue` table**:
- `id`, `recipient_email`, `recipient_id`, `template_type`, `template_data` (jsonb)
- `status` (pending, sent, failed), `created_at`, `sent_at`

**Create database trigger** `check_budget_alerts`:
- Fires on `ads` table update when `daily_spent` or `total_spent` changes
- Checks if spending crosses 80%, 95%, or 100% thresholds
- Inserts notification records for processing

### Backend Function

**Create `supabase/functions/send-budget-alerts/index.ts`**:
- Polls `email_queue` for pending budget alerts
- Uses Resend API (or similar) to send templated emails
- Email templates for:
  - "Budget 80% Spent" warning
  - "Budget 95% Spent" critical warning
  - "Campaign Paused" (budget exhausted)
- Updates queue status after sending

**Create `supabase/functions/check-budget-thresholds/index.ts`**:
- Scheduled function (runs hourly)
- Checks all active ads against budget thresholds
- Creates notifications when thresholds crossed
- Supports multiple alert levels (80%, 95%, 100%)

### Frontend Changes

**Create `src/components/advertiser/NotificationSettings.tsx`**:
- Email notification toggle for budget alerts
- Threshold customization (default 80%)
- Test email button

**Modify `src/pages/AdvertiserDashboard.tsx`**:
- Add "Notifications" section in settings
- Show alert badge on campaigns near budget limit

---

## Feature 3: Detailed Ad Performance Reports

Create comprehensive analytics dashboard with charts showing impressions, clicks, CTR, and spend over time.

### Database Changes

**Create materialized view or function** `get_ad_performance_daily`:
- Aggregates `ad_analytics` by day
- Returns: date, impressions, clicks, skips, completes, avg_view_duration, spend
- Supports date range filtering

**Create function** `get_ad_performance_comparison`:
- Compares current period to previous period
- Calculates growth percentages

### Frontend Changes

**Create `src/pages/AdAnalytics.tsx`** - dedicated analytics page:
- Time range selector (7d, 30d, 90d, custom)
- Campaign filter dropdown
- Key metrics cards with trend indicators

**Create `src/components/advertiser/PerformanceCharts.tsx`**:
- Line chart: Impressions & Clicks over time (dual axis)
- Area chart: Spend over time with budget overlay
- Bar chart: CTR by day of week
- Pie chart: Event breakdown (impressions, clicks, skips, completes)

**Create `src/components/advertiser/MetricsComparison.tsx`**:
- Side-by-side comparison cards
- Shows current vs previous period
- Green/red trend arrows

**Create `src/components/advertiser/PerformanceTable.tsx`**:
- Sortable table with daily breakdown
- Columns: Date, Impressions, Clicks, CTR, Spend, Avg View Time
- Export to CSV functionality

### Visual Design

```text
+-----------------------------------------------+
|  Ad Performance Analytics                     |
|  [Campaign ▼] [Last 30 days ▼] [Export CSV]   |
+-----------------------------------------------+
|                                               |
|  +--------+ +--------+ +--------+ +--------+  |
|  | Impr.  | | Clicks | |  CTR   | | Spend  |  |
|  | 12.5K  | |  890   | | 7.12%  | | $125   |  |
|  | +15%   | | +8%    | | -2%    | | +12%   |  |
|  +--------+ +--------+ +--------+ +--------+  |
|                                               |
|  [Impressions & Clicks Chart - Line/Area]     |
|                                               |
|  [Daily Breakdown Table]                      |
|                                               |
+-----------------------------------------------+
```

---

## Feature 4: Ad Creative Preview

Allow advertisers to preview exactly how their ad will appear in the video feed before publishing.

### Frontend Changes

**Create `src/components/advertiser/AdPreview.tsx`**:
- Full-screen phone frame mockup
- Renders `AdCard` component with form data
- Shows "Sponsored" badge, advertiser info, CTA
- Toggle between video and image preview

**Create `src/components/advertiser/PhoneMockup.tsx`**:
- iPhone-style bezel frame
- Correct aspect ratio (9:16)
- Dark background to simulate feed

**Modify `src/pages/AdvertiserDashboard.tsx`**:
- Add "Preview" tab in campaign editor dialog
- Live preview updates as form fields change
- Side-by-side editor and preview on desktop

### Preview Features

- Live video playback (muted by default)
- Simulated bottom navigation bar
- "Learn More" button interaction demo
- Mobile and desktop viewport toggle

### Visual Design

```text
+----------------------------------+-------------+
|  Create New Campaign             |   Preview   |
+----------------------------------+-------------+
|                                  |   +-----+   |
|  Campaign Title *                |   |     |   |
|  [________________]              |   |PHONE|   |
|                                  |   |MOCK |   |
|  Description                     |   | UP  |   |
|  [________________]              |   |     |   |
|                                  |   |     |   |
|  Video Creative                  |   +-----+   |
|  [Upload] or [URL]               |             |
|                                  | [Mobile ▼]  |
+----------------------------------+-------------+
```

---

## Feature 5: Test Budget Tracking UI

Ensure the existing budget tracking implementation works correctly end-to-end.

### Verification Steps

1. Navigate to `/advertiser` dashboard
2. Create a new campaign with budget limits:
   - Set total budget (e.g., $100)
   - Set daily budget (e.g., $10)
   - Set CPM and CPC rates
3. Verify budget display in campaigns table
4. Confirm `BudgetStatusCard` shows correct progress bars
5. Test status badges (Active, Low, Exhausted)

---

## Implementation Order

| Phase | Feature | Priority | Complexity |
|-------|---------|----------|------------|
| 1 | Test Budget UI | High | Low |
| 2 | Ad Creative Preview | High | Medium |
| 3 | Performance Reports | High | Medium |
| 4 | Budget Alert Notifications | Medium | High |
| 5 | Enhanced Targeting | Medium | High |

---

## File Changes Summary

| Action | File |
|--------|------|
| Create | `src/pages/AdAnalytics.tsx` |
| Create | `src/components/advertiser/AdPreview.tsx` |
| Create | `src/components/advertiser/PhoneMockup.tsx` |
| Create | `src/components/advertiser/PerformanceCharts.tsx` |
| Create | `src/components/advertiser/MetricsComparison.tsx` |
| Create | `src/components/advertiser/PerformanceTable.tsx` |
| Create | `src/components/advertiser/LocationTargeting.tsx` |
| Create | `src/components/advertiser/DeviceTargeting.tsx` |
| Create | `src/components/advertiser/NotificationSettings.tsx` |
| Create | `supabase/functions/send-budget-alerts/index.ts` |
| Create | `supabase/functions/check-budget-thresholds/index.ts` |
| Modify | `src/pages/AdvertiserDashboard.tsx` |
| Modify | `src/components/video/VideoFeed.tsx` |
| Modify | `src/types/ad.ts` |
| Create | Database migrations for new tables and functions |

---

## Technical Notes

- **Email Service**: Will use Lovable AI's built-in capabilities or Resend integration for email delivery
- **Charts**: Uses existing recharts library (already installed) for consistency with Analytics page
- **Real-time Updates**: Budget status can use Supabase realtime subscriptions for live updates
- **Geolocation**: Browser geolocation API or IP-based lookup for location targeting
- **Performance**: Consider caching aggregated analytics data with materialized views

