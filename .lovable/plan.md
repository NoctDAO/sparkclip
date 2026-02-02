
# Watch Party / Co-Watching Feature Implementation Plan

A Watch Party feature allows users to watch videos together in real-time, with synchronized playback and a live chat overlay. This creates a social viewing experience similar to Teleparty or Discord's Watch Together.

---

## How It Works

1. **Host creates a watch party** for any video, generating a unique party code
2. **Guests join** using the party code or a shared link
3. **Synchronized playback** - when host plays/pauses/seeks, all guests follow
4. **Live chat overlay** - participants can chat while watching
5. **Presence indicators** - see who's in the party with avatars

---

## Database Schema

Create two new tables to manage watch parties:

### `watch_parties` table
Stores active watch party sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| host_id | uuid | User who created the party |
| video_id | uuid | Video being watched |
| party_code | text | 6-character join code (unique) |
| status | text | 'active' / 'ended' |
| current_time | float | Current playback position (seconds) |
| is_playing | boolean | Whether video is currently playing |
| max_participants | integer | Limit (default: 8) |
| created_at | timestamptz | When party started |
| ended_at | timestamptz | When party ended (nullable) |

### `watch_party_participants` table
Tracks who is currently in each party.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| party_id | uuid | References watch_parties |
| user_id | uuid | Participant user |
| joined_at | timestamptz | When they joined |
| left_at | timestamptz | When they left (nullable) |

### `watch_party_messages` table
Chat messages within a party.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| party_id | uuid | References watch_parties |
| user_id | uuid | Message sender |
| content | text | Message text |
| created_at | timestamptz | When sent |

RLS policies will ensure:
- Only authenticated users can create/join parties
- Only participants can see party messages
- Only the host can update playback state
- Realtime enabled for all three tables

---

## Architecture

### Real-Time Sync Flow

```text
Host controls video
       |
       v
Update watch_parties table
(current_time, is_playing)
       |
       v
Supabase Realtime broadcasts
       |
       v
All participants receive update
       |
       v
Sync local VideoPlayer state
```

### Component Structure

```text
WatchPartyPage
├── WatchPartyHeader (party info, leave button)
├── VideoPlayer (synced to party state)
├── WatchPartyOverlay
│   ├── ParticipantAvatars (presence)
│   └── WatchPartyChat (floating chat)
└── HostControls (play/pause/seek - host only)
```

---

## Files to Create

### Hooks

1. **`src/hooks/useWatchParty.ts`**
   - `createParty(videoId)` - creates a new party, returns party code
   - `joinParty(partyCode)` - joins an existing party
   - `leaveParty()` - marks participant as left
   - `endParty()` - host ends the party
   - `updatePlaybackState(time, isPlaying)` - host syncs state
   - `party` - current party state (realtime)
   - `participants` - current participants (realtime)
   - `isHost` - whether current user is host

2. **`src/hooks/useWatchPartyChat.ts`**
   - `messages` - chat messages (realtime)
   - `sendMessage(content)` - send a chat message
   - Uses existing pattern from `useMessages.ts`

### Components

3. **`src/components/watchparty/WatchPartyHeader.tsx`**
   - Shows party code, video title
   - Copy invite link button
   - Leave party / End party button

4. **`src/components/watchparty/WatchPartyOverlay.tsx`**
   - Container for chat and participants
   - Floating UI over video player

5. **`src/components/watchparty/WatchPartyChat.tsx`**
   - Scrollable message list
   - Input at bottom
   - Collapsible to minimize distraction

6. **`src/components/watchparty/ParticipantAvatars.tsx`**
   - Row of avatar circles at top
   - Shows host crown icon
   - +N indicator if many participants

7. **`src/components/watchparty/HostControls.tsx`**
   - Prominent play/pause button (host only)
   - Seek bar with sync indicator
   - "Sync All" button to force resync

8. **`src/components/watchparty/InviteSheet.tsx`**
   - Share party code and link
   - QR code for easy mobile join
   - Invite via DM option

### Pages

9. **`src/pages/WatchParty.tsx`**
   - Route: `/party/:partyCode`
   - Main watch party experience
   - Combines all components above

10. **`src/components/video/StartWatchPartyButton.tsx`**
    - Button to create a party from video actions
    - Shows confirmation dialog

### Types

11. **`src/types/watchparty.ts`**
    - `WatchParty` - party object type
    - `WatchPartyParticipant` - participant type
    - `WatchPartyMessage` - chat message type

---

