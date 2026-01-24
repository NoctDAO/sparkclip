
## Sound/Music Library Implementation Plan

### Overview
Build a complete sound system that allows creators to browse trending sounds, attach music to videos during upload, and lets users discover all videos using a specific sound.

---

### 1. Database Schema

#### A. Create `sounds` table
Stores all audio tracks available in the library:
```sql
CREATE TABLE sounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text,
  audio_url text NOT NULL,
  cover_url text,
  duration_seconds integer,
  uses_count integer NOT NULL DEFAULT 0,
  is_original boolean NOT NULL DEFAULT false,
  original_video_id uuid REFERENCES videos(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_sounds_uses_count ON sounds(uses_count DESC);
CREATE INDEX idx_sounds_created_at ON sounds(created_at DESC);
```

#### B. Update `videos` table
Add sound reference:
```sql
ALTER TABLE videos ADD COLUMN sound_id uuid REFERENCES sounds(id) ON DELETE SET NULL;
CREATE INDEX idx_videos_sound_id ON videos(sound_id);
```

#### C. Create `sound_favorites` table
Allow users to save sounds:
```sql
CREATE TABLE sound_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sound_id uuid NOT NULL REFERENCES sounds(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, sound_id)
);
```

#### D. Trigger to update `uses_count`
```sql
CREATE OR REPLACE FUNCTION update_sound_uses_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.sound_id IS NOT NULL THEN
    UPDATE sounds SET uses_count = uses_count + 1 WHERE id = NEW.sound_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.sound_id IS DISTINCT FROM NEW.sound_id THEN
      IF OLD.sound_id IS NOT NULL THEN
        UPDATE sounds SET uses_count = uses_count - 1 WHERE id = OLD.sound_id;
      END IF;
      IF NEW.sound_id IS NOT NULL THEN
        UPDATE sounds SET uses_count = uses_count + 1 WHERE id = NEW.sound_id;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.sound_id IS NOT NULL THEN
    UPDATE sounds SET uses_count = uses_count - 1 WHERE id = OLD.sound_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sound_uses_count
AFTER INSERT OR UPDATE OR DELETE ON videos
FOR EACH ROW EXECUTE FUNCTION update_sound_uses_count();
```

#### E. RLS Policies
- Sounds viewable by everyone
- Authenticated users can create sounds
- Favorites managed by authenticated users

---

### 2. Type Definitions

#### Update `src/types/video.ts`
```typescript
export interface Sound {
  id: string;
  title: string;
  artist: string | null;
  audio_url: string;
  cover_url: string | null;
  duration_seconds: number | null;
  uses_count: number;
  is_original: boolean;
  original_video_id: string | null;
  created_by: string | null;
  created_at: string;
  isFavorite?: boolean;
}

// Update Video interface
export interface Video {
  // ... existing fields
  sound_id: string | null;
  sound?: Sound;
}
```

---

### 3. Component Architecture

#### New Components

| Component | Purpose |
|-----------|---------|
| `src/pages/Sounds.tsx` | Main sounds library page with search and categories |
| `src/pages/SoundDetail.tsx` | Individual sound page showing all videos using it |
| `src/components/sounds/SoundCard.tsx` | Reusable card showing sound info with play preview |
| `src/components/sounds/SoundPicker.tsx` | Modal/sheet for selecting sound during upload |
| `src/components/sounds/TrendingSounds.tsx` | Horizontal scroll of trending sounds |
| `src/components/sounds/SoundPreview.tsx` | Audio player with waveform visualization |

---

### 4. Page Implementations

#### A. Sounds Library Page (`/sounds`)
- Search bar for finding sounds
- Trending sounds section (top 10 by uses_count)
- Recently added section
- Favorites section (when logged in)
- Grid/list view of sounds with:
  - Cover image
  - Title and artist
  - Uses count
  - Play preview button
  - Favorite button

#### B. Sound Detail Page (`/sounds/:soundId`)
- Sound info header (title, artist, cover, uses count)
- Play full audio button
- "Use this sound" button (navigates to upload with sound pre-selected)
- Favorite button
- Grid of videos using this sound (similar to Discover page)

---

### 5. Upload Flow Enhancement

#### Update `src/pages/Upload.tsx`
Add sound selection:
- "Add sound" button that opens SoundPicker
- Selected sound displays with:
  - Cover thumbnail
  - Title and artist
  - Remove button
- On upload, attach `sound_id` to video record

#### SoundPicker Component
- Search sounds
- Show recent/trending sounds
- Preview sounds with play button
- Select button to confirm choice

---

### 6. VideoInfo Update

#### Update `src/components/video/VideoInfo.tsx`
- Replace static "Original sound" with actual sound data
- Clicking the sound navigates to `/sounds/:soundId`
- Animated marquee for long titles
- Music icon with spinning animation (like TikTok)

---

### 7. Navigation Updates

#### Update Discover Page
- Add "Sounds" section to Discover page showing trending sounds
- Tapping a sound navigates to sound detail page

#### Add Route
```typescript
<Route path="/sounds" element={<Sounds />} />
<Route path="/sounds/:soundId" element={<SoundDetail />} />
```

---

### 8. File Structure

```
src/
  pages/
    Sounds.tsx           (NEW)
    SoundDetail.tsx      (NEW)
    Upload.tsx           (UPDATE)
  components/
    sounds/
      SoundCard.tsx      (NEW)
      SoundPicker.tsx    (NEW)
      TrendingSounds.tsx (NEW)
      SoundPreview.tsx   (NEW)
    video/
      VideoInfo.tsx      (UPDATE)
  types/
    video.ts             (UPDATE)
```

---

### 9. UI/UX Details

#### Sound Card Layout
```
+------------------+
|  [Cover]  ▶️     |
|  Title          |
|  Artist · 1.2M  |
+------------------+
```

#### Sound in VideoInfo
```
♪ [spinning] Sound Title - Artist →
```
(Tappable, navigates to sound page)

#### Sound Picker (Sheet)
```
+------------------------+
|     Add Sound          |
+------------------------+
| 🔍 Search sounds...    |
+------------------------+
| Trending               |
| [Sound] [Sound] [Sound]|
+------------------------+
| Recent                 |
| [Sound List]           |
+------------------------+
```

---

### 10. Storage Bucket

Create an `audio` storage bucket for uploaded sounds:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio', 'audio', true);
```

With policy allowing authenticated users to upload.

---

### 11. Implementation Order

1. **Database migration** - Create tables, indexes, triggers, RLS policies
2. **Type updates** - Add Sound interface, update Video
3. **Storage bucket** - Create audio bucket
4. **SoundCard component** - Reusable sound display
5. **Sounds library page** - Browse and search sounds
6. **SoundDetail page** - View sound and related videos
7. **SoundPicker component** - Modal for upload flow
8. **Upload page update** - Integrate sound selection
9. **VideoInfo update** - Show actual sound with navigation
10. **Discover page update** - Add trending sounds section
11. **Routes** - Add new routes to App.tsx

---

### Technical Considerations

- **Audio playback**: Use HTML5 Audio API for previewing sounds
- **Seed data**: Consider adding sample sounds for testing
- **Original sounds**: When uploading without selecting a sound, create an "original sound" entry
- **Performance**: Lazy load audio files, only play when user interacts
