
# Complete Admin Moderation System Plan

## Overview

This comprehensive plan combines all admin functionality into one cohesive system:
1. Working delete/hide functionality with proper database permissions
2. User banning system with duration settings
3. Admin action logging for accountability
4. Appeal system for users to contest decisions
5. AI-powered auto-moderation for content flagging
6. Priority moderation queue based on report severity and frequency

---

## Current Issues

The admin dashboard exists but **cannot actually delete content** because:
- The Row Level Security (RLS) policies only allow users to delete their **own** content
- There's no policy allowing admins/moderators to manage other users' content
- No "hide" option exists as an alternative to permanent deletion

---

## Part 1: Database Schema Changes

### 1.1 Update Videos Table (Add Visibility + Moderation Fields)

| New Column | Type | Purpose |
|------------|------|---------|
| visibility | text | 'public', 'hidden', 'private' |
| moderation_note | text | Reason for moderation action |
| moderated_by | uuid | Admin who moderated |
| moderated_at | timestamp | When moderation occurred |

### 1.2 New Tables

**banned_users** - Track banned users with duration

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| user_id | uuid | Banned user |
| banned_by | uuid | Admin who banned |
| reason | text | Ban reason |
| banned_at | timestamp | When banned |
| expires_at | timestamp | Null = permanent |

**admin_logs** - Audit trail for admin actions

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| admin_id | uuid | Who performed action |
| action_type | text | 'delete_video', 'hide_video', 'ban_user', etc. |
| target_type | text | 'video', 'comment', 'user' |
| target_id | text | ID of affected item |
| details | jsonb | Additional context |
| created_at | timestamp | When action occurred |

**appeals** - User appeal submissions

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| user_id | uuid | User submitting appeal |
| content_type | text | 'video' or 'comment' |
| content_id | uuid | Moderated content ID |
| reason | text | Appeal explanation |
| status | text | 'pending', 'approved', 'rejected' |
| reviewed_by | uuid | Admin who reviewed |
| reviewed_at | timestamp | When reviewed |
| reviewer_note | text | Admin response |
| created_at | timestamp | When submitted |

**content_flags** - AI-detected issues

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| content_type | text | 'video' or 'comment' |
| content_id | uuid | Flagged content |
| flag_type | text | Category (hate, spam, etc.) |
| confidence | numeric | AI confidence 0-1 |
| detected_issues | jsonb | Detailed findings |
| status | text | 'pending', 'reviewed', 'dismissed' |
| reviewed_by | uuid | Who reviewed |
| created_at | timestamp | When flagged |

**moderation_keywords** - Manual blocklist

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| keyword | text | Blocked word/phrase |
| category | text | spam, hate, etc. |
| action | text | 'flag', 'block', 'shadowban' |
| is_regex | boolean | Pattern matching |
| created_by | uuid | Admin who added |

### 1.3 New Database View: moderation_queue

Aggregates reports by content with priority scoring:

```text
Priority Score = 
  (report_count x 10) +
  (severity_weight) +
  (age_penalty for old reports)

Severity Weights:
  minor_safety: 50
  violence: 40  
  hate_speech: 35
  harassment: 30
  nudity: 25
  copyright: 20
  spam: 10
  other: 5
```

---

## Part 2: RLS Policy Updates

### 2.1 New Admin Policies for Videos

| Policy | Operation | Who Can Execute |
|--------|-----------|-----------------|
| Admins can delete any video | DELETE | admin, moderator |
| Admins can update any video | UPDATE | admin, moderator |
| Videos viewable (modified) | SELECT | Everyone (hides 'hidden' from non-admins) |

### 2.2 New Admin Policies for Comments

| Policy | Operation | Who Can Execute |
|--------|-----------|-----------------|
| Admins can delete any comment | DELETE | admin, moderator |

### 2.3 Policies for New Tables

All new tables will have appropriate RLS:
- **banned_users**: Admins can manage, users can see their own ban
- **admin_logs**: Admins/mods can view and insert
- **appeals**: Users create own, admins manage all
- **content_flags**: Admins manage, users cannot access
- **moderation_keywords**: Admins only

---

## Part 3: UI Components

### 3.1 Updated ContentModeration.tsx

Add these options to the existing component:

- **Hide from Feed**: Sets visibility to 'hidden' instead of deleting
- **Restore Content**: Make hidden content public again
- **Hidden Content Tab**: View all hidden videos/comments
- **Moderation Notes**: Add reason when hiding/deleting
- **Action Logging**: All actions recorded to admin_logs

### 3.2 Updated UserManagement.tsx

Add user banning functionality:

- **Ban User**: Dialog with reason and duration options
- **Unban User**: Remove active bans
- **Banned Badge**: Show on banned user profiles
- **Duration Options**: 1 day, 7 days, 30 days, permanent

### 3.3 New Component: AppealsManagement.tsx