## Files to Modify

1. **`src/App.tsx`**
   - Add route: `/party/:partyCode` → `WatchParty`

2. **`src/components/video/ShareMenu.tsx`**
   - Add "Start Watch Party" option in dropdown
   - Triggers party creation flow

3. **`src/components/video/VideoPlayer.tsx`**
   - Add optional `externalPlaybackState` prop for synced playback
   - When provided, ignores local controls and follows external state
   - Expose `videoRef` via `forwardRef` for time sync

4. **`src/pages/VideoPage.tsx`**
   - Add "Watch Party" button in header (next to copy link)
   - Links to party creation

---

## Implementation Details

### Party Code Generation
Generate a 6-character alphanumeric code (avoiding confusing chars like 0/O, 1/I):

```typescript
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generatePartyCode = () => 
  Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
```

### Playback Synchronization

The host's video player is the "source of truth":
1. Host actions (play/pause/seek) update `watch_parties.current_time` and `is_playing`
2. Supabase Realtime broadcasts changes to all subscribers
3. Guest players receive updates and adjust their playback to match
4. A small tolerance (0.5-1 second) prevents constant seeking for minor drift

```typescript
// Guest sync logic
useEffect(() => {
  if (!party || isHost) return;
  
  const video = videoRef.current;
  if (!video) return;
  
  // Sync play/pause
  if (party.is_playing && video.paused) {
    video.play();
  } else if (!party.is_playing && !video.paused) {
    video.pause();
  }
  
  // Sync time if drift > 1 second
  const drift = Math.abs(video.currentTime - party.current_time);
  if (drift > 1) {
    video.currentTime = party.current_time;
  }
}, [party?.is_playing, party?.current_time, isHost]);
```

### Chat Message Rate Limiting
Uses existing rate limit patterns from `useRateLimit.ts` to prevent spam.

### Presence Management
- Participants ping their presence every 30 seconds
- Stale participants (no ping for 60s) are considered "away"
- When a user explicitly leaves or closes the tab, mark `left_at`

---

## User Experience Flow

### Creating a Watch Party
1. User taps share button on any video
2. Selects "Start Watch Party"
3. Party is created, invite sheet opens with:
   - 6-character party code
   - Shareable link
   - QR code
   - "Invite via DM" button
4. Host sees the video with party UI overlay

### Joining a Watch Party
1. User receives invite link or code
2. Either:
   - Clicks link → opens `/party/ABCD12` directly
   - Enters code on Discover page → joins party
3. Video loads at host's current position
4. User sees participant avatars and chat

### During Watch Party
- Host has full playback control
- Guests see playback indicator and can't control
- Everyone can chat
- Party code visible for more invites

### Ending a Watch Party
- Host can end party (ends for everyone)
- Guests can leave (party continues without them)
- Party auto-ends after 2 hours of inactivity

---

## Technical Notes

### Database Migration Summary
- 3 new tables: `watch_parties`, `watch_party_participants`, `watch_party_messages`
- RLS policies for participant-only access
- Realtime enabled on all three tables
- Index on `party_code` for fast lookups

### Performance Considerations
- Host sends playback updates max once per second (throttled)
- Guest sync uses `requestAnimationFrame` for smooth seeking
- Chat messages limited to last 100 per session
- Participants array cached and updated incrementally

### Edge Cases Handled
- Host disconnects → party continues, first participant to return becomes host
- All participants leave → party marked as ended
- Invalid party code → friendly error message
- Video deleted → party ends with notification

---

## Files Summary

**New Files (12):**
- `src/types/watchparty.ts`
- `src/hooks/useWatchParty.ts`
- `src/hooks/useWatchPartyChat.ts`
- `src/pages/WatchParty.tsx`
- `src/components/watchparty/WatchPartyHeader.tsx`
- `src/components/watchparty/WatchPartyOverlay.tsx`
- `src/components/watchparty/WatchPartyChat.tsx`
- `src/components/watchparty/ParticipantAvatars.tsx`
- `src/components/watchparty/HostControls.tsx`
- `src/components/watchparty/InviteSheet.tsx`
- `src/components/video/StartWatchPartyButton.tsx`

**Modified Files (4):**
- `src/App.tsx` (add route)
- `src/components/video/ShareMenu.tsx` (add option)
- `src/components/video/VideoPlayer.tsx` (add sync support)
- `src/pages/VideoPage.tsx` (add party button)

**Database:**
- Migration with 3 tables, RLS policies, and realtime enabled
