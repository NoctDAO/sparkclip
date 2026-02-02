

# Enhanced Series Edit Features Plan

This plan adds comprehensive editing capabilities to the Series Manager, transforming it into a full-featured editing experience for creators.

---

## Overview of New Features

### 1. Set Cover from Part Video
Allow creators to select any video from the series as the cover (uses that video's thumbnail as the poster image)

### 2. Custom Thumbnail Generation
Option to capture a frame from a video to use as cover, or select from video thumbnails

### 3. Series Visibility/Status
Toggle series between Public, Unlisted, or Draft status

### 4. Bulk Video Management
- Select multiple videos at once for removal
- Quick "Select All" / "Deselect All" actions

### 5. Edit Individual Video Captions
Inline editing of video captions directly from the series manager

### 6. Series Analytics Preview
Quick stats panel showing engagement trends

### 7. Duplicate/Archive Series
Create a copy of the series or archive it (hide without deleting)

### 8. Quick Actions Menu
Three-dot menu per video with: Set as Cover, Edit Caption, Move to Top, Move to Bottom, Remove

---

## Implementation Details

### File: `src/components/video/SeriesManager.tsx`

**New State Variables:**
```typescript
const [selectionMode, setSelectionMode] = useState(false);
const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
const [editingCaption, setEditingCaption] = useState("");
```

**New Features to Add:**

1. **Cover Selection Mode**
   - Add a "Choose Cover" section in the edit panel
   - Display grid of video thumbnails to pick from
   - Option: "Use Part 1 thumbnail" | "Custom upload" | "Select from videos"

2. **Video Quick Actions Menu**
   - Replace simple trash button with dropdown menu containing:
     - Set as Series Cover
     - Edit Caption
     - Move to Top
     - Move to Bottom  
     - Remove from Series

3. **Bulk Selection**
   - Toggle button to enter "Select Mode"
   - Checkbox appears on each video
   - Bulk action bar at bottom: "Remove Selected (X)"

4. **Inline Caption Editing**
   - Tap caption to enter edit mode
   - Small input field replaces caption text
   - Save/Cancel buttons

5. **Series Settings Section**
   - Collapsible section with additional options:
     - Series visibility (Public/Unlisted/Draft)
     - Allow followers to get notifications
     - Archive series option

---

### File: `src/hooks/useVideoSeries.ts`

**New Functions to Add:**

```typescript
// Set a video as the cover source
const setCoverFromVideo = async (seriesId: string, videoId: string): Promise<boolean>

// Update video caption
const updateVideoCaption = async (videoId: string, caption: string): Promise<boolean>

// Bulk remove videos from series
const bulkRemoveFromSeries = async (videoIds: string[]): Promise<boolean>

// Move video to specific position
const moveVideoToPosition = async (seriesId: string, videoId: string, position: 'top' | 'bottom'): Promise<boolean>

// Duplicate series
const duplicateSeries = async (seriesId: string): Promise<VideoSeries | null>

// Archive series (soft delete)
const archiveSeries = async (seriesId: string): Promise<boolean>
```

---

### File: New Component `src/components/video/SeriesVideoActions.tsx`

A dropdown menu component for individual video actions:

```typescript
interface SeriesVideoActionsProps {
  video: Video;
  isFirst: boolean;
  isLast: boolean;
  isCoverVideo: boolean;
  onSetAsCover: () => void;
  onEditCaption: () => void;
  onMoveToTop: () => void;
  onMoveToBottom: () => void;
  onRemove: () => void;
}
```

**Menu Options:**
- Set as Cover (star icon) - disabled if already cover
- Edit Caption (pencil icon)
- Move to Top (arrow-up icon) - disabled if first
- Move to Bottom (arrow-down icon) - disabled if last
- Remove from Series (trash icon, red)

---

### File: New Component `src/components/video/SeriesCoverPicker.tsx`

A modal/sheet for selecting series cover:

```typescript
interface SeriesCoverPickerProps {
  series: VideoSeries;
  videos: Video[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCoverSelected: (type: 'video' | 'upload', value: string | File) => void;
}
```

**UI Layout:**
- Header: "Choose Series Cover"
- Section 1: "Use Video Thumbnail" - Grid of video thumbnails to select from
- Section 2: "Upload Custom Image" - Upload button with preview
- Currently selected indicator (checkmark on selected option)

---

### File: `src/types/video.ts`

**Update VideoSeries Interface:**
```typescript
export interface VideoSeries {
  // ... existing fields
  status?: 'public' | 'unlisted' | 'draft' | 'archived';
  notifications_enabled?: boolean;
}
```

---

### Database Changes

**Optional Migration** (if we want to persist series status):
```sql
-- Add status column to video_series table
ALTER TABLE video_series 
ADD COLUMN status TEXT DEFAULT 'public' CHECK (status IN ('public', 'unlisted', 'draft', 'archived'));

-- Add notifications preference
ALTER TABLE video_series
ADD COLUMN notifications_enabled BOOLEAN DEFAULT true;
```

---

## UI/UX Enhancements

### Enhanced SeriesManager Layout

```
+-----------------------------------------------+
|  [X]              Edit Series                 |
+-----------------------------------------------+
| [Cover Image]  | Title: [editable input]      |
| (tap to change)| Desc: [editable textarea]    |
|                | [Save Changes]               |
+-----------------------------------------------+
| [Select Mode Toggle]          [Add Videos +]  |
+-----------------------------------------------+
| PARTS (drag to reorder)                       |
|                                               |
| [≡] [thumb] Part 1 | "caption..." | [•••]    |
| [≡] [thumb] Part 2 | "caption..." | [•••]    |
| [≡] [thumb] Part 3 | "caption..." | [•••]    |
|                                               |
+-----------------------------------------------+
| [Bulk Actions Bar - when in select mode]      |
| "3 selected"  [Remove Selected]  [Cancel]     |
+-----------------------------------------------+
|                                               |
| [Save Order]  (when changes pending)          |
| [More Options ▼]                              |
|   - Duplicate Series                          |
|   - Archive Series                            |
|   - Delete Series                             |
+-----------------------------------------------+
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/video/SeriesManager.tsx` | Modify | Add new editing features, selection mode, quick actions |
| `src/components/video/SeriesVideoActions.tsx` | Create | Dropdown menu for per-video actions |
| `src/components/video/SeriesCoverPicker.tsx` | Create | Cover selection modal |
| `src/hooks/useVideoSeries.ts` | Modify | Add new functions for enhanced operations |
| `src/types/video.ts` | Modify | Add status and notification fields to VideoSeries |

---

## Premium UI Touches

All new components will follow the existing premium design:
- Glass-morphic backgrounds with blur effects
- Smooth spring animations for selections
- Glow effects on interactive elements  
- Gold accents for "cover" badges and premium actions
- Responsive touch targets for mobile

---

## Summary

This enhancement transforms the Series Manager from a basic reordering tool into a comprehensive editing suite:

1. **Cover Management**: Pick from videos or upload custom
2. **Video Quick Actions**: Per-video dropdown with all common actions
3. **Bulk Operations**: Multi-select for efficient management
4. **Inline Editing**: Edit captions without leaving the manager
5. **Advanced Options**: Duplicate, archive, visibility controls

