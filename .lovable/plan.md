
# App Enhancement Implementation Plan

After thorough exploration of the codebase, here's the detailed plan to implement the 5 selected features.

---

## Feature 1: Watch History & Continue Watching

### What This Does
Tracks videos users have watched and shows a "Continue Watching" section on the Discover page for videos that weren't fully completed. Users can also view their complete history and clear it from Settings.

### Database Changes
Create a `watch_history` table with the following structure:

```text
+------------------+-------------+---------------------+
| watch_history                                        |
+------------------+-------------+---------------------+
| id               | uuid        | Primary key         |
| user_id          | uuid        | References auth.users|
| video_id         | uuid        | References videos   |
| watch_progress   | float       | 0.0 to 1.0 percent  |
| watched_at       | timestamptz | Last watched time   |
| watch_duration   | integer     | Seconds watched     |
+------------------+-------------+---------------------+
```

Row Level Security (RLS) policies:
- Users can only read/write their own watch history
- Enable realtime for instant updates

### Files to Create
1. **`src/hooks/useWatchHistory.ts`**
   - `recordWatchProgress(videoId, progress, duration)` - debounced updates
   - `getWatchHistory()` - paginated history
   - `getContinueWatching()` - videos with 10-90% progress
   - `clearHistory()` - delete all history

2. **`src/components/discover/ContinueWatching.tsx`**
   - Horizontal scroll of partially-watched videos
   - Progress bar overlay on thumbnails
   - Quick resume functionality

### Files to Modify
1. **`src/components/video/VideoPlayer.tsx`**
   - Integrate watch history recording on progress/pause
   - Debounce to reduce database writes (every 5 seconds)

2. **`src/pages/Discover.tsx`**
   - Add ContinueWatching component above Trending Section

3. **`src/pages/Profile.tsx`**
   - Add new "History" tab (clock icon)
   - Show all watched videos in chronological order

4. **`src/pages/Settings.tsx`**
   - Add "Clear watch history" option in Privacy section

---

## Feature 2: Enhanced Video Sharing with QR Code

### What This Does
Adds a QR code sharing option that generates a scannable code linking to the video. Perfect for sharing across devices or in-person.

### Files to Create
1. **`src/components/ui/qr-code.tsx`**
   - Lightweight SVG-based QR code generator (no external dependencies)
   - Uses existing pattern of inline SVG generation
   - Configurable size and error correction level

2. **`src/components/video/ShareMenu.tsx`**
   - Dropdown/sheet with multiple share options:
     - Copy link
     - Native share (existing)
     - Show QR code (new)
   - QR code dialog with save/download option

### Files to Modify
1. **`src/components/video/VideoActions.tsx`**
   - Replace simple share button with ShareMenu component
   - Maintain backward compatibility with existing share logic

---

## Feature 3: "Not Interested" Feature

### What This Does
Allows users to indicate they don't want to see certain content, improving feed personalization over time.

### Database Changes
Create a `content_preferences` table:

```text
+--------------------+-------------+----------------------+
| content_preferences                                     |
+--------------------+-------------+----------------------+
| id                 | uuid        | Primary key          |
| user_id            | uuid        | References auth.users|
| preference_type    | text        | 'not_interested_video', 'not_interested_creator', 'not_interested_hashtag' |
| target_id          | text        | video_id, user_id, or hashtag |
| created_at         | timestamptz | When preference was set|
+--------------------+-------------+----------------------+
```

RLS policies:
- Users can only manage their own preferences

### Files to Create
1. **`src/hooks/useContentPreferences.ts`**
   - `markNotInterested(type, targetId)` - add preference
   - `undoNotInterested(type, targetId)` - remove preference
   - `getNotInterestedVideos()` - for feed filtering

### Files to Modify
1. **`src/components/video/VideoActions.tsx`**
   - Add "Not Interested" button (eye-off icon) after Report
   - Show confirmation toast with undo option

2. **`supabase/functions/get-recommendations/index.ts`**
   - Exclude videos/creators/hashtags from preferences table
   - Add parallel fetch for user preferences

3. **`src/pages/Settings.tsx`**
   - Add "Reset content preferences" option in Privacy section

---

## Feature 4: Swipe Actions for Efficiency

### What This Does
Adds touch-friendly swipe gestures on notification items and conversation list for quick actions like marking as read or deleting.

### Implementation Approach
Use pure touch event handlers (no additional dependencies) to detect horizontal swipes:
- Swipe left: Primary action (Mark as read for notifications, Archive for messages)
- Swipe right: Secondary action (Delete with undo)

