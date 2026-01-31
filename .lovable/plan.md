

# Plan: In-Feed Series Part Navigation

## Overview
Update the video feed to support inline series navigation - when you swipe left/right on a series video, instead of navigating to a separate page, the feed will dynamically load and scroll to the next/previous part within the same feed view.

---

## Current Behavior
- Swiping horizontally on a series video calls `navigate(\`/video/${nextVideo.id}\`)` 
- This takes the user away from the main feed to a dedicated video page
- User loses their place in the feed and has to navigate back

## New Behavior
- Swiping on series parts inserts the next/previous part into the feed dynamically
- The feed scrolls smoothly to show the new video
- User stays in the main feed experience with all videos still accessible
- Original feed order is preserved when navigating away from series parts

---

## Implementation Steps

### 1. Update VideoFeed Component
**File: `src/components/video/VideoFeed.tsx`**

- Add a new callback `onNavigateToSeriesVideo(video: Video)` that:
  - Checks if the video is already in the feed
  - If not, inserts it at the appropriate position (after current video)
  - Scrolls to the newly inserted video
  - Updates the current index accordingly

- Pass this callback down to VideoCard via `onNavigateToVideo` prop

### 2. Update VideoCard Component  
**File: `src/components/video/VideoCard.tsx`**

- Modify the series swipe handling to:
  - Fetch the next/previous video data
  - Call the parent's navigation callback instead of `navigate()`
  - Keep the smooth animation and haptic feedback
  - Only fall back to page navigation if callback isn't provided (for standalone video pages)

### 3. Add Smooth Scroll Animation
- When inserting a new video into the feed, use `scrollTo` with smooth behavior
- Add a brief loading state while fetching the next video
- Maintain snap scrolling behavior after insertion

---

## Technical Details

### VideoFeed Changes
```text
New state:
- Track "injected" series videos separately from original feed
- Maintain scroll position during dynamic insertions

New function:
- handleSeriesNavigation(newVideo, direction) 
  - Insert video at correct position
  - Smooth scroll to new position
  - Update currentIndex
```

### VideoCard Changes  
```text
Modify handleTouchEnd:
- When series swipe detected:
  - Fetch next/previous video
  - If onNavigateToVideo callback exists, call it with full video data
  - Otherwise, fall back to navigate() for standalone pages
```

### Edge Cases Handled
- Video already exists in feed: scroll to it instead of duplicating
- First/last part: show toast message, no navigation
- Loading state: brief shimmer/loader while fetching next part
- Returning to original position: preserve feed order

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/video/VideoFeed.tsx` | Add series navigation callback, dynamic video insertion, scroll handling |
| `src/components/video/VideoCard.tsx` | Update swipe handlers to use callback, pass full video data |

---

## User Experience
- Swipe left on series video → next part slides in seamlessly
- Swipe right on series video → previous part slides in  
- Vertical scrolling continues to work normally
- Series indicator badge still visible to show current part
- Toast notifications confirm part changes

