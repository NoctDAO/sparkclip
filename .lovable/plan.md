

## Next Steps for TikTok Competitor

Based on reviewing the current codebase, here's what's working and what needs attention:

### Current State Summary

| Feature | Status |
|---------|--------|
| Video Feed | Working (7 videos in database) |
| Sound Library | Infrastructure complete, but **0 sounds** in database |
| Upload with Sounds | UI complete, waiting for sounds data |
| Saved Videos Tab | Placeholder only (1 bookmark exists but not displayed) |
| Direct Messaging | Button exists but non-functional |
| Single Video Page | Missing (can't share links to specific videos) |
| Trending Sounds on Discover | Not yet added |

---

## Recommended Priority Order

### 1. Seed Sample Sounds (Quick Win)
Add 5-10 sample sounds to the database so users can actually test:
- Browsing the Sounds library (`/sounds`)
- Attaching music during upload
- Tapping sounds on videos to see related content

This makes the entire sound feature usable immediately.

---

### 2. Fix Saved Videos Tab (Quick Fix)
The Profile page has a "Saved" tab that currently shows "No saved videos yet" even though there's 1 bookmark in the database.

**What needs fixing:**
- Add `fetchSavedVideos()` function to query `bookmarks` table
- Display bookmarked videos in the Saved tab grid
- Load saved videos when the tab is selected

---

### 3. Add Trending Sounds to Discover Page
Enhance the Discover page with a horizontal scrolling section of trending sounds:
- Query top 10 sounds by `uses_count`
- Display in a carousel format with cover art and play button
- Tapping navigates to `/sounds/:soundId`

---

### 4. Create Single Video Page (`/video/:id`)
Enable shareable video links:
- New route `/video/:videoId`
- Full-screen video player with all interactions
- SEO-friendly for sharing on social media
- "Share" button copies the direct link

---

### 5. Direct Messaging System (Larger Feature)
Real-time chat between users:

**Database:**
- `conversations` table (participants, last message)
- `messages` table (content, sender, read status)

**Features:**
- Inbox page shows all conversations
- Real-time message updates via Supabase Realtime
- Message button on profiles starts/opens conversation
- Unread message badges

---

## Suggested Implementation Order

```text
+------------------+    +------------------+    +---------------------+
| 1. Seed Sounds   | -> | 2. Fix Saved Tab | -> | 3. Trending Sounds  |
| (30 min)         |    | (30 min)         |    | on Discover (1 hr)  |
+------------------+    +------------------+    +---------------------+
                                                         |
                                                         v
+------------------+    +------------------------------------------+
| 5. Direct        | <- | 4. Single Video Page                     |
| Messaging (4 hr) |    | (1-2 hr)                                 |
+------------------+    +------------------------------------------+
```

---

## Technical Details

### Seed Sounds SQL Example
```sql
INSERT INTO sounds (title, artist, audio_url, cover_url, uses_count) VALUES
('Trending Beat', 'DJ Producer', 'https://example.com/audio1.mp3', null, 150),
('Viral Sound', 'Creator Mix', 'https://example.com/audio2.mp3', null, 89),
-- ... more samples
```

### Saved Videos Query
```typescript
const fetchSavedVideos = async () => {
  const { data } = await supabase
    .from("bookmarks")
    .select(`video_id, videos:video_id (*)`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  
  if (data) {
    setSavedVideos(data.map(item => item.videos));
  }
};
```

### DM Schema Overview
```sql
-- Conversations between users
CREATE TABLE conversations (
  id uuid PRIMARY KEY,
  participant_1 uuid NOT NULL,
  participant_2 uuid NOT NULL,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Individual messages
CREATE TABLE messages (
  id uuid PRIMARY KEY,
  conversation_id uuid REFERENCES conversations(id),
  sender_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

---

## Recommendation

Start with **options 1-3** (Seed Sounds, Fix Saved Tab, Trending Sounds on Discover) as quick wins that make the app feel complete. Then tackle the larger features (Single Video Page, Direct Messaging) for a more polished experience.

Which would you like to implement first?

