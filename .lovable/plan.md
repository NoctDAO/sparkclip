

# Plan: Complete Remaining Feature Implementations

Based on my analysis, here's what's been implemented and what still needs to be completed:

---

## Current Status

### Already Done
- Database tables: `watch_history` and `content_preferences` with RLS
- Hooks: `useWatchHistory`, `useContentPreferences`, `useSwipeAction`
- Components: `ContinueWatching`, `ShareMenu`, `qr-code`, `swipe-action`
- Skeleton presets in `skeleton.tsx`
- Trending components already have skeleton states
- Swipe actions integrated in `Inbox.tsx`
- ShareMenu and "Not Interested" added to `VideoActions.tsx`
- Settings updated with "Clear watch history" and "Reset content preferences"

### Remaining Work

| Item | Description |
|------|-------------|
| VideoPlayer integration | Connect to `useWatchHistory` to actually record viewing progress |
| Profile History tab | Add Clock icon tab showing all watched videos |
| Profile skeleton | Add `ProfileHeaderSkeleton` to loading state |
| ConversationList swipe | Add swipe-to-archive/delete for messages |
| Recommendations filtering | Update edge function to exclude "not interested" content |
| Search skeletons | Add skeleton loading for search results |

---

## Implementation Details

### 1. VideoPlayer Watch History Integration

Modify `src/components/video/VideoPlayer.tsx` to:
- Accept an optional `onProgressUpdate` callback prop
- Call this callback during `handleTimeUpdate` with progress and duration
- The parent component (VideoCard/VideoFeed) will handle connecting to `useWatchHistory`

This keeps VideoPlayer focused on playback while allowing watch history tracking at a higher level.

### 2. Profile History Tab

Modify `src/pages/Profile.tsx` to:
- Add a new tab with Clock icon (only visible on own profile)
- Display watch history videos using `useWatchHistory` hook
- Show progress bar overlay on thumbnails
- Include empty state: "No watch history yet"

### 3. Profile Header Skeleton

Update the loading state in `Profile.tsx` to use the new `ProfileHeaderSkeleton` component instead of just a spinner, matching the actual layout.

### 4. ConversationList Swipe Actions

Modify `src/components/messages/ConversationList.tsx` to:
- Wrap conversation items with `SwipeAction` component
- Swipe left: Mute/Archive conversation
- Swipe right: Delete conversation with confirmation
- Add haptic feedback via navigator.vibrate

### 5. Recommendations Edge Function Update

Modify `supabase/functions/get-recommendations/index.ts` to:
- Fetch user's `content_preferences` table in parallel with other queries
- Exclude videos where video_id or user_id matches "not interested" entries
- No changes needed for anonymous users (they have no preferences)

### 6. Search Page Skeleton Loading

Modify `src/pages/Search.tsx` to:
- Replace the single spinner with tab-appropriate skeleton layouts
- Use `VideoGridSkeleton` for videos tab
- Use `CreatorCardSkeleton` for users tab
- Use list-style skeletons for sounds/hashtags/series

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/video/VideoPlayer.tsx` | Add `onProgressUpdate` callback prop |
| `src/components/video/VideoCard.tsx` or parent | Connect progress updates to `useWatchHistory` |
| `src/pages/Profile.tsx` | Add History tab, profile header skeleton |
| `src/components/messages/ConversationList.tsx` | Add swipe actions using `SwipeAction` component |
| `src/hooks/useConversations.ts` | Ensure `deleteConversation` function exists |
| `supabase/functions/get-recommendations/index.ts` | Filter out not-interested content |
| `src/pages/Search.tsx` | Add skeleton loading states for each result type |

---

## Technical Notes

### Watch History Flow
```text
VideoPlayer (plays video)
     |
     v
onProgressUpdate(progress, duration)
     |
     v
Parent component (VideoCard)
     |
     v
useWatchHistory.recordWatchProgress()
     |
     v
Debounced write to database (every 5 seconds)
```

### Not Interested Filtering (Edge Function)
The recommendation algorithm will:
1. Fetch content_preferences in parallel with likes/follows
2. Build a Set of excluded video_ids and creator_ids
3. Filter these out when fetching followed/hashtag/trending videos

### SwipeAction Integration Pattern
The existing `SwipeAction` wrapper component handles:
- Touch event detection
- Reveal animations for action backgrounds
- Haptic feedback
- onSwipeLeft / onSwipeRight callbacks

---

## Estimated Complexity

| Task | Complexity | Time |
|------|------------|------|
| VideoPlayer + parent integration | Low | 15 min |
| Profile History tab | Medium | 20 min |
| Profile header skeleton | Low | 5 min |
| ConversationList swipe | Medium | 15 min |
| Recommendations filtering | Medium | 20 min |
| Search skeletons | Low | 10 min |

Total: ~85 minutes of implementation

