
# Video Series Feature Plan

## Overview
This feature allows creators to upload longer stories by linking multiple short videos together as a series (Part 1, Part 2, Part 3, etc.). Each video remains a standalone clip, but viewers can easily navigate between parts in a series. This is perfect for storytelling, tutorials, or any content that spans multiple videos.

## How It Works

### For Creators
1. When uploading a new video, creators can either:
   - Start a new series by giving it a title (e.g., "My Italy Trip")
   - Add to an existing series they've created
2. The part number is automatically assigned based on existing parts
3. Creators can reorder parts or remove videos from a series later

### For Viewers
1. Videos that are part of a series show a "Part 1 of 3" indicator on the video
2. Tapping the indicator opens a series panel showing all parts
3. Viewers can swipe or tap to navigate between parts
4. Series are displayed as a collection on the creator's profile

## Database Changes

A new `video_series` table will be created to manage series:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Creator who owns the series |
| title | text | Series title (e.g., "My Italy Trip") |
| description | text (nullable) | Optional series description |
| cover_video_id | uuid (nullable) | Which video's thumbnail to use as cover |
| videos_count | integer | Number of videos in series (auto-updated) |
| total_views | integer | Combined views across all parts |
| created_at | timestamp | When series was created |
| updated_at | timestamp | Last modification |

The `videos` table will get new columns:

| Column | Type | Description |
|--------|------|-------------|
| series_id | uuid (nullable) | Reference to video_series table |
| series_order | integer (nullable) | Order within the series (1, 2, 3...) |

## Implementation Steps

### Step 1: Database Migration
Create the `video_series` table with appropriate RLS policies:
- Users can create their own series
- Users can update/delete their own series
- Anyone can view series (for public videos)

Add `series_id` and `series_order` columns to the `videos` table.

### Step 2: Update Type Definitions
Add new TypeScript interfaces for `VideoSeries` in the types file.

### Step 3: Create Series Management Hook
A `useVideoSeries` hook that provides:
- `createSeries(title, description?)` - Create a new series
- `addToSeries(videoId, seriesId)` - Add a video to a series
- `removeFromSeries(videoId)` - Remove video from its series
- `reorderSeries(seriesId, videoIds[])` - Reorder videos in a series
- `deleteSeries(seriesId)` - Delete a series (videos remain but are unlinked)
- `getUserSeries(userId)` - Fetch all series for a user

### Step 4: Update Upload Page
Modify the upload flow to include:
- A toggle/option to "Add to series"
- Dropdown to select existing series or create new one
- Series title input when creating new
- Preview of which part number this will be

### Step 5: Create Series Indicator Component
A small overlay on videos showing "Part X of Y" that:
- Displays on videos that belong to a series
- Is tappable to open the series viewer
- Shows series title on hover/long-press

### Step 6: Create Series Viewer Sheet
A bottom sheet component that:
- Shows all videos in the series as a horizontal scrollable list
- Highlights the current video
- Allows tapping to jump to any part
- Shows series title and total views

### Step 7: Update Video Info Component
Modify VideoInfo to:
- Display the series indicator when a video belongs to a series
- Include series data in the video fetch queries

### Step 8: Update Profile Page
Add a new tab or section for "Series":
- Shows all series created by the user
- Each series displays as a card with cover image, title, and part count
- Tapping opens the series viewer

### Step 9: Update Video Feed
Modify video fetching to include series information when available.

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| Database migration | Create | Add video_series table and update videos table |
| `src/types/video.ts` | Modify | Add VideoSeries interface |
| `src/hooks/useVideoSeries.ts` | Create | Series management hook |
| `src/pages/Upload.tsx` | Modify | Add series selection UI |
| `src/components/video/SeriesIndicator.tsx` | Create | Part X of Y overlay |
| `src/components/video/SeriesViewer.tsx` | Create | Bottom sheet with all parts |
| `src/components/video/VideoInfo.tsx` | Modify | Include series indicator |
| `src/components/video/VideoCard.tsx` | Modify | Show series indicator |
| `src/components/video/VideoFeed.tsx` | Modify | Fetch series data |
| `src/pages/Profile.tsx` | Modify | Add series tab/section |
| `src/pages/VideoPage.tsx` | Modify | Include series data |

## User Experience Flow

```text
CREATOR FLOW:
Upload video --> Toggle "Add to series" --> Select/Create series --> Post
                                                    |
                         +------------+-------------+
                         |                          |
                   Select existing            Create new
                   series from list           (enter title)

VIEWER FLOW:
Watch video --> See "Part 1 of 3" --> Tap indicator --> Series panel opens
                                                               |
                                              See all parts, tap to navigate
```

## Visual Design

### Series Indicator (on video)
- Small pill in bottom-left area: "Part 1 of 3 - My Italy Trip"
- Semi-transparent background
- Tap to open series viewer

### Series Viewer (bottom sheet)
- Horizontal scrollable thumbnails
- Current video highlighted with border
- Series title at top
- Total views displayed
- Close button

### Upload Page Addition
- New section below caption: "Series"
- Toggle or button to enable
- Dropdown for existing series + "Create new" option
- Shows part number preview: "This will be Part 4"

## Security Considerations
- RLS ensures users can only create/edit their own series
- Series visibility follows the visibility of its videos
- Deleting a series doesn't delete the videos (just unlinks them)