### Files to Create
1. **`src/hooks/useSwipeAction.ts`**
   - Reusable hook for swipe detection
   - Returns touch handlers and swipe state
   - Configurable thresholds and actions

2. **`src/components/ui/swipe-action.tsx`**
   - Wrapper component with action reveal backgrounds
   - Haptic feedback via navigator.vibrate if available
   - Smooth spring animations

### Files to Modify
1. **`src/pages/Inbox.tsx`**
   - Wrap NotificationItem with swipe functionality
   - Swipe left: Mark as read
   - Swipe right: Delete notification

2. **`src/components/messages/ConversationList.tsx`**
   - Wrap conversation items with swipe functionality
   - Swipe left: Archive/Mute
   - Swipe right: Delete conversation

3. **`src/hooks/useNotifications.ts`**
   - Add `deleteNotification(id)` function

4. **`src/hooks/useConversations.ts`**
   - Add `deleteConversation(id)` function

---

## Feature 5: Skeleton Loading States Audit & Enhancement

### What This Does
Ensures consistent skeleton loading states across all pages for a smoother perceived performance, matching the actual content layout.

### Files to Modify

1. **`src/pages/Discover.tsx`**
   - Add skeleton for TrendingSection while loading
   - Add skeleton for Explore grid while fetching videos

2. **`src/pages/Profile.tsx`**
   - Add skeleton for profile header (avatar + stats)
   - Already has VideoGridSkeleton for videos - ensure consistency

3. **`src/pages/Search.tsx`**
   - Add skeleton for search results in each tab
   - Use appropriate skeleton based on result type (grid vs list)

4. **`src/components/trending/TrendingHashtags.tsx`**
   - Add horizontal scroll skeleton during load

5. **`src/components/trending/TrendingCreators.tsx`**
   - Add avatar+name skeleton cards during load

6. **`src/components/trending/TrendingVideos.tsx`**
   - Add video card skeleton during load

7. **`src/components/ui/skeleton.tsx`**
   - Add new preset: `ProfileHeaderSkeleton` for profile page
   - Add new preset: `HashtagChipSkeleton` for trending hashtags
   - Add new preset: `CreatorCardSkeleton` for trending creators

---

## Implementation Order

| # | Feature | Complexity | Impact |
|---|---------|------------|--------|
| 1 | Watch History & Continue Watching | Medium | High - improves retention |
| 2 | "Not Interested" | Medium | High - improves personalization |
| 3 | Enhanced Sharing with QR | Low | Medium - viral growth |
| 4 | Skeleton Loading Audit | Low | Medium - polish |
| 5 | Swipe Actions | Medium | Medium - efficiency |

---

## Technical Notes

### Database Migration Summary
Two new tables will be created:
1. `watch_history` - for tracking video viewing progress
2. `content_preferences` - for "not interested" signals

Both tables will have RLS enabled with user-scoped policies.

### Performance Considerations
- Watch history updates will be debounced (5-second interval)
- Content preferences will be fetched once per feed load and cached
- QR code generation is client-side only, no server calls
- Skeletons use CSS animations only (shimmer effect)
- Swipe detection uses passive touch listeners for smooth scrolling

### Backwards Compatibility
- All new features are additive and won't break existing functionality
- Share button retains existing behavior as default action
- Users without watch history see regular Discover page
- Feed works normally without content preferences

---

## Files Summary

**New Files (9):**
- `src/hooks/useWatchHistory.ts`
- `src/hooks/useContentPreferences.ts`
- `src/hooks/useSwipeAction.ts`
- `src/components/discover/ContinueWatching.tsx`
- `src/components/ui/qr-code.tsx`
- `src/components/ui/swipe-action.tsx`
- `src/components/video/ShareMenu.tsx`

**Modified Files (14):**
- `src/components/video/VideoPlayer.tsx`
- `src/components/video/VideoActions.tsx`
- `src/pages/Discover.tsx`
- `src/pages/Profile.tsx`
- `src/pages/Settings.tsx`
- `src/pages/Inbox.tsx`
- `src/pages/Search.tsx`
- `src/components/messages/ConversationList.tsx`
- `src/components/trending/TrendingHashtags.tsx`
- `src/components/trending/TrendingCreators.tsx`
- `src/components/trending/TrendingVideos.tsx`
- `src/components/ui/skeleton.tsx`
- `src/hooks/useNotifications.ts`
- `src/hooks/useConversations.ts`
- `supabase/functions/get-recommendations/index.ts`
