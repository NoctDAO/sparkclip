
# Improvement Plan: Security, Features, and Enhancements

Based on my analysis of your VidShare app, I've identified critical security vulnerabilities, usability improvements, and exciting new features to implement.

---

## Priority 1: Security Fixes (Critical)

### 1.1 Fix Privacy-Exposing RLS Policies
Currently, the `likes`, `follows`, and `comment_likes` tables are publicly readable, exposing user behavior and social graphs.

**Changes:**
- Update `likes` table RLS: Users can only see their own likes; others see aggregate counts only
- Update `follows` table RLS: Users can see their own follows and who follows them
- Update `comment_likes` table RLS: Users can only see their own comment likes

### 1.2 Enable Leaked Password Protection
The security scan shows this protection is disabled. Enable it to prevent users from using compromised passwords.

### 1.3 Add User Data Deletion Capability (GDPR Compliance)
- Add DELETE policy to `user_interactions` table so users can clear their watch history
- Create a proper account deletion flow with backend function to cascade-delete all user data

---

## Priority 2: Authentication & Security Enhancements

### 2.1 Email Verification Flow
Currently, users can sign in immediately after signup. Add:
- Email verification requirement before accessing features
- Resend verification email button
- Verification pending state in UI

### 2.2 Password Reset Flow
Add forgot password functionality:
- "Forgot password?" link on auth page
- Reset password page at `/reset-password`
- Email reset link handling

### 2.3 Rate Limiting on Sensitive Actions
Add client-side rate limiting for:
- Like/unlike actions (prevent spam)
- Comment posting
- Follow/unfollow actions

---

## Priority 3: Feature Enhancements

### 3.1 Direct Messaging System
Create a real-time messaging feature:
- `messages` table with sender, receiver, content, timestamps
- `conversations` table for chat threads
- Inbox tab for DMs with unread indicators
- Real-time updates using Supabase Realtime

### 3.2 Video Sound Preference Integration
Wire the existing `useVideoSoundPreference` hook into `VideoPlayer`:
- Apply saved mute/volume settings when videos play
- Persist volume changes back to localStorage

### 3.3 Content Reporting System
Allow users to report inappropriate content:
- `reports` table for tracking reports
- Report button on videos and comments
- Report reason selection modal

### 3.4 Creator Verification Badges
Add verification system for creators:
- `user_roles` table for admin/moderator/verified roles
- Display verification badge on profiles
- Admin-only endpoint to verify users

---

## Priority 4: Performance & UX Improvements

### 4.1 Infinite Scroll with Virtual List
Optimize `VideoFeed` for better performance:
- Implement virtual scrolling to render only visible videos
- Lazy load videos as user scrolls
- Preload next video for smoother transitions

### 4.2 Video Thumbnail Generation
Automatically generate thumbnails for uploaded videos:
- Edge function to extract frame from video
- Store thumbnail in storage bucket
- Update video record with thumbnail URL

### 4.3 Push Notifications
Enable browser push notifications:
- Service worker for notification handling
- Notification permission request
- Real-time notification delivery

---

## Technical Details

### Database Changes Required

```text
+-------------------+     +-------------------+
|   user_roles      |     |    messages       |
+-------------------+     +-------------------+
| id (uuid)         |     | id (uuid)         |
| user_id (uuid)    |     | sender_id (uuid)  |
| role (app_role)   |     | receiver_id (uuid)|
+-------------------+     | content (text)    |
                          | read_at (timestamp)|
+-------------------+     | created_at        |
|    reports        |     +-------------------+
+-------------------+
| id (uuid)         |
| reporter_id       |
| content_type      |
| content_id        |
| reason (text)     |
| status (text)     |
| created_at        |
+-------------------+
```

### RLS Policy Updates

**likes table (stricter policy):**
```sql
-- Users can only see their own likes
CREATE POLICY "Users can view own likes"
ON likes FOR SELECT
USING (auth.uid() = user_id);
```

**follows table (privacy-aware):**
```sql
-- Users can see their own follows and who follows them
CREATE POLICY "Users can view own follow relationships"
ON follows FOR SELECT
USING (auth.uid() = follower_id OR auth.uid() = following_id);
```

### New Edge Functions

1. **delete-user-data**: Cascade delete all user content for GDPR compliance
2. **verify-user**: Admin-only function to add verification badges
3. **generate-thumbnail**: Extract thumbnail from uploaded video

---

## Implementation Order

| Phase | Items | Status |
|-------|-------|--------|
| 1 | Security fixes (RLS, password protection) | ✅ Done |
| 2 | Auth enhancements (password reset, email verification) | ✅ Password reset done |
| 3 | Video sound preference wiring | ✅ Done |
| 4 | Direct messaging system | 🔜 Next |
| 5 | Reporting system | ✅ Database ready |
| 6 | Performance optimizations | Ongoing |

---

## Completed Items

### Phase 1: Security (Complete)
- ✅ Fixed RLS policies for `likes`, `follows`, `comment_likes` (users see only their own)
- ✅ Created `user_roles` table with `has_role()` function for verification badges
- ✅ Created `reports` table for content moderation
- ✅ Added DELETE policy to `user_interactions` for GDPR
- ✅ Created `delete-user-data` edge function for account deletion

### Phase 2: Auth Enhancements (Partial)
- ✅ Added password reset flow (`/reset-password` page)
- ✅ Added "Forgot password?" link on auth page

### Phase 3: Video Sound (Complete)
- ✅ Created `VideoSoundContext` for shared mute/volume state
- ✅ Wired `VideoPlayer` to use persisted sound preferences

### Additional
- ✅ Created `VerifiedBadge` component
- ✅ Added `useUserRoles` hook
- ✅ Verified badges display on Profile page

---

## Remaining Work

1. **Enable leaked password protection** - Requires admin action in dashboard
2. **Email verification flow** - Add pending state UI
3. **Direct messaging system** - Create messages/conversations tables
4. **Rate limiting** - Add client-side throttling for social actions
5. **Delete account UI** - Add button in Settings to call edge function