Admin interface for reviewing appeals:

- List pending appeals with user info
- View original content and moderation reason
- Approve (restore content) or reject (uphold decision)
- Add reviewer notes
- Filter by status (pending/approved/rejected)

### 3.4 New Component: ModerationQueue.tsx

Priority-based queue interface:

- Cards grouped by content (not individual reports)
- Priority indicator (high/medium/low color coding)
- Report count badge
- All report reasons displayed
- Quick actions: Hide, Delete, Dismiss all

### 3.5 New Component: FlaggedContent.tsx

AI-flagged content review:

- List items flagged by auto-moderation
- Show confidence score with color coding
- Category badges (spam, hate, etc.)
- Bulk review options
- Link to original content

### 3.6 New Component: AppealDialog.tsx (User-facing)

Let users submit appeals:

- Shown when their content is removed
- Textarea for appeal reason
- Character limit
- Status tracking

### 3.7 New Hook: useBanStatus.ts

Check if current user is banned:

- Query banned_users table on app load
- Show ban message with reason and expiry
- Prevent banned users from posting

---

## Part 4: Edge Function - AI Auto-Moderation

### moderate-content Edge Function

Uses Lovable AI (Gemini) to analyze content:

```text
Flow:
1. Receive text content (caption or comment)
2. Check keyword blocklist first (fast)
3. If not blocked, send to AI for analysis
4. AI returns: { safe: boolean, issues: [...], confidence: 0-1 }
5. If flagged, insert into content_flags table
6. Return result to caller

Categories to detect:
- hate_speech
- harassment
- spam
- violence
- adult_content
- misinformation
```

Integration points:
- Called after video upload (caption analysis)
- Called before comment save (block high-confidence harmful)

---

## Part 5: Updated Admin Dashboard

Add new stat cards and tabs:

```text
+-------------+-------------+-------------+-------------+
| Total Users | Total Vids  | Pending     | Banned      |
|     25      |     142     | Reports: 8  | Users: 2    |
+-------------+-------------+-------------+-------------+

+--------+--------+---------+---------+----------+----------+
| Users  | Queue  | Appeals | Flagged | Content  | Logs     |
+--------+--------+---------+---------+----------+----------+
```

New tabs:
- **Queue**: Priority moderation queue
- **Appeals**: User appeal management
- **Flagged**: AI-flagged content
- **Logs**: Admin action history

---

## Part 6: Files to Create

| File | Purpose |
|------|---------|
| `src/components/admin/AppealsManagement.tsx` | Review user appeals |
| `src/components/admin/ModerationQueue.tsx` | Priority report queue |
| `src/components/admin/FlaggedContent.tsx` | AI-flagged content |
| `src/components/admin/KeywordManagement.tsx` | Manage blocklist |
| `src/components/admin/AdminLogs.tsx` | Action audit log |
| `src/components/moderation/AppealDialog.tsx` | User appeal form |
| `src/hooks/useBanStatus.ts` | Check user ban status |
| `src/hooks/useAppeals.ts` | Appeal data management |
| `src/hooks/useModerationQueue.ts` | Queue data hook |
| `supabase/functions/moderate-content/index.ts` | AI moderation |

## Part 7: Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/ContentModeration.tsx` | Add hide/restore, logging |
| `src/components/admin/UserManagement.tsx` | Add ban/unban |
| `src/pages/AdminDashboard.tsx` | Add new tabs and stats |
| `src/pages/Moderation.tsx` | Add hide option, connect to queue |
| `src/pages/Upload.tsx` | Call auto-moderation after upload |
| `src/App.tsx` | Add ban check wrapper |

---

## Implementation Order

| Phase | Tasks |
|-------|-------|
| 1 | Database: Add visibility column, create banned_users, admin_logs tables |
| 2 | Database: Add RLS policies for admin delete/update |
| 3 | Database: Create appeals, content_flags, moderation_keywords tables |
| 4 | Database: Create moderation_queue view |
| 5 | UI: Update ContentModeration with hide/restore/logging |
| 6 | UI: Update UserManagement with ban/unban |
| 7 | UI: Create ModerationQueue component |
| 8 | UI: Create AppealsManagement and AppealDialog |
| 9 | UI: Update AdminDashboard with new tabs |
| 10 | Edge Function: Create moderate-content AI function |
| 11 | UI: Create FlaggedContent component |
| 12 | Integration: Wire auto-moderation into upload/comment flows |
| 13 | Hook: Create useBanStatus and add app-level ban check |

---

## Summary

This plan delivers a complete moderation system:

- **Working admin actions**: Delete and hide content with proper permissions
- **User banning**: Temporary or permanent with reason tracking
- **Accountability**: Full audit log of admin actions
- **Appeals**: Users can contest decisions, admins review fairly
- **AI assistance**: Automatic flagging of potentially harmful content
- **Smart prioritization**: Handle the most urgent reports first

