
# Video Format Display - Auto-Detection with Letterboxing

## Overview
This feature will automatically detect whether a video is vertical (TikTok-style) or horizontal (landscape) and display it appropriately. Landscape videos will be centered with black bars above and below (letterboxing), while vertical videos continue to fill the screen. Thumbnails in grids will remain uniform (9:16 ratio).

## Current State
- Videos currently use `object-cover` which crops to fill the container
- All videos assume 9:16 portrait format
- No aspect ratio metadata is stored in the database
- The `VideoPlayer` component renders all videos identically

## Implementation Approach

### 1. Detect Video Aspect Ratio at Runtime
Since storing aspect ratio in the database would require changes to uploads and existing data, we'll detect aspect ratio dynamically when the video loads using the `loadedmetadata` event.

```text
+------------------+     +-------------------+     +------------------+
| Video loads      | --> | Check width vs    | --> | Apply object-fit |
| (loadedmetadata) |     | height ratio      |     | contain or cover |
+------------------+     +-------------------+     +------------------+
```

### 2. Display Logic
- **Portrait videos (height > width)**: Continue using `object-cover` to fill screen
- **Landscape videos (width >= height)**: Use `object-contain` with centered positioning
- **Square videos**: Treat as portrait (fill screen)

---

## Technical Changes

### File 1: `src/components/video/VideoPlayer.tsx`
Add aspect ratio detection and conditional styling:

- Add `isLandscape` state to track video orientation
- Listen to `loadedmetadata` event to detect `videoWidth` vs `videoHeight`
- Conditionally apply `object-contain` (letterboxing) or `object-cover` (fill)
- Ensure the background remains black for the letterbox bars

```tsx
// New state
const [isLandscape, setIsLandscape] = useState(false);

// In useEffect for loadedmetadata
const handleLoadedMetadata = () => {
  if (video.videoWidth >= video.videoHeight) {
    setIsLandscape(true);
  } else {
    setIsLandscape(false);
  }
};

// Video element class change
<video
  className={cn(
    "w-full h-full",
    isLandscape ? "object-contain" : "object-cover"
  )}
/>
```

### File 2: `src/components/video/VideoCard.tsx`
Update the container background to ensure black bars appear correctly:

- Ensure the video container has an explicit black background
- This creates the letterbox effect for landscape videos

### File 3: `src/pages/VideoPage.tsx`  
Apply the same background treatment for the single video page view.

---

## Visual Result

**Portrait Video (9:16):**
```text
+-------------------+
|                   |
|   +-----------+   |
|   |  Video    |   |
|   |  fills    |   |
|   |  screen   |   |
|   +-----------+   |
|                   |
+-------------------+
```

**Landscape Video (16:9):**
```text
+-------------------+
|   Black bars      |
+-------------------+
|                   |
|   Landscape       |
|   Video Content   |
|                   |
+-------------------+
|   Black bars      |
+-------------------+
```

---

## What Stays the Same
- **Thumbnail grids**: Profile, Discover, and search results will continue showing uniform 9:16 thumbnails using `object-cover`
- **Upload flow**: No changes needed - videos work with any aspect ratio
- **Database**: No schema changes required

## Files to Modify
1. `src/components/video/VideoPlayer.tsx` - Add aspect ratio detection and conditional object-fit
2. `src/components/video/VideoCard.tsx` - Ensure black background for letterboxing
3. `src/pages/VideoPage.tsx` - Apply consistent background treatment
